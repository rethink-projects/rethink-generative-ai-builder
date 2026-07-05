// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackForm } from '@pages/chat/components/input/FeedbackForm';
import { MAX_FEEDBACK_INPUT_LENGTH } from '@/utils';

describe('FeedbackForm', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the comment field and buttons', () => {
        render(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="helpful" />);

        expect(screen.getByTestId('feedback-form')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-comment-input')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-submit-button')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-cancel-button')).toBeInTheDocument();
    });

    test('shows reason checkboxes only for not-helpful feedback', () => {
        const { rerender } = render(
            <FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="not-helpful" />
        );
        expect(screen.getByTestId('feedback-form-reasons-field')).toBeInTheDocument();

        rerender(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="helpful" />);
        expect(screen.queryByTestId('feedback-form-reasons-field')).not.toBeInTheDocument();
    });

    test('submits the comment and selected reasons', () => {
        render(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="not-helpful" />);

        fireEvent.change(screen.getByTestId('feedback-form-comment-input'), {
            target: { value: 'Not quite right' }
        });
        fireEvent.click(screen.getByTestId('feedback-form-reason-checkbox-Inaccurate'));
        fireEvent.click(screen.getByTestId('feedback-form-submit-button'));

        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({ comment: 'Not quite right', reasons: ['Inaccurate'] })
        );
    });

    test('blocks submit when the comment contains invalid characters', () => {
        render(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="helpful" />);

        fireEvent.change(screen.getByTestId('feedback-form-comment-input'), {
            target: { value: 'bad chars <script>' }
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-submit-button')).toBeDisabled();
    });

    test('blocks submit when the comment is too long', () => {
        render(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="helpful" />);

        fireEvent.change(screen.getByTestId('feedback-form-comment-input'), {
            target: { value: 'a'.repeat(MAX_FEEDBACK_INPUT_LENGTH + 1) }
        });

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByTestId('feedback-form-submit-button')).toBeDisabled();
    });

    test('calls onCancel when cancel is clicked', () => {
        render(<FeedbackForm onSubmit={onSubmit} onCancel={onCancel} feedbackType="helpful" />);

        fireEvent.click(screen.getByTestId('feedback-form-cancel-button'));
        expect(onCancel).toHaveBeenCalled();
    });
});
