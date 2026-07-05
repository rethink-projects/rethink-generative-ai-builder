// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { marshall } from '@aws-sdk/util-dynamodb';
import { ConversationHistoryService } from '../../services/conversation-history-service';

const ddbMock = mockClient(DynamoDBClient);

const TABLE_NAME = 'test-conversation-table';
const USER_ID = 'mock-user-123';
const FUTURE_TTL = Math.floor(Date.now() / 1000) + 3600;
const OLDER_TTL = FUTURE_TTL - 600;
const EXPIRED_TTL = Math.floor(Date.now() / 1000) - 60;

const conversationItem = (conversationId: string, ttl: number, firstContent: string) =>
    marshall({
        UserId: USER_ID,
        ConversationId: conversationId,
        TTL: ttl,
        History: [{ type: 'human', data: { id: 'msg-1', content: firstContent } }]
    });

describe('ConversationHistoryService', () => {
    let service: ConversationHistoryService;

    beforeEach(() => {
        ddbMock.reset();
        service = new ConversationHistoryService();
    });

    afterAll(() => {
        ddbMock.restore();
    });

    describe('listConversations', () => {
        it('lists conversations sorted by TTL descending with cleaned titles', async () => {
            ddbMock.on(QueryCommand).resolves({
                Items: [
                    conversationItem('conv-old', OLDER_TTL, 'Human: older question'),
                    conversationItem('conv-new', FUTURE_TTL, 'Human: what is GAAB?')
                ]
            });

            const result = await service.listConversations(USER_ID, TABLE_NAME, 'Human');

            expect(result.conversations).toEqual([
                { conversationId: 'conv-new', title: 'what is GAAB?', expiresAt: FUTURE_TTL },
                { conversationId: 'conv-old', title: 'older question', expiresAt: OLDER_TTL }
            ]);
            expect(result.nextToken).toBeUndefined();

            const queryCall = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
            expect(queryCall.TableName).toBe(TABLE_NAME);
            expect(queryCall.ExpressionAttributeNames).toEqual({ '#ttl': 'TTL' });
            expect(queryCall.ExpressionAttributeValues).toEqual({ ':userId': { S: USER_ID } });
        });

        it('filters out conversations that are already past their TTL', async () => {
            ddbMock.on(QueryCommand).resolves({
                Items: [
                    conversationItem('conv-live', FUTURE_TTL, 'Human: live'),
                    conversationItem('conv-expired', EXPIRED_TTL, 'Human: expired')
                ]
            });

            const result = await service.listConversations(USER_ID, TABLE_NAME, 'Human');

            expect(result.conversations.map((c) => c.conversationId)).toEqual(['conv-live']);
        });

        it('truncates long titles', async () => {
            const longQuestion = 'a'.repeat(100);
            ddbMock.on(QueryCommand).resolves({
                Items: [conversationItem('conv-1', FUTURE_TTL, `Human: ${longQuestion}`)]
            });

            const result = await service.listConversations(USER_ID, TABLE_NAME, 'Human');

            expect(result.conversations[0].title.length).toBeLessThanOrEqual(61);
            expect(result.conversations[0].title.endsWith('…')).toBe(true);
        });

        it('returns a base64 nextToken when more pages exist and passes it back on the next call', async () => {
            const lastEvaluatedKey = marshall({ UserId: USER_ID, ConversationId: 'conv-a' });
            ddbMock.on(QueryCommand).resolves({
                Items: [conversationItem('conv-a', FUTURE_TTL, 'Human: q')],
                LastEvaluatedKey: lastEvaluatedKey
            });

            const firstPage = await service.listConversations(USER_ID, TABLE_NAME, 'Human');
            expect(firstPage.nextToken).toBeDefined();

            await service.listConversations(USER_ID, TABLE_NAME, 'Human', firstPage.nextToken);
            const secondCall = ddbMock.commandCalls(QueryCommand)[1].args[0].input;
            expect(secondCall.ExclusiveStartKey).toEqual(lastEvaluatedKey);
        });

        it('throws on an invalid nextToken', async () => {
            await expect(service.listConversations(USER_ID, TABLE_NAME, 'Human', '!!!not-base64-json')).rejects.toThrow(
                'Invalid nextToken'
            );
        });
    });

    describe('getConversationMessages', () => {
        it('returns messages with role prefixes stripped', async () => {
            ddbMock.on(GetItemCommand).resolves({
                Item: marshall({
                    History: [
                        { type: 'human', data: { id: 'msg-1', content: 'Human: hello there' } },
                        { type: 'ai', data: { id: 'msg-2', content: 'AI: hi, how can I help?' } }
                    ]
                })
            });

            const messages = await service.getConversationMessages(USER_ID, 'conv-1', TABLE_NAME, 'Human', 'AI');

            expect(messages).toEqual([
                { messageId: 'msg-1', type: 'human', content: 'hello there' },
                { messageId: 'msg-2', type: 'ai', content: 'hi, how can I help?' }
            ]);

            const getCall = ddbMock.commandCalls(GetItemCommand)[0].args[0].input;
            expect(getCall.Key).toEqual({
                'UserId': { S: USER_ID },
                'ConversationId': { S: 'conv-1' }
            });
        });

        it('returns null when the conversation does not exist', async () => {
            ddbMock.on(GetItemCommand).resolves({ Item: undefined });

            const messages = await service.getConversationMessages(USER_ID, 'missing', TABLE_NAME, 'Human', 'AI');

            expect(messages).toBeNull();
        });

        it('returns an empty list when History is missing', async () => {
            ddbMock.on(GetItemCommand).resolves({ Item: marshall({ UserId: USER_ID }) });

            const messages = await service.getConversationMessages(USER_ID, 'conv-1', TABLE_NAME, 'Human', 'AI');

            expect(messages).toEqual([]);
        });

        it('keeps content untouched when no prefixes are configured', async () => {
            ddbMock.on(GetItemCommand).resolves({
                Item: marshall({
                    History: [{ type: 'human', data: { id: 'msg-1', content: 'Human: hello' } }]
                })
            });

            const messages = await service.getConversationMessages(USER_ID, 'conv-1', TABLE_NAME);

            expect(messages![0].content).toBe('Human: hello');
        });
    });
});
