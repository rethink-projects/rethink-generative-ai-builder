// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfigStore, getFeedbackEnabledState } from '@/stores/config-store';
import { FEEDBACK_HELPFUL, FEEDBACK_NOT_HELPFUL } from '@/utils';
import { cn } from '@/lib/utils';

interface ChatBubbleActionsProps {
    content: string;
    onFeedback: (feedback: typeof FEEDBACK_HELPFUL | typeof FEEDBACK_NOT_HELPFUL) => void;
    feedbackSubmitted: boolean;
    feedbackType: string;
}

/**
 * Copy + thumbs up/down actions shown under assistant messages.
 */
export const ChatBubbleActions: React.FC<ChatBubbleActionsProps> = ({
    content,
    onFeedback,
    feedbackSubmitted,
    feedbackType
}: ChatBubbleActionsProps) => {
    const { t } = useTranslation();
    const feedbackEnabled = useConfigStore(getFeedbackEnabledState);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    return (
        <div
            role="group"
            aria-label="Message actions"
            className="mt-1 flex items-center gap-0.5"
            data-testid="chat-bubble-actions-btn-grp"
        >
            {feedbackEnabled && (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn('size-7 text-muted-foreground', feedbackType === FEEDBACK_HELPFUL && 'text-primary')}
                        aria-label={t('messages.helpful')}
                        aria-pressed={feedbackType === FEEDBACK_HELPFUL}
                        disabled={feedbackSubmitted}
                        onClick={() => !feedbackSubmitted && onFeedback(FEEDBACK_HELPFUL)}
                        data-testid="feedback-helpful-button"
                    >
                        <ThumbsUp className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'size-7 text-muted-foreground',
                            feedbackType === FEEDBACK_NOT_HELPFUL && 'text-destructive'
                        )}
                        aria-label={t('messages.notHelpful')}
                        aria-pressed={feedbackType === FEEDBACK_NOT_HELPFUL}
                        disabled={feedbackSubmitted}
                        onClick={() => !feedbackSubmitted && onFeedback(FEEDBACK_NOT_HELPFUL)}
                        data-testid="feedback-not-helpful-button"
                    >
                        <ThumbsDown className="size-3.5" />
                    </Button>
                </>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label={copied ? t('messages.copied') : t('messages.copy')}
                onClick={handleCopy}
                data-testid="copy-button"
            >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
        </div>
    );
};
