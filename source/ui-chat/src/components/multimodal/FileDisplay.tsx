// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AlertCircle, Download, FileText } from 'lucide-react';
import { UploadedFile } from '../../types/file-upload';
import { formatFileNameForDisplay } from '../../utils/file-upload';
import { fetchFileDownloadUrl } from '../../hooks/queries';
import { useConfigStore } from '../../stores/config-store';
import { cn } from '@/lib/utils';

interface FileDisplayProps {
    readonly files: UploadedFile[];
    readonly hasError?: boolean;
}

interface FileTagProps {
    file: UploadedFile;
    hasError?: boolean;
    showDownload?: boolean;
}

const FileTag = ({ file, hasError, showDownload = false }: FileTagProps) => {
    const displayName = formatFileNameForDisplay(file.fileName);
    const isNameTruncated = displayName !== file.fileName;
    const useCaseId = useConfigStore((state) => state.runtimeConfig?.UseCaseId);

    const handleDownload = async () => {
        if (!useCaseId || !file.conversationId || !file.messageId) {
            console.error('Missing required parameters for download:', {
                useCaseId,
                conversationId: file.conversationId,
                messageId: file.messageId
            });
            return;
        }

        try {
            const result = await fetchFileDownloadUrl({
                useCaseId,
                conversationId: file.conversationId,
                messageId: file.messageId,
                fileName: file.fileName
            });

            window.open(result.downloadUrl, '_blank');
        } catch (error) {
            console.error('Failed to get download URL:', error);
        }
    };

    if (hasError) {
        return (
            <span className="inline-flex max-w-52 items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{displayName}</span>
            </span>
        );
    }

    return (
        <button
            type="button"
            className={cn(
                'group inline-flex max-w-52 items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs',
                showDownload ? 'cursor-pointer hover:bg-accent' : 'cursor-default'
            )}
            onClick={showDownload ? handleDownload : undefined}
            title={isNameTruncated ? file.fileName : undefined}
        >
            <FileText className="size-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
            {showDownload && (
                <Download className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            )}
        </button>
    );
};

export const FileDisplay = ({ files, hasError = false }: FileDisplayProps) => {
    if (!files?.length) return null;

    return (
        <div className="mb-1 flex flex-wrap gap-1" data-testid="file-display">
            {files.map((file) => (
                <FileTag key={file.key} file={file} hasError={hasError} showDownload={true} />
            ))}
        </div>
    );
};
