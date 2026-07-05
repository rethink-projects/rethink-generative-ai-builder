// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatBubbleAvatar } from '@/components/common/common-components';
import { ChatBubbleActions } from '../actions/ChatBubbleActions';
import MarkdownContent from '@/components/markdown/MarkdownContent';
import { SourceDocumentsSection } from '../source-documents/SourceDocument';
import { IncomingMessageProps } from './types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FeedbackForm } from '../input/FeedbackForm';
import { useFeedback } from '@/hooks/use-feedback';
import { ThinkingIndicator } from '@/components/thinking/ThinkingIndicator';
import { ToolUsageList } from '@/components/tool-usage/ToolUsageList';
import { AgentBuilderChatBubbleMessage } from '../../types';
import { useConfigStore, selectUseCaseType } from '@/stores/config-store';
import { USE_CASE_TYPES } from '@/utils/constants';

const isAgentBuilderMessage = (message: any): message is AgentBuilderChatBubbleMessage => {
    return message && 'thinking' in message && message.thinking !== undefined;
};

/**
 * Assistant message: avatar + markdown content with optional thinking
 * indicator, tool usage, RAG sources, and copy/feedback actions.
 */
export const IncomingMessage = ({
    message,
    author,
    showActions,
    conversationId,
    toolUsage,
    'data-testid': dataTestId
}: IncomingMessageProps) => {
    const { t } = useTranslation();
    const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
    const useCaseType = useConfigStore(selectUseCaseType);
    const {
        showFeedbackForm,
        setShowFeedbackForm,
        feedbackType,
        feedbackSubmitted,
        feedbackError,
        isSubmittingFeedback,
        handleFeedbackButtonClick,
        handleFeedbackSubmit
    } = useFeedback(message, conversationId);

    const isAgentLikeUseCase = useCaseType === USE_CASE_TYPES.AGENT_BUILDER || useCaseType === USE_CASE_TYPES.WORKFLOW;
    const shouldShowThinkingIndicator = isAgentLikeUseCase && isAgentBuilderMessage(message);
    const shouldShowToolUsage = isAgentLikeUseCase && toolUsage && toolUsage.length > 0;

    // Reset feedback form state when message changes
    useEffect(() => {
        setShowFeedbackForm(false);
    }, [message.authorId, message.timestamp, message.messageId, setShowFeedbackForm]);

    // Show feedback confirmation when feedback is submitted
    useEffect(() => {
        if (feedbackSubmitted || feedbackError) {
            setShowFeedbackConfirmation(true);
            if (feedbackSubmitted) {
                const timer = setTimeout(() => {
                    setShowFeedbackConfirmation(false);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [feedbackSubmitted, feedbackError]);

    const isLoading = message.avatarLoading && !message.content;

    return (
        <div className="flex gap-3" data-testid={dataTestId} aria-label={`${author.name} at ${message.timestamp}`}>
            {!message.hideAvatar && <ChatBubbleAvatar {...author} loading={message.avatarLoading} />}
            <div className="min-w-0 flex-1 pt-1">
                {isLoading && !shouldShowThinkingIndicator && (
                    <p className="animate-pulse text-sm text-muted-foreground" data-testid="incoming-loading">
                        {t('messages.thinking')}
                    </p>
                )}

                {shouldShowThinkingIndicator && message.thinking && (
                    <ThinkingIndicator thinking={message.thinking} data-testid="message-thinking-indicator" />
                )}

                <MarkdownContent content={String(message.content)} />

                {shouldShowToolUsage && <ToolUsageList toolUsage={toolUsage!} data-testid="message-tool-usage" />}

                {message.sourceDocuments && message.sourceDocuments.length > 0 && (
                    <SourceDocumentsSection sourceDocuments={message.sourceDocuments} />
                )}

                {showActions && (
                    <ChatBubbleActions
                        content={String(message.content)}
                        onFeedback={handleFeedbackButtonClick}
                        feedbackSubmitted={feedbackSubmitted}
                        feedbackType={feedbackType}
                    />
                )}

                {showFeedbackForm && (
                    <FeedbackForm
                        onSubmit={handleFeedbackSubmit}
                        onCancel={() => setShowFeedbackForm(false)}
                        feedbackType={feedbackType}
                        isLoading={isSubmittingFeedback}
                    />
                )}

                {showFeedbackConfirmation && (
                    <p
                        role="status"
                        className={feedbackError ? 'mt-1 text-xs text-destructive' : 'mt-1 text-xs text-primary'}
                        data-testid="feedback-confirmation"
                    >
                        {feedbackError || t('messages.feedbackThanks')}
                    </p>
                )}
            </div>
        </div>
    );
};
