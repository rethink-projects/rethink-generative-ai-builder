// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@pages/chat/components/input/ChatInput';
import { useConfigStore } from '@/stores/config-store';
import { configFactory } from '@/__tests__/utils/test-redux-store-factory';

describe('ChatInput', () => {
    const onSend = vi.fn();
    const onSendWithFiles = vi.fn();

    const renderInput = (props: Partial<React.ComponentProps<typeof ChatInput>> = {}) => {
        return render(
            <ChatInput isLoading={false} onSend={onSend} onSendWithFiles={onSendWithFiles} {...props} />
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useConfigStore.setState({ runtimeConfig: configFactory.createRuntimeConfig() });
    });

    test('renders the textarea and send button', () => {
        renderInput();

        expect(screen.getByTestId('chat-input')).toBeInTheDocument();
        expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    test('sends the message on button click and clears the input', () => {
        renderInput();

        const textarea = screen.getByTestId('chat-input');
        fireEvent.change(textarea, { target: { value: 'hello assistant' } });
        fireEvent.click(screen.getByTestId('send-button'));

        expect(onSend).toHaveBeenCalledWith('hello assistant');
        expect((textarea as HTMLTextAreaElement).value).toBe('');
    });

    test('sends the message on Enter and keeps newline on Shift+Enter', () => {
        renderInput();

        const textarea = screen.getByTestId('chat-input');
        fireEvent.change(textarea, { target: { value: 'line one' } });
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
        expect(onSend).not.toHaveBeenCalled();

        fireEvent.keyDown(textarea, { key: 'Enter' });
        expect(onSend).toHaveBeenCalledWith('line one');
    });

    test('does not send empty or whitespace-only messages', () => {
        renderInput();

        const textarea = screen.getByTestId('chat-input');
        fireEvent.change(textarea, { target: { value: '    ' } });
        fireEvent.keyDown(textarea, { key: 'Enter' });

        expect(onSend).not.toHaveBeenCalled();
        expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    test('disables send while a response is loading', () => {
        renderInput({ isLoading: true });

        const textarea = screen.getByTestId('chat-input');
        fireEvent.change(textarea, { target: { value: 'question' } });

        expect(screen.getByTestId('send-button')).toBeDisabled();
        fireEvent.keyDown(textarea, { key: 'Enter' });
        expect(onSend).not.toHaveBeenCalled();
    });

    test('shows the character counter and blocks over-limit messages', () => {
        useConfigStore.setState({
            runtimeConfig: configFactory.createRuntimeConfig({
                UseCaseConfig: {
                    LlmParams: { PromptParams: { MaxInputTextLength: 10 } }
                } as any
            })
        });
        renderInput();

        const textarea = screen.getByTestId('chat-input');
        fireEvent.change(textarea, { target: { value: 'this message is far too long' } });

        expect(screen.getByTestId('send-button')).toBeDisabled();
        fireEvent.keyDown(textarea, { key: 'Enter' });
        expect(onSend).not.toHaveBeenCalled();
    });

    test('does not render the attach button when multimodal is disabled', () => {
        renderInput();
        expect(screen.queryByTestId('attach-files-button')).not.toBeInTheDocument();
    });

    test('renders the attach button when multimodal is enabled', () => {
        useConfigStore.setState({
            runtimeConfig: configFactory.createRuntimeConfig({
                UseCaseConfig: {
                    UseCaseType: 'AgentBuilder',
                    LlmParams: { MultimodalParams: { MultimodalEnabled: true } }
                } as any
            })
        });
        renderInput();

        expect(screen.getByTestId('attach-files-button')).toBeInTheDocument();
        expect(screen.getByTestId('file-input')).toBeInTheDocument();
    });
});
