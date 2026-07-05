// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncomingMessage } from '@pages/chat/components/messages/IncomingMessage';
import { AI_AUTHOR } from '@pages/chat/config';
import { ChatBubbleMessage } from '@pages/chat/types';
import { useConfigStore } from '@/stores/config-store';
import { configFactory } from '@/__tests__/utils/test-redux-store-factory';

const mockHandleFeedbackButtonClick = vi.fn();
const mockUseFeedback = {
    showFeedbackForm: false,
    setShowFeedbackForm: vi.fn(),
    feedbackType: '' as const,
    feedbackSubmitted: false,
    feedbackError: null,
    isSubmittingFeedback: false,
    handleFeedbackButtonClick: mockHandleFeedbackButtonClick,
    handleFeedbackSubmit: vi.fn()
};

vi.mock('@/hooks/use-feedback', () => ({
    useFeedback: () => mockUseFeedback
}));

const baseMessage: ChatBubbleMessage = {
    type: 'chat-bubble',
    authorId: 'assistant',
    content: 'Here is your **answer**.',
    timestamp: '10:31',
    messageId: 'msg-1'
};

describe('IncomingMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useConfigStore.setState({
            runtimeConfig: configFactory.createRuntimeConfig({
                UseCaseConfig: { FeedbackParams: { FeedbackEnabled: true } } as any
            })
        });
    });

    test('renders markdown content from the assistant', () => {
        render(
            <IncomingMessage
                message={baseMessage}
                author={AI_AUTHOR}
                showActions={false}
                conversationId="conv-1"
                data-testid="incoming-message"
            />
        );

        expect(screen.getByTestId('incoming-message')).toBeInTheDocument();
        expect(screen.getByText('answer')).toBeInTheDocument();
    });

    test('renders copy and feedback actions when showActions is true', () => {
        render(
            <IncomingMessage
                message={baseMessage}
                author={AI_AUTHOR}
                showActions={true}
                conversationId="conv-1"
                data-testid="incoming-message"
            />
        );

        expect(screen.getByTestId('chat-bubble-actions-btn-grp')).toBeInTheDocument();
        expect(screen.getByTestId('copy-button')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('feedback-helpful-button'));
        expect(mockHandleFeedbackButtonClick).toHaveBeenCalledWith('helpful');
    });

    test('renders source documents when present', () => {
        const messageWithSources: ChatBubbleMessage = {
            ...baseMessage,
            sourceDocuments: [
                {
                    document_id: 'doc-1',
                    document_title: 'Guide',
                    excerpt: 'An excerpt',
                    location: 'https://example.com/guide',
                    score: 'HIGH'
                } as any
            ]
        };

        render(
            <IncomingMessage
                message={messageWithSources}
                author={AI_AUTHOR}
                showActions={false}
                conversationId="conv-1"
                data-testid="incoming-message"
            />
        );

        expect(screen.getByTestId('source-doc-expandable-section')).toBeInTheDocument();
    });

    test('shows the thinking placeholder while loading without content', () => {
        const loadingMessage: ChatBubbleMessage = {
            ...baseMessage,
            content: '',
            avatarLoading: true
        };

        render(
            <IncomingMessage
                message={loadingMessage}
                author={AI_AUTHOR}
                showActions={false}
                conversationId="conv-1"
                data-testid="incoming-message"
            />
        );

        expect(screen.getByTestId('incoming-loading')).toBeInTheDocument();
    });
});
