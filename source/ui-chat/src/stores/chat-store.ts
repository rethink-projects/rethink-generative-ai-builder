// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { ChatState } from '../hooks/use-chat-message';
import { chatReducer, ChatAction } from '../reducers/chat-reducer';
import { ChatActionTypes } from '../pages/chat/types';

export interface ChatStoreState extends ChatState {
    /** Mirrors the streaming flag previously kept in a ref inside use-chat-message */
    streamingActive: boolean;
    /** Conversation picked from the history sidebar, null for a fresh conversation */
    selectedConversationId: string | null;
    dispatch: (action: ChatAction) => void;
    setStreamingActive: (active: boolean) => void;
    selectConversation: (conversationId: string | null) => void;
    resetChat: () => void;
}

const initialChatState: ChatState = {
    messages: [],
    currentResponse: '',
    isGenAiResponseLoading: false,
    sourceDocuments: [],
    conversationId: '',
    isStreaming: false,
    streamingMessageId: undefined,
    thinking: undefined,
    toolUsage: []
};

/**
 * Chat state lives in a Zustand store so both the chat page and the
 * conversation sidebar can read/update it. All message transitions still go
 * through the pure `chatReducer`, which keeps the reducer unit-testable and
 * the streaming semantics unchanged.
 */
export const useChatStore = create<ChatStoreState>()((set) => ({
    ...initialChatState,
    streamingActive: false,
    selectedConversationId: null,
    dispatch: (action) => set((state) => chatReducer(state, action)),
    setStreamingActive: (active) => set({ streamingActive: active }),
    selectConversation: (conversationId) => set({ selectedConversationId: conversationId }),
    resetChat: () =>
        set((state) => ({
            ...chatReducer(state, { type: ChatActionTypes.RESET_CHAT }),
            streamingActive: false,
            selectedConversationId: null
        }))
}));
