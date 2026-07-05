// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useUser } from '../../../../contexts/UserContext';
import { memo, useMemo, useEffect, useState } from 'react';
import { parseTraceId, TraceDetails } from '../../../../utils/validation';
import { ErrorAlert } from '../alerts/ErrorAlert';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../types';
import { ToolUsageInfo } from '../../../../models';

/**
 * Messages component displays a list of chat messages and alerts
 */
const Messages = ({
    messages = [],
    conversationId,
    toolUsage = []
}: {
    messages: Array<Message>;
    conversationId: string;
    toolUsage?: Array<ToolUsageInfo>;
}) => {
    const { userId, userName } = useUser();
    const latestMessage: Message = messages[messages.length - 1];
    const [processedMessages, setProcessedMessages] = useState<Array<Message>>(messages);

    // Process messages to associate user inputs with AI responses
    useEffect(() => {
        const enhanced = messages.map((msg, index) => {
            if (msg.type === 'chat-bubble' && msg.authorId !== userId && index > 0) {
                // Look for the most recent user message before this AI response
                for (let i = index - 1; i >= 0; i--) {
                    const prevMsg = messages[i];
                    if (prevMsg.type === 'chat-bubble' && prevMsg.authorId === userId) {
                        return {
                            ...msg,
                            userInput: String(prevMsg.content)
                        };
                    }
                }
            }
            return msg;
        });
        setProcessedMessages(enhanced);
    }, [messages, userId]);

    const isUserMessage = useMemo(() => {
        return (authorId: string) => authorId === userId;
    }, [userId]);

    const formatTraceDetailsForCopy = useMemo(
        () =>
            (errorMessage: TraceDetails): string => {
                return errorMessage.rootId;
            },
        []
    );

    return (
        <div
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
            role="region"
            aria-label="Chat"
            data-testid="messages-container"
        >
            {/* Screen-reader announcement of the latest message */}
            <div className="sr-only" aria-live={latestMessage?.type === 'alert' ? 'assertive' : 'polite'} data-testid="live-region">
                {latestMessage?.type === 'alert' && latestMessage.header}
                {typeof latestMessage?.content === 'string' ? latestMessage.content : undefined}
            </div>

            {processedMessages.map((message, index) => {
                if (message.type === 'alert') {
                    const errorMessage = parseTraceId(message.content as string);
                    return (
                        <ErrorAlert
                            key={index}
                            index={index}
                            header={message.header}
                            errorMessage={errorMessage}
                            formatTraceDetailsForCopy={formatTraceDetailsForCopy}
                        />
                    );
                }

                const isLastMessage = index === processedMessages.length - 1;
                const isAssistantMessage = message.authorId !== userId;
                const shouldPassToolUsage = isLastMessage && isAssistantMessage && toolUsage.length > 0;

                const hasFileProcessingError = (() => {
                    if (!isUserMessage(message.authorId) || !message.files?.length) return false;

                    // Check if the very next message is a file processing error alert
                    const nextMsg = processedMessages[index + 1];
                    return (
                        nextMsg?.type === 'alert' &&
                        typeof nextMsg.content === 'string' &&
                        nextMsg.content.includes('File processing failed')
                    );
                })();

                return (
                    <ChatMessage
                        key={message.authorId + message.timestamp}
                        message={message}
                        userId={userId}
                        userName={userName!}
                        isUserMessage={isUserMessage}
                        conversationId={conversationId}
                        toolUsage={shouldPassToolUsage ? toolUsage : undefined}
                        hasFileError={hasFileProcessingError}
                        data-testid={`chat-message-${index}`}
                    />
                );
            })}
        </div>
    );
};

export default memo(Messages);
