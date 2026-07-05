// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConversationMessageResponse } from '../hooks/queries';
import { Message } from '../pages/chat/types';
import { AUTHORS } from '../pages/chat/config';

/**
 * Maps the messages returned by GET /conversations/{key}/{conversationId}
 * into the chat reducer's Message shape so a past conversation can be
 * hydrated into the chat window. Server-side history has no timestamps or
 * source documents; hydrated bubbles render as plain content.
 */
export const mapHistoryToMessages = (history: ConversationMessageResponse[], userId: string): Message[] => {
    return history
        .filter((message) => message.content !== undefined && message.content !== '')
        .map((message) => ({
            type: 'chat-bubble' as const,
            authorId: message.type === 'ai' ? AUTHORS.ASSISTANT : userId,
            content: message.content,
            timestamp: '',
            ...(message.messageId && { messageId: message.messageId })
        }));
};
