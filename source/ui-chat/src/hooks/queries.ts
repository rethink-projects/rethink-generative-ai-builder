// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../utils/API.adapter';

export const API_NAME = 'solution-api';

export enum ApiEndpoints {
    DETAILS = '/details',
    FEEDBACK = '/feedback',
    FILES = '/files',
    CONVERSATIONS = '/conversations'
}

export interface ConversationSummary {
    conversationId: string;
    title: string;
    expiresAt: number | null;
}

export interface ConversationMessageResponse {
    messageId: string | null;
    type: 'human' | 'ai' | string;
    content: string;
}

export const queryKeys = {
    deployment: (useCaseConfigKey: string) => ['deployment', useCaseConfigKey] as const,
    conversations: (useCaseConfigKey: string) => ['conversations', useCaseConfigKey] as const,
    conversationDetails: (useCaseConfigKey: string, conversationId: string) =>
        ['conversations', useCaseConfigKey, conversationId] as const,
    files: (useCaseId: string, conversationId?: string, messageId?: string) =>
        ['files', useCaseId, conversationId, messageId] as const
};

/** Fetches the use case details used to enrich the runtime configuration */
export const useDeploymentQuery = (useCaseConfigKey: string | undefined, enabled: boolean) =>
    useQuery({
        queryKey: queryKeys.deployment(useCaseConfigKey ?? ''),
        queryFn: () => API.get(API_NAME, `${ApiEndpoints.DETAILS}/${useCaseConfigKey}`),
        enabled: enabled && !!useCaseConfigKey
    });

/** Lists the authenticated user's conversations for the history sidebar */
export const useConversationsQuery = (useCaseConfigKey: string | undefined, enabled: boolean) =>
    useQuery<{ conversations: ConversationSummary[]; nextToken?: string }>({
        queryKey: queryKeys.conversations(useCaseConfigKey ?? ''),
        queryFn: () => API.get(API_NAME, `${ApiEndpoints.CONVERSATIONS}/${useCaseConfigKey}`),
        enabled: enabled && !!useCaseConfigKey,
        staleTime: 30_000,
        retry: false
    });

/** Fetches the messages of one conversation so it can be resumed */
export const useConversationDetailsQuery = (useCaseConfigKey: string | undefined, conversationId: string | null) =>
    useQuery<{ conversationId: string; messages: ConversationMessageResponse[] }>({
        queryKey: queryKeys.conversationDetails(useCaseConfigKey ?? '', conversationId ?? ''),
        queryFn: () => API.get(API_NAME, `${ApiEndpoints.CONVERSATIONS}/${useCaseConfigKey}/${conversationId}`),
        enabled: !!useCaseConfigKey && !!conversationId,
        retry: false
    });

export const useInvalidateConversations = () => {
    const queryClient = useQueryClient();
    return (useCaseConfigKey: string) =>
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations(useCaseConfigKey) });
};

/** Submits thumbs up/down feedback for an assistant message */
export const useSubmitFeedbackMutation = () =>
    useMutation({
        mutationFn: ({ useCaseId, feedbackData }: { useCaseId: string; feedbackData: any }) =>
            API.post(API_NAME, `${ApiEndpoints.FEEDBACK}/${useCaseId}`, { body: feedbackData })
    });

/** Fetches a presigned download URL for a chat attachment */
export const fetchFileDownloadUrl = (params: {
    useCaseId: string;
    conversationId: string;
    messageId: string;
    fileName: string;
}): Promise<{ downloadUrl: string }> =>
    API.get(API_NAME, `${ApiEndpoints.FILES}/${params.useCaseId}`, {
        queryParams: {
            conversationId: params.conversationId,
            messageId: params.messageId,
            fileName: params.fileName,
            action: 'download'
        }
    });
