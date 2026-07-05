// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
    mockUserId,
    createChatBubbleMessage,
    createAlertMessage,
    createSourceDocument,
    createXRayTraceId
} from '../../../../utils/message-test-utils';
import { createTestWrapper } from '../../../../utils/test-utils';
import { ChatMessagesContainer } from '@/pages/chat/components/messages/ChatMessagesContainer';
import { Message } from '@/pages/chat/types';

describe('ChatMessagesContainer', () => {
    // Mock Redux store

    // Mock the useFeedback hook to avoid Redux dependency issues
    vi.mock('@/hooks/use-feedback', () => ({
        useFeedback: () => ({
            showFeedbackForm: false,
            setShowFeedbackForm: vi.fn(),
            feedbackType: 'helpful',
            setFeedbackType: vi.fn(),
            feedbackSubmitted: false,
            isSubmittingFeedback: false,
            handleFeedbackButtonClick: vi.fn(),
            handleFeedbackSubmit: vi.fn()
        })
    }));

    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(performance.now());
            return 0;
        });
    });

    const renderWithWrapper = (messages: Message[]) => {
        const Wrapper = createTestWrapper({
            userId: mockUserId,
            userName: 'Test User'
        });

        return render(
                <Wrapper>
                    <ChatMessagesContainer messages={messages} conversationId='fake-id' />
                </Wrapper>
        );
    };

    const renderAndUpdateMessages = (initialMessages: Message[], newMessages: Message[]) => {
        const Wrapper = createTestWrapper({
            userId: mockUserId,
            userName: 'Test User'
        });

        const { rerender } = render(
                <Wrapper>
                    <ChatMessagesContainer messages={initialMessages} conversationId='fake-id' />
                </Wrapper>
        );

        rerender(
                <Wrapper>
                    <ChatMessagesContainer messages={newMessages} conversationId='fake-id' />
                </Wrapper>
        );

        return { rerender };
    };

    it('renders empty messages container', () => {
        renderWithWrapper([]);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('renders chat bubble messages correctly', () => {
        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: mockUserId,
                content: 'User message'
            }),
            createChatBubbleMessage({
                authorId: 'assistant',
                content: 'Bot response'
            })
        ];

        renderWithWrapper(messages);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('renders messages with source documents', () => {
        const sourceDocuments = [
            createSourceDocument({
                excerpt: 'First source content',
                document_id: 'doc-1'
            }),
            createSourceDocument({
                excerpt: 'Second source content',
                document_id: 'doc-2'
            })
        ];

        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: 'assistant',
                content: 'Message with sources',
                sourceDocuments
            })
        ];

        renderWithWrapper(messages);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('scrolls to bottom when new message is added', () => {
        const scrollToBottomSpy = vi.spyOn(HTMLDivElement.prototype, 'scrollTop', 'set');

        const initialMessages: Message[] = [createChatBubbleMessage({ content: 'First message' })];
        const newMessages: Message[] = [...initialMessages, createChatBubbleMessage({ content: 'New message' })];

        renderAndUpdateMessages(initialMessages, newMessages);

        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(scrollToBottomSpy).toHaveBeenCalled();
    });

    it('handles mixed message types', () => {
        const errorMessage = 'An error occurred during processing. ';
        const traceIdString = createXRayTraceId(errorMessage, 'root-123', 'parent-456', true, 'lineage-789');
        const messages: Message[] = [
            createChatBubbleMessage({
                content: 'Chat message'
            }),
            createAlertMessage({
                header: 'Error occurred',
                content: traceIdString
            })
        ];

        renderWithWrapper(messages);
        const scrollContainer = screen.getByTestId('chat-messages-scrollable-container');
        expect(scrollContainer).toBeInTheDocument();

        // Check if chat message is rendered
        expect(screen.getByText('Chat message')).toBeInTheDocument();

        // Check if alert is rendered properly
        const alert = screen.getByTestId('error-alert1');
        expect(alert.textContent).toContain(errorMessage.trim());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
});
