// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FEEDBACK_HELPFUL, FEEDBACK_NOT_HELPFUL, MAX_FEEDBACK_INPUT_LENGTH } from '@/utils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export type FeedbackType = 'helpful' | 'not-helpful' | '';

export interface FeedbackFormProps {
    onSubmit: (data: FeedbackFormData) => void;
    onCancel: () => void;
    feedbackType: FeedbackType;
    isLoading?: boolean;
}

export interface FeedbackFormData {
    comment: string;
    reasons: string[];
    type?: FeedbackType;
    timestamp?: string;
}

const FEEDBACK_REASONS = [
    { label: 'Inaccurate', value: 'Inaccurate' },
    { label: 'Incomplete or insufficient', value: 'Incomplete or insufficient' },
    { label: 'Harmful', value: 'Harmful' },
    { label: 'Other', value: 'Other' }
];

/**
 * Inline feedback form shown under an assistant message after the user clicks
 * thumbs up/down. Keeps the original validation rules (length + charset).
 */
export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, onCancel, feedbackType, isLoading = false }) => {
    const { t } = useTranslation();
    const [feedbackData, setFeedbackData] = useState<FeedbackFormData>({
        comment: '',
        reasons: []
    });
    const [feedbackCommentError, setFeedbackCommentError] = useState('');

    useEffect(() => {
        if (feedbackType === FEEDBACK_HELPFUL) {
            setFeedbackData((prev) => ({
                ...prev,
                reasons: []
            }));
        }
    }, [feedbackType]);

    const validateFeedbackCommentInput = (feedbackComment: string) => {
        if (feedbackComment.length > MAX_FEEDBACK_INPUT_LENGTH) {
            return {
                isValid: false,
                error: `The feedback comment has too many characters. Character count: ${feedbackComment.length}/${MAX_FEEDBACK_INPUT_LENGTH}`
            };
        }

        const validCharsRegex = /^[a-zA-Z0-9 .,!?-]*$/;
        if (!validCharsRegex.test(feedbackComment)) {
            return {
                isValid: false,
                error: 'Feedback can only contain letters, numbers, spaces, and basic punctuation (.,!?-)'
            };
        }

        return { isValid: true, error: '' };
    };

    const handleFeedbackCommentChange = (value: string) => {
        setFeedbackData((prev) => ({ ...prev, comment: value }));
        const { error } = validateFeedbackCommentInput(value);
        setFeedbackCommentError(error);
    };

    return (
        <div className="mt-2 space-y-3 rounded-md border bg-muted/40 p-3 text-sm" data-testid="feedback-form">
            <div data-testid="feedback-form-comment-field">
                <label className="mb-1 block text-xs font-medium" htmlFor="feedback-comment">
                    {t('feedbackForm.commentLabel')}
                </label>
                <input
                    id="feedback-comment"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={feedbackData.comment}
                    onChange={(event) => handleFeedbackCommentChange(event.target.value)}
                    placeholder={`Tell us why this response was ${feedbackType}...`}
                    autoComplete="off"
                    aria-invalid={!!feedbackCommentError}
                    data-testid="feedback-form-comment-input"
                />
                {feedbackCommentError && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                        {feedbackCommentError}
                    </p>
                )}
            </div>

            {feedbackType === FEEDBACK_NOT_HELPFUL && (
                <fieldset data-testid="feedback-form-reasons-field">
                    <legend className="mb-1 text-xs font-medium">{t('feedbackForm.reasonsLabel')}</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {FEEDBACK_REASONS.map((reason) => (
                            <label key={reason.value} className="flex items-center gap-1.5 text-sm">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-[var(--primary)]"
                                    checked={feedbackData.reasons.includes(reason.value)}
                                    onChange={(event) => {
                                        setFeedbackData((prev) => ({
                                            ...prev,
                                            reasons: event.target.checked
                                                ? [...prev.reasons, reason.value]
                                                : prev.reasons.filter((r) => r !== reason.value)
                                        }));
                                    }}
                                    data-testid={`feedback-form-reason-checkbox-${reason.value}`}
                                />
                                {reason.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}

            <div className="flex justify-end gap-2" data-testid="feedback-form-buttons">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={isLoading}
                    data-testid="feedback-form-cancel-button"
                >
                    {t('feedbackForm.cancel')}
                </Button>
                <Button
                    size="sm"
                    onClick={() => onSubmit(feedbackData)}
                    disabled={isLoading || !!feedbackCommentError}
                    data-testid="feedback-form-submit-button"
                >
                    {t('feedbackForm.submit')}
                </Button>
            </div>
        </div>
    );
};
