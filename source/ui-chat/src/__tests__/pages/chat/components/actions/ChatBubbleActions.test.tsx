// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatBubbleActions } from '@pages/chat/components/actions/ChatBubbleActions';
import { useConfigStore } from '@/stores/config-store';
import { configFactory } from '@/__tests__/utils/test-redux-store-factory';
import { FEEDBACK_HELPFUL, FEEDBACK_NOT_HELPFUL } from '@/utils';

describe('ChatBubbleActions', () => {
    const onFeedback = vi.fn();

    const setFeedbackEnabled = (enabled: boolean) =>
        useConfigStore.setState({
            runtimeConfig: configFactory.createRuntimeConfig({
                UseCaseConfig: { FeedbackParams: { FeedbackEnabled: enabled } } as any
            })
        });

    beforeEach(() => {
        vi.clearAllMocks();
        setFeedbackEnabled(true);
    });

    test('renders feedback and copy buttons when feedback is enabled', () => {
        render(
            <ChatBubbleActions content="answer" onFeedback={onFeedback} feedbackSubmitted={false} feedbackType="" />
        );

        expect(screen.getByTestId('feedback-helpful-button')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-not-helpful-button')).toBeInTheDocument();
        expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });

    test('hides feedback buttons when feedback is disabled', () => {
        setFeedbackEnabled(false);
        render(
            <ChatBubbleActions content="answer" onFeedback={onFeedback} feedbackSubmitted={false} feedbackType="" />
        );

        expect(screen.queryByTestId('feedback-helpful-button')).not.toBeInTheDocument();
        expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    });

    test('invokes onFeedback for helpful and not helpful', () => {
        render(
            <ChatBubbleActions content="answer" onFeedback={onFeedback} feedbackSubmitted={false} feedbackType="" />
        );

        fireEvent.click(screen.getByTestId('feedback-helpful-button'));
        expect(onFeedback).toHaveBeenCalledWith(FEEDBACK_HELPFUL);

        fireEvent.click(screen.getByTestId('feedback-not-helpful-button'));
        expect(onFeedback).toHaveBeenCalledWith(FEEDBACK_NOT_HELPFUL);
    });

    test('disables feedback buttons after submission', () => {
        render(
            <ChatBubbleActions
                content="answer"
                onFeedback={onFeedback}
                feedbackSubmitted={true}
                feedbackType={FEEDBACK_HELPFUL}
            />
        );

        expect(screen.getByTestId('feedback-helpful-button')).toBeDisabled();
        expect(screen.getByTestId('feedback-not-helpful-button')).toBeDisabled();
    });

    test('copies the message content to the clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(
            <ChatBubbleActions content="answer" onFeedback={onFeedback} feedbackSubmitted={false} feedbackType="" />
        );

        fireEvent.click(screen.getByTestId('copy-button'));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith('answer');
        });
    });
});
