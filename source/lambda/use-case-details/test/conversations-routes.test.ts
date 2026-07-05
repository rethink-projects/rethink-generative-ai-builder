// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { lambdaHandler } from '..';
import { ApiResources } from '../utils/constants';

const ddbMock = mockClient(DynamoDBClient);
const FUTURE_TTL = Math.floor(Date.now() / 1000) + 3600;

const mockUseCaseConfig = {
    UseCaseName: 'test-use-case',
    UseCaseType: 'Text',
    ConversationTableName: 'test-conversation-table',
    ConversationMemoryParams: {
        HumanPrefix: 'Human',
        AiPrefix: 'AI'
    }
};

const configItem = marshall({ key: 'test-config', config: mockUseCaseConfig });

const buildEvent = (resource: string, overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent =>
    ({
        resource,
        pathParameters: { useCaseConfigKey: 'test-config' },
        requestContext: { authorizer: { UserId: 'mock-user-123' } },
        ...overrides
    }) as unknown as APIGatewayProxyEvent;

describe('conversation routes', () => {
    beforeEach(() => {
        ddbMock.reset();
        process.env.LLM_CONFIG_TABLE = 'test-use-cases-table';
    });

    afterEach(() => {
        ddbMock.reset();
        delete process.env.LLM_CONFIG_TABLE;
    });

    describe(`GET ${ApiResources.CONVERSATIONS}`, () => {
        it('returns the conversation list for the authorized user', async () => {
            ddbMock
                .on(GetItemCommand, { TableName: 'test-use-cases-table' })
                .resolves({ Item: configItem })
                .on(QueryCommand)
                .resolves({
                    Items: [
                        marshall({
                            UserId: 'mock-user-123',
                            ConversationId: 'conv-1',
                            TTL: FUTURE_TTL,
                            History: [{ type: 'human', data: { id: 'msg-1', content: 'Human: hello world' } }]
                        })
                    ]
                });

            const response = await lambdaHandler(buildEvent(ApiResources.CONVERSATIONS));

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({
                conversations: [{ conversationId: 'conv-1', title: 'hello world', expiresAt: FUTURE_TTL }]
            });

            const queryInput = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
            expect(queryInput.TableName).toBe('test-conversation-table');
            expect(queryInput.ExpressionAttributeValues).toEqual({ ':userId': { S: 'mock-user-123' } });
        });

        it('returns 403 when the authorizer user id is missing', async () => {
            const event = buildEvent(ApiResources.CONVERSATIONS, {
                requestContext: { authorizer: {} }
            } as Partial<APIGatewayProxyEvent>);

            const response = await lambdaHandler(event);

            expect(response.statusCode).toBe(403);
        });

        it('returns 404 when the use case has no conversation table (e.g. agent use cases)', async () => {
            ddbMock.on(GetItemCommand).resolves({
                Item: marshall({ key: 'test-config', config: { UseCaseName: 'agent', UseCaseType: 'Agent' } })
            });

            const response = await lambdaHandler(buildEvent(ApiResources.CONVERSATIONS));

            expect(response.statusCode).toBe(404);
        });

        it('returns 404 when the use case config does not exist', async () => {
            ddbMock.on(GetItemCommand).resolves({ Item: undefined });

            const response = await lambdaHandler(buildEvent(ApiResources.CONVERSATIONS));

            expect(response.statusCode).toBe(404);
        });
    });

    describe(`GET ${ApiResources.CONVERSATION_DETAILS}`, () => {
        it('returns cleaned conversation messages', async () => {
            ddbMock
                .on(GetItemCommand, { TableName: 'test-use-cases-table' })
                .resolves({ Item: configItem })
                .on(GetItemCommand, { TableName: 'test-conversation-table' })
                .resolves({
                    Item: marshall({
                        History: [
                            { type: 'human', data: { id: 'msg-1', content: 'Human: hi' } },
                            { type: 'ai', data: { id: 'msg-2', content: 'AI: hello!' } }
                        ]
                    })
                });

            const event = buildEvent(ApiResources.CONVERSATION_DETAILS, {
                pathParameters: { useCaseConfigKey: 'test-config', conversationId: 'conv-1' }
            });

            const response = await lambdaHandler(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({
                conversationId: 'conv-1',
                messages: [
                    { messageId: 'msg-1', type: 'human', content: 'hi' },
                    { messageId: 'msg-2', type: 'ai', content: 'hello!' }
                ]
            });
        });

        it('returns 404 for a conversation that does not exist', async () => {
            ddbMock
                .on(GetItemCommand, { TableName: 'test-use-cases-table' })
                .resolves({ Item: configItem })
                .on(GetItemCommand, { TableName: 'test-conversation-table' })
                .resolves({ Item: undefined });

            const event = buildEvent(ApiResources.CONVERSATION_DETAILS, {
                pathParameters: { useCaseConfigKey: 'test-config', conversationId: 'missing' }
            });

            const response = await lambdaHandler(event);

            expect(response.statusCode).toBe(404);
        });

        it('returns 500 when the conversation id is missing from the path', async () => {
            ddbMock.on(GetItemCommand, { TableName: 'test-use-cases-table' }).resolves({ Item: configItem });

            const event = buildEvent(ApiResources.CONVERSATION_DETAILS);

            const response = await lambdaHandler(event);

            expect(response.statusCode).toBe(500);
        });
    });
});
