// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';

const typeStyles: Record<string, string> = {
    success: 'border-l-4 border-l-green-600',
    error: 'border-l-4 border-l-destructive',
    warning: 'border-l-4 border-l-amber-500',
    'info': 'border-l-4 border-l-primary',
    'in-progress': 'border-l-4 border-l-primary'
};

/**
 * Lightweight toast stack fed by the notifications store; replaces the
 * Cloudscape Flashbar.
 */
export function Toaster() {
    const notifications = useNotificationsStore((state) => state.notifications);
    const deleteNotification = useNotificationsStore((state) => state.deleteNotification);

    if (notifications.length === 0) return null;

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
            data-testid="toaster"
        >
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    role="status"
                    className={cn(
                        'pointer-events-auto flex items-start gap-2 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md',
                        typeStyles[notification.type]
                    )}
                >
                    <div className="flex-1">
                        {notification.header && <p className="font-medium">{notification.header}</p>}
                        {notification.content && <div className="text-muted-foreground">{notification.content}</div>}
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss"
                        className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => deleteNotification(notification.id)}
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
