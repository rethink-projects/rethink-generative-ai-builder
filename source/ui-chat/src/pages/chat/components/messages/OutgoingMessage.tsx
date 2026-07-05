// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { OutgoingMessageProps } from './types';
import MarkdownContent from '../../../../components/markdown/MarkdownContent';
import { FileDisplay } from '../../../../components/multimodal/FileDisplay';
import { cn } from '@/lib/utils';

/**
 * User message: right-aligned bubble with optional attachments and a
 * show more/less control for very long content.
 */
export const OutgoingMessage = ({
    message,
    author,
    hasFileError = false,
    'data-testid': dataTestId,
    previewHeight = 200
}: OutgoingMessageProps) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const content = String(message.content);

    useEffect(() => {
        if (contentRef.current) {
            setIsOverflowing(contentRef.current.scrollHeight > previewHeight);
        }
    }, [content, previewHeight]);

    return (
        <div
            className="flex justify-end"
            data-testid={dataTestId}
            aria-label={`${author.name} at ${message.timestamp}`}
        >
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-chat-user-bubble px-4 py-2.5 text-chat-user-bubble-foreground">
                {message.files && message.files.length > 0 && (
                    <FileDisplay files={message.files} hasError={hasFileError} />
                )}
                <div
                    className="relative overflow-hidden"
                    style={{ maxHeight: isExpanded ? 'none' : `${previewHeight}px` }}
                >
                    <div ref={contentRef}>
                        <MarkdownContent content={content} />
                    </div>

                    {isOverflowing && !isExpanded && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-chat-user-bubble to-transparent pt-8">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-1 text-xs font-medium hover:underline"
                                onClick={() => setIsExpanded(true)}
                            >
                                {t('messages.showMore')}
                                <ChevronDown className="size-3" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
                {isOverflowing && isExpanded && (
                    <button
                        type="button"
                        className="mt-1 flex items-center gap-1 text-xs font-medium hover:underline"
                        onClick={() => setIsExpanded(false)}
                    >
                        {t('messages.showLess')}
                        <ChevronDown className={cn('size-3 rotate-180')} aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
};
