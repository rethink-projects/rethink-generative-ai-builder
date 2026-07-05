// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react';

import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Message } from './types';

import { ConnectionState, ConnectionStatus, ConnectionErrorType, ChatInput, ChatMessagesContainer } from './components';
import { WelcomeState } from './components/messages/WelcomeState';
import { useUser } from '@contexts/UserContext';
import { constructPayload } from '@utils/construct-api-payload';
import { useChatMessages } from '@hooks/use-chat-message';
import { ChatResponse } from '@/models';
import { LoadingStatus, LoadingState, LoadingErrorType } from './components/alerts/LoadingStatus';
import { UploadedFile } from '@/types/file-upload';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useConfigStore, getMultimodalEnabledState, getUseCaseConfigKey } from '@/stores/config-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useChatStore } from '@/stores/chat-store';
import { useConversationDetailsQuery, useInvalidateConversations } from '@/hooks/queries';
import { mapHistoryToMessages } from '@/utils/conversation-history';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ChatPage component handles the main chat interface and WebSocket communication.
 * It manages the connection state, message handling, resuming past conversations
 * from the server-side history, and UI rendering for the chat application.
 */
export default function ChatPage() {
    const { t } = useTranslation();
    const { getAccessToken, detailsError, userId } = useUser();

    const [connectionState, setConnectionState] = useState<ConnectionState>({
        socketStatus: ReadyState.UNINSTANTIATED
    });
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: true,
        error: detailsError
            ? {
                  type: LoadingErrorType.DATA_FETCH_ERROR,
                  message: detailsError.message ?? 'Failed to load use case details'
              }
            : undefined
    });

    const [authToken, setAuthToken] = useState<string>('');

    const runtimeConfig = useConfigStore((state) => state.runtimeConfig);
    const useCaseConfigKey = useConfigStore(getUseCaseConfigKey);
    const promptTemplate = usePreferencesStore((state) => state.promptTemplate);
    const isMultimodalEnabled = useConfigStore(getMultimodalEnabledState);

    /**
     * Retrieves the WebSocket URL with authentication token.
     */
    const getSocketUrl = useCallback(async () => {
        try {
            const newToken = await getAccessToken();
            setAuthToken(newToken);
            const newSocketUrl = `${runtimeConfig!.SocketURL}?Authorization=${newToken}`;

            setConnectionState((prev) => ({
                ...prev,
                error: undefined
            }));

            return newSocketUrl;
        } catch (error) {
            console.error('Failed to get access token:', error);
            setConnectionState((prev) => ({
                ...prev,
                error: {
                    type: ConnectionErrorType.AUTH_TOKEN_ERROR,
                    message: 'Failed to retrieve authentication token'
                }
            }));
            throw error;
        }
    }, [getAccessToken, runtimeConfig]);

    const {
        messages,
        setMessages,
        isGenAiResponseLoading,
        setIsGenAiResponseLoading,
        handleMessage,
        conversationId,
        addUserMessage,
        resetChat,
        thinking,
        toolUsage,
        setConversationId
    } = useChatMessages();

    const { generateMessageId } = useFileUpload();

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket<ChatResponse>(getSocketUrl, {
        retryOnError: true,
        shouldReconnect: (closeEvent) => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000 //ms
    });

    /**
     * Resuming a past conversation: when one is picked in the sidebar, fetch
     * its messages and hydrate the chat state. The backend keys its memory by
     * UserId+ConversationId, so continuing the conversation just works.
     */
    const selectedConversationId = useChatStore((state) => state.selectedConversationId);
    const { data: conversationDetails, isLoading: isHydrating } = useConversationDetailsQuery(
        useCaseConfigKey,
        selectedConversationId
    );

    useEffect(() => {
        if (selectedConversationId && conversationDetails?.conversationId === selectedConversationId) {
            setMessages(mapHistoryToMessages(conversationDetails.messages, userId));
            setConversationId(selectedConversationId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConversationId, conversationDetails, userId]);

    /**
     * Refresh the sidebar's conversation list whenever a response finishes so
     * new conversations / updated recency show up.
     */
    const invalidateConversations = useInvalidateConversations();
    const wasLoadingRef = useRef(false);
    useEffect(() => {
        if (wasLoadingRef.current && !isGenAiResponseLoading && useCaseConfigKey) {
            invalidateConversations(useCaseConfigKey);
        }
        wasLoadingRef.current = isGenAiResponseLoading;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGenAiResponseLoading, useCaseConfigKey]);

    /**
     * Handles sending user prompts through WebSocket connection.
     */
    const handlePromptSend = useCallback(
        (value: string, files?: UploadedFile[], providedMessageId?: string) => {
            if (readyState !== ReadyState.OPEN) {
                return;
            }

            try {
                addUserMessage(value, files);

                // Use existing conversation ID
                let currentConversationId = conversationId;

                // Use provided message ID from file upload, or generate new one
                const messageIdToUse = providedMessageId || generateMessageId();

                const payload = constructPayload({
                    useCaseConfig: runtimeConfig?.UseCaseConfig!,
                    message: value,
                    conversationId: currentConversationId,
                    messageId: messageIdToUse,
                    promptTemplate,
                    authToken: authToken,
                    files: files,
                    useCaseId: runtimeConfig?.UseCaseId
                });

                sendJsonMessage(payload);
            } catch (error) {
                console.error('Error sending message:', error);
                const errorMessage: Message = {
                    type: 'alert',
                    content: 'Failed to send message. Please try again.'
                };
                setMessages([...messages, errorMessage]);
                setIsGenAiResponseLoading(false);
            }
        },
        [
            readyState,
            sendJsonMessage,
            conversationId,
            setMessages,
            setIsGenAiResponseLoading,
            runtimeConfig?.UseCaseConfig,
            addUserMessage,
            messages,
            promptTemplate,
            authToken,
            generateMessageId,
            setConversationId,
            isMultimodalEnabled
        ]
    );

    /**
     * Effect hook to handle incoming WebSocket messages
     */
    useEffect(() => {
        if (lastJsonMessage) {
            handleMessage(lastJsonMessage as ChatResponse);
        }
    }, [lastJsonMessage]);

    /**
     * Effect hook to update connection state based on WebSocket ready state
     */
    useEffect(() => {
        setConnectionState((prev) => ({
            ...prev,
            socketStatus: readyState,
            // Clear error if connection is successful
            error: readyState === ReadyState.OPEN ? undefined : prev.error
        }));
    }, [readyState]);

    /**
     * Effect hook to update status of Details API result
     */
    useEffect(() => {
        let errorMessage: string | undefined;

        if (detailsError) {
            errorMessage = detailsError.message ?? 'Failed to load deployment';
        } else if (runtimeConfig && !runtimeConfig.UseCaseConfigKey && !runtimeConfig.UseCaseId) {
            errorMessage = 'Use case configuration is missing. Please check your deployment configuration.';
        }

        setLoadingState({
            isLoading: !runtimeConfig?.UseCaseConfig && !detailsError,
            error: errorMessage
                ? {
                      type: LoadingErrorType.DATA_FETCH_ERROR,
                      message: errorMessage
                  }
                : undefined
        });
    }, [runtimeConfig?.UseCaseConfig, runtimeConfig?.UseCaseConfigKey, runtimeConfig?.UseCaseId, detailsError]);

    if (loadingState.isLoading || loadingState.error || !runtimeConfig?.UseCaseConfig) {
        return (
            <div className="flex flex-1 items-center justify-center" data-testid="chat-loading">
                <LoadingStatus loadingState={loadingState} loadingMessage="Fetching configuration..." />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t('loading.fetchingConfig')}
                </div>
            </div>
        );
    }

    const showWelcome = messages.length === 0 && !isHydrating;

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-testid="chat-content-layout">
            <ConnectionStatus connectionState={connectionState} />

            <div className="min-h-0 flex-1">
                {isHydrating && selectedConversationId ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        {t('sidebar.loadingConversations')}
                    </div>
                ) : showWelcome ? (
                    <WelcomeState
                        onSuggestedPrompt={(prompt) => handlePromptSend(prompt)}
                        disabled={readyState !== ReadyState.OPEN}
                    />
                ) : (
                    <ChatMessagesContainer
                        messages={messages}
                        conversationId={conversationId}
                        thinking={thinking}
                        toolUsage={toolUsage}
                    />
                )}
            </div>

            <ChatInput
                isLoading={isGenAiResponseLoading}
                onSend={(value: string) => handlePromptSend(value)}
                onSendWithFiles={(value: string, files: UploadedFile[], messageId?: string) =>
                    handlePromptSend(value, files, messageId)
                }
                conversationId={conversationId}
                onSetConversationId={setConversationId}
            />
        </div>
    );
}
