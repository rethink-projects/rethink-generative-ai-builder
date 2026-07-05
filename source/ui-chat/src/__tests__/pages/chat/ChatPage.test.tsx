// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatPage from '@pages/chat/ChatPage';
import { ReadyState } from 'react-use-websocket';
import { testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { useChatStore } from '@/stores/chat-store';
import { AUTHORS } from '@pages/chat/config';

// Mock the useWebSocket hook
const sendJsonMessageMock = vi.fn();
vi.mock('react-use-websocket', () => {
    return {
        default: vi.fn(() => ({
            sendJsonMessage: sendJsonMessageMock,
            lastJsonMessage: null,
            readyState: 1
        })),
        ReadyState: {
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
            UNINSTANTIATED: 4
        }
    };
});

// Mock the conversation history queries so no network is involved
const conversationDetailsMock = vi.fn();
vi.mock('@/hooks/queries', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useConversationDetailsQuery: (...args: any[]) => conversationDetailsMock(...args),
        useInvalidateConversations: () => vi.fn()
    };
});

import { createTestWrapper } from '@/__tests__/utils/test-utils';

function renderChatPage(options: { runtimeConfigOverrides?: any } = {}) {
    const Wrapper = createTestWrapper({ userId: 'test-user-id', getAccessToken: async () => 'mock-token' });

    return testStoreFactory.renderWithStore(
        <Wrapper>
            <ChatPage />
        </Wrapper>,
        options.runtimeConfigOverrides ? { config: { runtimeConfig: options.runtimeConfigOverrides } } : {}
    );
}

describe('ChatPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        conversationDetailsMock.mockReturnValue({ data: undefined, isLoading: false });
    });

    test('shows the loading state when the use case config is missing', () => {
        renderChatPage({
            runtimeConfigOverrides: { UseCaseConfigKey: 'fake-key', UseCaseConfig: undefined }
        });

        expect(screen.getByTestId('chat-loading')).toBeInTheDocument();
    });

    test('shows the welcome state with suggested prompts when there are no messages', () => {
        renderChatPage();

        expect(screen.getByTestId('welcome-state')).toBeInTheDocument();
        expect(screen.getAllByTestId('suggested-prompt').length).toBeGreaterThanOrEqual(3);
    });

    test('clicking a suggested prompt sends the message', async () => {
        renderChatPage();

        fireEvent.click(screen.getAllByTestId('suggested-prompt')[0]);

        await waitFor(() => {
            expect(sendJsonMessageMock).toHaveBeenCalledTimes(1);
        });
        // the user message lands in the chat store via the reducer
        expect(useChatStore.getState().messages.length).toBeGreaterThan(0);
    });

    test('renders the messages container once messages exist', () => {
        renderChatPage();

        act(() => {
            useChatStore.getState().dispatch({
                type: 'SET_MESSAGES',
                payload: [
                    {
                        type: 'chat-bubble',
                        authorId: 'test-user-id',
                        content: 'hello there',
                        timestamp: ''
                    }
                ]
            } as any);
        });

        expect(screen.queryByTestId('welcome-state')).not.toBeInTheDocument();
    });

    test('hydrates a selected conversation from the history endpoint', async () => {
        conversationDetailsMock.mockReturnValue({
            data: {
                conversationId: 'conv-1',
                messages: [
                    { messageId: 'm1', type: 'human', content: 'old question' },
                    { messageId: 'm2', type: 'ai', content: 'old answer' }
                ]
            },
            isLoading: false
        });

        renderChatPage();
        act(() => {
            useChatStore.getState().selectConversation('conv-1');
        });

        await waitFor(() => {
            expect(useChatStore.getState().conversationId).toBe('conv-1');
        });

        const messages = useChatStore.getState().messages as any[];
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toBe('old question');
        expect(messages[0].authorId).toBe('test-user-id');
        expect(messages[1].authorId).toBe(AUTHORS.ASSISTANT);
    });
});
