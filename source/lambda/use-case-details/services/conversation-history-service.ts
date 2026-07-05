// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, tracer } from '../power-tools-init';
import {
    ConversationMessageResponse,
    ConversationSummary,
    LIST_CONVERSATIONS_PAGE_SIZE,
    MAX_CONVERSATION_TITLE_LENGTH
} from '../utils/constants';

/**
 * Reads the conversation history that the chat lambda persists in the
 * use case's conversation DynamoDB table (partition key UserId, sort key
 * ConversationId, `History` list attribute, `TTL` expiry).
 *
 * Message contents are stored with the configured role prefixes prepended
 * (e.g. "Human: ..." / "AI: ..."), so they are stripped before returning
 * to keep the UI response clean.
 */
export class ConversationHistoryService {
    private readonly dynamoDBClient: DynamoDBClient;

    constructor() {
        this.dynamoDBClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer);
    }

    /**
     * Lists the (non-expired) conversations of a user, most recent first.
     * Recency is approximated by the TTL attribute, which the chat lambda
     * rewrites on every message, making it monotonic in last-write time.
     *
     * @param userId Cognito user id (authorizer-provided), partition key
     * @param tableName conversation table resolved from the use case config
     * @param humanPrefix prefix to strip from the title message
     * @param nextToken base64-encoded LastEvaluatedKey from a previous page
     */
    async listConversations(
        userId: string,
        tableName: string,
        humanPrefix?: string,
        nextToken?: string
    ): Promise<{ conversations: ConversationSummary[]; nextToken?: string }> {
        const queryCommand = new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'UserId = :userId',
            ExpressionAttributeValues: { ':userId': { S: userId } },
            // TTL is a DynamoDB reserved word and must be aliased
            ProjectionExpression: 'ConversationId, #ttl, History[0]',
            ExpressionAttributeNames: { '#ttl': 'TTL' },
            Limit: LIST_CONVERSATIONS_PAGE_SIZE,
            ...(nextToken && { ExclusiveStartKey: ConversationHistoryService.decodeNextToken(nextToken) })
        });

        const response = await this.dynamoDBClient.send(queryCommand);
        const nowEpochSeconds = Math.floor(Date.now() / 1000);

        const conversations = (response.Items ?? [])
            .map((item) => unmarshall(item))
            // TTL deletion can lag; hide items that are already past expiry
            .filter((item) => typeof item.TTL !== 'number' || item.TTL > nowEpochSeconds)
            .map((item) => ({
                conversationId: item.ConversationId as string,
                title: ConversationHistoryService.buildTitle(item.History?.[0]?.data?.content, humanPrefix),
                expiresAt: (item.TTL as number) ?? null
            }))
            // TTL descending = most recently written first (within the fetched page)
            .sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0));

        return {
            conversations,
            ...(response.LastEvaluatedKey && {
                nextToken: Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
            })
        };
    }

    /**
     * Fetches all messages of one conversation. Ownership is enforced by the
     * table key: the item is only readable under the caller's own UserId.
     */
    async getConversationMessages(
        userId: string,
        conversationId: string,
        tableName: string,
        humanPrefix?: string,
        aiPrefix?: string
    ): Promise<ConversationMessageResponse[] | null> {
        const getItemCommand = new GetItemCommand({
            TableName: tableName,
            Key: {
                'UserId': { S: userId },
                'ConversationId': { S: conversationId }
            },
            ProjectionExpression: '#history',
            ExpressionAttributeNames: { '#history': 'History' }
        });

        const response = await this.dynamoDBClient.send(getItemCommand);

        if (!response.Item) {
            logger.warn(`No conversation found for conversationId: ${conversationId}`);
            return null;
        }

        const conversation = unmarshall(response.Item);
        if (!conversation.History || !Array.isArray(conversation.History)) {
            return [];
        }

        return conversation.History.filter((message: any) => message?.data?.content !== undefined).map(
            (message: any) => ({
                messageId: message.data.id ?? null,
                type: message.type as string,
                content: ConversationHistoryService.stripRolePrefix(
                    message.data.content as string,
                    message.type === 'ai' ? aiPrefix : humanPrefix
                )
            })
        );
    }

    /**
     * Removes the persisted role prefix (e.g. "Human: ") from a stored message,
     * mirroring the feedback lambda's cleanupConversationPair behavior.
     */
    private static stripRolePrefix(content: string, prefix?: string): string {
        if (!prefix) {
            return content;
        }
        return content.replace(new RegExp(`^${prefix}:\\s*`, 'i'), '').trim();
    }

    private static buildTitle(firstMessageContent?: string, humanPrefix?: string): string {
        if (!firstMessageContent) {
            return '';
        }
        const cleaned = ConversationHistoryService.stripRolePrefix(firstMessageContent, humanPrefix);
        return cleaned.length > MAX_CONVERSATION_TITLE_LENGTH
            ? `${cleaned.slice(0, MAX_CONVERSATION_TITLE_LENGTH).trimEnd()}…`
            : cleaned;
    }

    private static decodeNextToken(nextToken: string): Record<string, any> {
        try {
            return JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
        } catch (error) {
            throw new Error('Invalid nextToken');
        }
    }
}
