// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

const DropdownMenu = BaseMenu.Root;
const DropdownMenuTrigger = BaseMenu.Trigger;

const DropdownMenuContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> & { align?: 'start' | 'center' | 'end' }
>(({ className, align = 'start', ...props }, ref) => (
    <BaseMenu.Portal>
        <BaseMenu.Positioner align={align} sideOffset={6} className="z-50">
            <BaseMenu.Popup
                ref={ref}
                className={cn(
                    'min-w-[10rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
                    className
                )}
                {...props}
            />
        </BaseMenu.Positioner>
    </BaseMenu.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Item>>(
    ({ className, ...props }, ref) => (
        <BaseMenu.Item
            ref={ref}
            className={cn(
                'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:size-4',
                className
            )}
            {...props}
        />
    )
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = ({ className }: { className?: string }) => (
    <BaseMenu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} />
);

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
