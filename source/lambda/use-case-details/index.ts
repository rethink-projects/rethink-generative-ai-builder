// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { validateAndParseRequest, castToResponse, getUserId, getConversationId } from './utils/utils';
import { formatError, formatResponse } from './utils/http-response-formatters';
import { logger, tracer, metrics } from './power-tools-init';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import { ApiResources } from './utils/constants';
import { ConversationHistoryService } from './services/conversation-history-service';

// Initialize DynamoDB client with retry settings
const dynamoDB = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer);

const fetchUseCaseConfig = async (tableName: string, useCaseConfigKey: string): Promise<Record<string, any> | null> => {
    const useCaseConfigCommand = new GetItemCommand({
        TableName: tableName,
        Key: {
            'key': { S: useCaseConfigKey }
        }
    });

    const result = await dynamoDB.send(useCaseConfigCommand);
    return result.Item ? unmarshall(result.Item).config : null;
};

const notFoundResponse = (rootTraceId: string | undefined, metricName: string): APIGatewayProxyResult => {
    metrics.addMetric(metricName, MetricUnit.Count, 1);
    return formatError({
        statusCode: 404,
        message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
        extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
    });
};

const handleUseCaseDetails = async (
    event: APIGatewayProxyEvent,
    llmConfigTable: string
): Promise<APIGatewayProxyResult> => {
    const useCaseConfigKey = validateAndParseRequest(event);
    const useCaseConfig = await fetchUseCaseConfig(llmConfigTable, useCaseConfigKey);

    if (!useCaseConfig) {
        const rootTraceId = tracer.getRootXrayTraceId();
        logger.error(`ERROR: Configuration not found.`);
        logger.error(`Error occurred, root trace id: ${rootTraceId}`);
        return notFoundResponse(rootTraceId, 'GetUseCaseConfigError');
    }

    metrics.addMetric('GetUseCaseConfigCount', MetricUnit.Count, 1);

    const cleanedConfig = castToResponse(useCaseConfig);

    return formatResponse(JSON.stringify(cleanedConfig));
};

/**
 * Serves the conversation history routes. Conversations are read from the use
 * case's conversation table (resolved from the use case config); the user id
 * always comes from the custom authorizer so users can only see their own
 * conversations. Use cases without a conversation table (e.g. agent use
 * cases) return 404 and the UI degrades gracefully.
 */
const handleConversations = async (
    event: APIGatewayProxyEvent,
    llmConfigTable: string
): Promise<APIGatewayProxyResult> => {
    const rootTraceId = tracer.getRootXrayTraceId();
    const useCaseConfigKey = validateAndParseRequest(event);
    const userId = getUserId(event);

    if (!userId) {
        logger.error(`Missing authorizer user id, root trace id: ${rootTraceId}`);
        return formatError({
            statusCode: 403,
            message: `Forbidden - Please contact support and quote the following trace id: ${rootTraceId}`,
            extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
        });
    }

    const useCaseConfig = await fetchUseCaseConfig(llmConfigTable, useCaseConfigKey);

    if (!useCaseConfig?.ConversationTableName) {
        logger.warn(`No conversation table available for the requested use case config.`);
        return notFoundResponse(rootTraceId, 'GetConversationsError');
    }

    const conversationTableName = useCaseConfig.ConversationTableName as string;
    const humanPrefix = useCaseConfig.ConversationMemoryParams?.HumanPrefix;
    const aiPrefix = useCaseConfig.ConversationMemoryParams?.AiPrefix;
    const conversationHistoryService = new ConversationHistoryService();

    if (event.resource === ApiResources.CONVERSATION_DETAILS) {
        const conversationId = getConversationId(event);
        const messages = await conversationHistoryService.getConversationMessages(
            userId,
            conversationId,
            conversationTableName,
            humanPrefix,
            aiPrefix
        );

        if (messages === null) {
            return notFoundResponse(rootTraceId, 'GetConversationsError');
        }

        metrics.addMetric('GetConversationDetailsCount', MetricUnit.Count, 1);
        return formatResponse(JSON.stringify({ conversationId, messages }));
    }

    const nextToken = event.queryStringParameters?.nextToken;
    const result = await conversationHistoryService.listConversations(
        userId,
        conversationTableName,
        humanPrefix,
        nextToken
    );

    metrics.addMetric('ListConversationsCount', MetricUnit.Count, 1);
    return formatResponse(JSON.stringify(result));
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const LLM_CONFIG_TABLE = process.env.LLM_CONFIG_TABLE;

        if (!LLM_CONFIG_TABLE) {
            throw new Error('LLM_CONFIG_TABLE environment variable is not set');
        }

        switch (event.resource) {
            case ApiResources.CONVERSATIONS:
            case ApiResources.CONVERSATION_DETAILS:
                return await handleConversations(event, LLM_CONFIG_TABLE);
            case ApiResources.DETAILS:
            default:
                return await handleUseCaseDetails(event, LLM_CONFIG_TABLE);
        }
    } catch (error) {
        const rootTraceId = tracer.getRootXrayTraceId();
        logger.error(`ERROR: ${error}`);
        logger.error(`Error occurred, root trace id: ${rootTraceId}`);

        metrics.addMetric('GetUseCaseConfigError', MetricUnit.Count, 1);

        return formatError({
            statusCode: 500,
            message: `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`,
            extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
        });
    }
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
