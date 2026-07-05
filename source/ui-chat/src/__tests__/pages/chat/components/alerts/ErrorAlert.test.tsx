// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorAlert } from '@pages/chat/components/alerts/ErrorAlert';
import { TraceDetails } from '@/utils/validation';

const traceDetails: TraceDetails = {
    message: 'Something went wrong',
    rootId: '1-abc-123',
    parentId: 'parent-1',
    lineage: 'lineage-1',
    sampled: true
};

describe('ErrorAlert', () => {
    test('renders the error message and trace details', () => {
        render(
            <ErrorAlert
                index={0}
                header="Error"
                errorMessage={traceDetails}
                formatTraceDetailsForCopy={(details) => details.rootId}
            />
        );

        const alert = screen.getByTestId('error-alert0');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Something went wrong');
        expect(alert).toHaveTextContent('Root ID: 1-abc-123');
        expect(alert).toHaveTextContent('Parent ID: parent-1');
    });

    test('copies the trace id', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(
            <ErrorAlert
                index={1}
                errorMessage={traceDetails}
                formatTraceDetailsForCopy={(details) => details.rootId}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Copy Trace Id/i }));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith('1-abc-123');
        });
        expect(screen.getByRole('button', { name: /Trace ID copied/i })).toBeInTheDocument();
    });
});
