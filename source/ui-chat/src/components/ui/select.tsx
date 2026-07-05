// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = BaseSelect.Root;

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>(
    ({ className, children, ...props }, ref) => (
        <BaseSelect.Trigger
            ref={ref}
            className={cn(
                'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        >
            <BaseSelect.Value />
            {children}
            <BaseSelect.Icon>
                <ChevronDown className="size-4 opacity-60" />
            </BaseSelect.Icon>
        </BaseSelect.Trigger>
    )
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>>(
    ({ className, ...props }, ref) => (
        <BaseSelect.Portal>
            <BaseSelect.Positioner sideOffset={6} className="z-50">
                <BaseSelect.Popup
                    ref={ref}
                    className={cn(
                        'min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
                        className
                    )}
                    {...props}
                />
            </BaseSelect.Positioner>
        </BaseSelect.Portal>
    )
);
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Item>>(
    ({ className, children, ...props }, ref) => (
        <BaseSelect.Item
            ref={ref}
            className={cn(
                'grid cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                className
            )}
            {...props}
        >
            <BaseSelect.ItemIndicator>
                <Check className="size-3.5" />
            </BaseSelect.ItemIndicator>
            <BaseSelect.ItemText className="col-start-2">{children}</BaseSelect.ItemText>
        </BaseSelect.Item>
    )
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectContent, SelectItem };
