// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'user' | 'assistant';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ className, variant = 'user', ...props }, ref) => (
    <div
        ref={ref}
        aria-hidden="true"
        className={cn(
            'flex size-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold',
            variant === 'assistant'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground border',
            className
        )}
        {...props}
    />
));
Avatar.displayName = 'Avatar';

export { Avatar };
