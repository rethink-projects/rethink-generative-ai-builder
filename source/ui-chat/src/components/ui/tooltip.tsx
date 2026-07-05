// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = BaseTooltip.Provider;
const Tooltip = BaseTooltip.Root;
const TooltipTrigger = BaseTooltip.Trigger;

const TooltipContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>>(
    ({ className, ...props }, ref) => (
        <BaseTooltip.Portal>
            <BaseTooltip.Positioner sideOffset={6} className="z-50">
                <BaseTooltip.Popup
                    ref={ref}
                    className={cn(
                        'rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md outline-none',
                        className
                    )}
                    {...props}
                />
            </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
    )
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
