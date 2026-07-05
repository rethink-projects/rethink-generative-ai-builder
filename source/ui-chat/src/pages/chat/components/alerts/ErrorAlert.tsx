// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TraceDetails } from '../../../../utils/validation';

interface ErrorAlertProps {
    index: number;
    header?: string;
    errorMessage: TraceDetails;
    formatTraceDetailsForCopy: (errorMessage: TraceDetails) => string;
}

/**
 * Displays a chat error with its X-Ray trace details and a copy action.
 */
export const ErrorAlert = ({ index, header, errorMessage, formatTraceDetailsForCopy }: ErrorAlertProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatTraceDetailsForCopy(errorMessage));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy trace id:', error);
        }
    };

    return (
        <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
            data-testid={'error-alert' + index}
        >
            <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <div className="min-w-0 flex-1 space-y-2">
                    {header && <p className="font-medium text-destructive">{header}</p>}
                    <p>{errorMessage.message}</p>
                    <pre className="overflow-x-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                        Root ID: {errorMessage.rootId}
                        {errorMessage.parentId && `\nParent ID: ${errorMessage.parentId}`}
                        {errorMessage.lineage && `\nLineage: ${errorMessage.lineage}`}
                        {`\nSampled: ${errorMessage.sampled ? 'Yes' : 'No'}`}
                    </pre>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? <Check /> : <Copy />}
                        {copied ? 'Trace ID copied' : 'Copy Trace Id'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
