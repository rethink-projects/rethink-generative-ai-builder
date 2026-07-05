// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutgoingMessage } from '@pages/chat/components/messages/OutgoingMessage';
import { createUserAuthor } from '@pages/chat/config';
import { ChatBubbleMessage } from '@pages/chat/types';
import { useConfigStore } from '@/stores/config-store';
import { configFactory } from '@/__tests__/utils/test-redux-store-factory';

const author = createUserAuthor('Test User');

const baseMessage: ChatBubbleMessage = {
    type: 'chat-bubble',
    authorId: 'user-1',
    content: 'What is the weather like?',
    timestamp: '10:30'
};

describe('OutgoingMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useConfigStore.setState({ runtimeConfig: configFactory.createRuntimeConfig() });
    });

    test('renders the user message content', () => {
        render(<OutgoingMessage message={baseMessage} author={author} data-testid="outgoing-message" />);

        expect(screen.getByTestId('outgoing-message')).toBeInTheDocument();
        expect(screen.getByText('What is the weather like?')).toBeInTheDocument();
    });

    test('renders attached files when present', () => {
        const messageWithFiles: ChatBubbleMessage = {
            ...baseMessage,
            files: [
                {
                    key: 'file-1',
                    fileName: 'report.pdf',
                    fileContentType: 'application/pdf',
                    fileExtension: 'pdf',
                    fileSize: 512,
                    messageId: 'msg-1',
                    conversationId: 'conv-1'
                }
            ]
        };

        render(<OutgoingMessage message={messageWithFiles} author={author} data-testid="outgoing-message" />);

        expect(screen.getByTestId('file-display')).toBeInTheDocument();
        expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    test('does not render the file display without files', () => {
        render(<OutgoingMessage message={baseMessage} author={author} data-testid="outgoing-message" />);

        expect(screen.queryByTestId('file-display')).not.toBeInTheDocument();
    });
});
