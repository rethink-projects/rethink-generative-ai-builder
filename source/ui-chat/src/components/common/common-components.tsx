// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef } from 'react';
import { Bot } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { AuthorAvatarProps, AUTHORS } from '../../pages/chat/config';
import { cn } from '@/lib/utils';

/**
 * Base props interface for container components
 */
interface BaseContainerProps {
    /** Child elements to render inside the container */
    children: React.ReactNode;
    /** Optional test id for the container element */
    'data-testid'?: string;
}

/**
 * Scrollable container component that provides vertical scrolling for its content
 */
export const ScrollableContainer = forwardRef(
    (
        { children, 'data-testid': dataTestId = 'chat-scroll-container' }: BaseContainerProps,
        ref: React.Ref<HTMLDivElement>
    ) => {
        return (
            <div style={{ position: 'relative', blockSize: '100%' }}>
                <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }} ref={ref} data-testid={dataTestId}>
                    {children}
                </div>
            </div>
        );
    }
);

/**
 * Avatar for chat bubbles: assistant mark or user initials.
 */
export function ChatBubbleAvatar({ type, name, initials, loading }: AuthorAvatarProps) {
    if (type === AUTHORS.ASSISTANT) {
        return (
            <Avatar variant="assistant" title={name} className={cn(loading && 'animate-pulse')}>
                <Bot className="size-4" aria-hidden="true" />
            </Avatar>
        );
    }

    return (
        <Avatar variant="user" title={name}>
            {initials}
        </Avatar>
    );
}
