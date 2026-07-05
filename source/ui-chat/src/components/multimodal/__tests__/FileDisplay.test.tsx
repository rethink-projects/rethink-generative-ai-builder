// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileDisplay } from '../FileDisplay';
import { UploadedFile } from '../../../types/file-upload';
import { useConfigStore } from '../../../stores/config-store';
import { RuntimeConfig } from '../../../models';

const mockFetchFileDownloadUrl = vi.fn();
vi.mock('../../../hooks/queries', () => ({
    fetchFileDownloadUrl: (params: any) => mockFetchFileDownloadUrl(params)
}));

const mockUploadedFile: UploadedFile = {
    key: 'test-key-1',
    fileName: 'test-document.pdf',
    fileContentType: 'application/pdf',
    fileExtension: 'pdf',
    fileSize: 1024,
    messageId: 'test-message-id',
    conversationId: 'test-conversation-id'
};

describe('FileDisplay', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useConfigStore.setState({ runtimeConfig: { UseCaseId: 'test-use-case' } as RuntimeConfig });
    });

    test('renders nothing when no files provided', () => {
        render(<FileDisplay files={[]} />);
        expect(screen.queryByTestId('file-display')).not.toBeInTheDocument();
    });

    test('renders a chip per file', () => {
        render(<FileDisplay files={[mockUploadedFile]} />);

        expect(screen.getByTestId('file-display')).toBeInTheDocument();
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    test('renders error styling when hasError is true', () => {
        render(<FileDisplay files={[mockUploadedFile]} hasError />);

        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        // error chips are not clickable buttons
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('clicking a file fetches the download URL and opens it', async () => {
        mockFetchFileDownloadUrl.mockResolvedValue({ downloadUrl: 'https://example.com/download' });
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(<FileDisplay files={[mockUploadedFile]} />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockFetchFileDownloadUrl).toHaveBeenCalledWith({
                useCaseId: 'test-use-case',
                conversationId: 'test-conversation-id',
                messageId: 'test-message-id',
                fileName: 'test-document.pdf'
            });
        });
        await waitFor(() => {
            expect(openSpy).toHaveBeenCalledWith('https://example.com/download', '_blank');
        });

        openSpy.mockRestore();
    });

    test('does not fetch when required parameters are missing', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<FileDisplay files={[{ ...mockUploadedFile, messageId: undefined }]} />);

        fireEvent.click(screen.getByRole('button'));

        expect(mockFetchFileDownloadUrl).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
