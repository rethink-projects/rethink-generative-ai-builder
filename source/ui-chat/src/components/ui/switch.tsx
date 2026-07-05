// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>>(
    ({ className, ...props }, ref) => (
        <BaseSwitch.Root
            ref={ref}
            className={cn(
                'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[checked]:bg-primary',
                className
            )}
            {...props}
        >
            <BaseSwitch.Thumb className="pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform data-[checked]:translate-x-4" />
        </BaseSwitch.Root>
    )
);
Switch.displayName = 'Switch';

export { Switch };
