// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';

import {
    getMultimodalEnabledState,
    getUseCaseId,
    getMaxInputTextLength,
    useConfigStore
} from '../../../../stores/config-store';

import { useFileUpload } from '../../../../hooks/use-file-upload';
import { uploadFiles, deleteFiles } from '../../../../services/fileUploadService';
import { UploadedFile } from '../../../../types/file-upload';
import {
    DEFAULT_CHAT_INPUT_MAX_LENGTH,
    DOCS_LINKS,
    MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS
} from '../../../../utils/constants';
import { validateFile, isFileCountExceeded, formatFileNameForDisplay } from '../../../../utils/file-upload';
import { formatCharacterCount } from '../../../../utils/validation';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    isLoading: boolean;
    onSend: (value: string) => void;
    onSendWithFiles?: (value: string, files: UploadedFile[], messageId?: string) => void;
    conversationId?: string;
    onSetConversationId?: (conversationId: string) => void;
}

const MAX_TEXTAREA_HEIGHT_PX = 200;

export const ChatInput = memo<ChatInputProps>(
    ({
        isLoading,
        onSend,
        onSendWithFiles,
        conversationId,
        onSetConversationId
    }: ChatInputProps): React.ReactElement => {
        const { t } = useTranslation();
        const [inputText, setInputText] = useState('');
        const [files, setFiles] = useState<File[]>([]);
        const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
        const [isUploading, setIsUploading] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [uploadErrors, setUploadErrors] = useState<Record<string, Error>>({});
        const [deleteErrors, setDeleteErrors] = useState<Record<string, Error>>({});
        const [messageId, setMessageId] = useState<string>('');
        const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
        const [isDraggingOver, setIsDraggingOver] = useState(false);

        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const { generateConversationId, generateMessageId } = useFileUpload();
        const isInternalUser = useConfigStore((state) => state.runtimeConfig?.IsInternalUser) === 'true';
        const isMultimodalEnabled = useConfigStore(getMultimodalEnabledState);
        const useCaseId = useConfigStore(getUseCaseId);

        const maxInputLength = useConfigStore((state) => {
            try {
                return getMaxInputTextLength(state);
            } catch {
                return DEFAULT_CHAT_INPUT_MAX_LENGTH;
            }
        });

        // Auto-grow the textarea with the content
        useEffect(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
            }
        }, [inputText]);

        // Return focus to the input when a response finishes
        useEffect(() => {
            if (!isLoading) {
                textareaRef.current?.focus();
            }
        }, [isLoading]);

        const clearObsoleteValidationErrors = useCallback((allFiles: File[]) => {
            const existingFileNames = new Set(allFiles.map((file) => file.name));

            setUploadErrors((prev) => {
                const newErrors = { ...prev };
                Object.keys(newErrors).forEach((fileName) => {
                    if (!existingFileNames.has(fileName)) {
                        delete newErrors[fileName];
                    }
                });

                return newErrors;
            });
        }, []);

        const createFileFromUploaded = useCallback((uf: UploadedFile) => {
            const file = new File([], uf.fileName, { type: uf.fileContentType });
            Object.defineProperty(file, 'size', { value: uf.fileSize, writable: false });
            return file;
        }, []);

        const handleFileUpload = useCallback(
            async (filesToUpload: File[]) => {
                let currentConversationId = conversationId;

                if (!currentConversationId && isMultimodalEnabled && filesToUpload.length > 0) {
                    currentConversationId = generateConversationId();
                    if (onSetConversationId) {
                        onSetConversationId(currentConversationId);
                    }
                }

                if (!currentConversationId || !useCaseId) {
                    return;
                }

                setIsUploading(true);

                setUploadingFiles((prev) => {
                    const newSet = new Set(prev);
                    filesToUpload.forEach((file) => newSet.add(file.name));
                    return newSet;
                });

                setUploadErrors((prev) => {
                    const newErrors = { ...prev };
                    filesToUpload.forEach((file) => delete newErrors[file.name]);
                    return newErrors;
                });

                try {
                    let currentMessageId = messageId;
                    if (!currentMessageId) {
                        currentMessageId = generateMessageId();
                        setMessageId(currentMessageId);
                    }

                    const result = await uploadFiles(
                        filesToUpload,
                        currentConversationId,
                        useCaseId,
                        undefined, // onProgress
                        (fileName: string, success: boolean, error?: Error) => {
                            if (!success && error) {
                                setUploadErrors((prev) => ({ ...prev, [fileName]: error }));
                            }
                        },
                        3, // maxRetries
                        currentMessageId
                    );

                    if (result.uploadedFiles.length > 0) {
                        setUploadedFiles((prev) => {
                            const newUploadedFiles = [...prev];
                            result.uploadedFiles.forEach((newFile) => {
                                const existingIndex = newUploadedFiles.findIndex(
                                    (existing) => existing.fileName === newFile.fileName
                                );
                                if (existingIndex !== -1) {
                                    newUploadedFiles[existingIndex] = newFile;
                                } else {
                                    newUploadedFiles.push(newFile);
                                }
                            });
                            return newUploadedFiles;
                        });
                    }

                    setFiles((prev) =>
                        prev.filter((file) => {
                            const wasUploaded = result.uploadedFiles.some(
                                (uploaded) => uploaded.fileName === file.name
                            );
                            const hasValidationError = uploadErrors[file.name];
                            return !wasUploaded || hasValidationError;
                        })
                    );

                    const failedResults = result.results.filter((r) => !r.success);
                    if (failedResults.length > 0) {
                        setUploadErrors((prev) => {
                            const newErrors = { ...prev };
                            failedResults.forEach((fileResult) => {
                                if (fileResult.error) {
                                    newErrors[fileResult.fileName] = fileResult.error;
                                }
                            });
                            return newErrors;
                        });
                    }
                } catch (error) {
                    filesToUpload.forEach((file) => {
                        setUploadErrors((prev) => ({
                            ...prev,
                            [file.name]: new Error('Upload failed')
                        }));
                    });
                } finally {
                    setIsUploading(false);
                    setUploadingFiles((prev) => {
                        const newSet = new Set(prev);
                        filesToUpload.forEach((file) => newSet.delete(file.name));
                        return newSet;
                    });
                }
            },
            [
                conversationId,
                useCaseId,
                isMultimodalEnabled,
                generateConversationId,
                generateMessageId,
                messageId,
                onSetConversationId,
                uploadErrors
            ]
        );

        const handleAddFiles = useCallback(
            async (newFiles: File[]) => {
                if (!newFiles || !Array.isArray(newFiles)) {
                    return;
                }

                const deduplicatedNewFiles = new Map<string, File>();
                newFiles.forEach((file) => deduplicatedNewFiles.set(file.name, file));
                const uniqueFiles = Array.from(deduplicatedNewFiles.values());

                const validFiles: File[] = [];
                const invalidFiles: File[] = [];
                const errors: Record<string, Error> = {};

                uniqueFiles.forEach((file) => {
                    const fileError = validateFile(file);
                    if (fileError) {
                        errors[file.name] = fileError.error;
                        invalidFiles.push(file);
                    } else {
                        validFiles.push(file);
                    }
                });

                if (validFiles.length > 0 || invalidFiles.length > 0) {
                    const updatedFiles = [...files];
                    const updatedUploadedFiles = [...uploadedFiles];
                    const filesToUpload: File[] = [];

                    const filesToDelete: string[] = [];

                    const allNewFiles = [...validFiles, ...invalidFiles];

                    allNewFiles.forEach((newFile) => {
                        const existingFileIndex = updatedFiles.findIndex((file) => file.name === newFile.name);
                        if (existingFileIndex !== -1) {
                            updatedFiles[existingFileIndex] = newFile;
                        } else {
                            updatedFiles.push(newFile);
                        }

                        const existingUploadedIndex = updatedUploadedFiles.findIndex(
                            (file) => file.fileName === newFile.name
                        );
                        if (existingUploadedIndex !== -1) {
                            const fileToDelete = updatedUploadedFiles[existingUploadedIndex];
                            if (fileToDelete.messageId) {
                                filesToDelete.push(fileToDelete.fileName);
                                updatedUploadedFiles.splice(existingUploadedIndex, 1);
                            }
                        }

                        if (validFiles.includes(newFile)) {
                            filesToUpload.push(newFile);
                        }
                    });

                    setFiles(updatedFiles);
                    setUploadedFiles(updatedUploadedFiles);
                    setUploadErrors((prev) => ({ ...prev, ...errors }));

                    if (isMultimodalEnabled && filesToUpload.length > 0) {
                        if (!conversationId && onSetConversationId) {
                            const newConversationId = generateConversationId();
                            onSetConversationId(newConversationId);
                        }
                        if (filesToDelete.length > 0 && conversationId && messageId && useCaseId) {
                            try {
                                await deleteFiles(
                                    filesToDelete,
                                    conversationId,
                                    messageId,
                                    useCaseId,
                                    (fileName: string, success: boolean, error?: Error) => {
                                        if (!success && error) {
                                            console.warn(`Failed to delete existing file ${fileName}:`, error);
                                            setDeleteErrors((prev) => ({ ...prev, [fileName]: error }));
                                        }
                                    },
                                    3 // maxRetries for delete operation
                                );
                            } catch (error) {
                                console.error('Error during file deletion:', error);
                                filesToDelete.forEach((fileName) => {
                                    setDeleteErrors((prev) => ({
                                        ...prev,
                                        [fileName]: new Error('Delete operation failed')
                                    }));
                                });
                            }
                            handleFileUpload(filesToUpload);
                        } else {
                            handleFileUpload(filesToUpload);
                        }
                    }
                }

                if (Object.keys(errors).length > 0) {
                    setUploadErrors((prev) => ({ ...prev, ...errors }));
                }
            },
            [
                files,
                uploadedFiles,
                isMultimodalEnabled,
                handleFileUpload,
                conversationId,
                onSetConversationId,
                messageId,
                useCaseId,
                generateConversationId
            ]
        );

        // Sort by error files first, then normal files
        const orderedFiles = useMemo(() => {
            const allFiles = [
                ...files.map((file, originalIndex) => ({
                    file,
                    originalIndex,
                    isUploaded: false,
                    fileName: file.name
                })),
                ...uploadedFiles.map((file, originalIndex) => ({
                    file,
                    originalIndex,
                    isUploaded: true,
                    fileName: file.fileName
                }))
            ];

            const filesWithErrors = allFiles.filter(
                (item) => uploadErrors[item.fileName] || deleteErrors[item.fileName]
            );
            const filesWithoutErrors = allFiles.filter(
                (item) => !uploadErrors[item.fileName] && !deleteErrors[item.fileName]
            );

            return [...filesWithErrors, ...filesWithoutErrors];
        }, [files, uploadedFiles, uploadErrors, deleteErrors]);

        const handleFileDismiss = useCallback(
            async (fileIndex: number) => {
                const itemToRemove = orderedFiles[fileIndex];
                if (!itemToRemove) return;

                const fileName = itemToRemove.fileName;

                if (!itemToRemove.isUploaded) {
                    const updatedFiles = files.filter((_, index) => index !== itemToRemove.originalIndex);
                    setFiles(updatedFiles);

                    setUploadErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fileName];
                        return newErrors;
                    });
                    setDeleteErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors[fileName];
                        return newErrors;
                    });

                    const allFiles = [...updatedFiles, ...uploadedFiles.map(createFileFromUploaded)];
                    clearObsoleteValidationErrors(allFiles);
                } else {
                    const fileToDelete = uploadedFiles[itemToRemove.originalIndex];

                    if (fileToDelete && conversationId && fileToDelete.messageId && useCaseId) {
                        setIsDeleting(true);

                        setDeleteErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[fileToDelete.fileName];
                            return newErrors;
                        });

                        try {
                            const fileMessageId = fileToDelete.messageId!;
                            const result = await deleteFiles(
                                [fileToDelete.fileName],
                                fileToDelete.conversationId || conversationId,
                                fileMessageId,
                                useCaseId,
                                (fileName: string, success: boolean, error?: Error) => {
                                    if (!success && error) {
                                        setDeleteErrors((prev) => ({ ...prev, [fileName]: error }));
                                    }
                                }
                            );

                            if (result.allSuccessful) {
                                const updatedUploadedFiles = uploadedFiles.filter(
                                    (_, index) => index !== itemToRemove.originalIndex
                                );
                                setUploadedFiles(updatedUploadedFiles);

                                const allFiles = [...files, ...updatedUploadedFiles.map(createFileFromUploaded)];
                                clearObsoleteValidationErrors(allFiles);
                            }
                        } catch (error) {
                            console.error('Failed to delete file:', error);
                            setDeleteErrors((prev) => ({
                                ...prev,
                                [fileToDelete.fileName]: new Error('Delete failed')
                            }));
                        } finally {
                            setIsDeleting(false);
                        }
                    } else {
                        const updatedUploadedFiles = uploadedFiles.filter(
                            (_, index) => index !== itemToRemove.originalIndex
                        );
                        setUploadedFiles(updatedUploadedFiles);

                        const allFiles = [...files, ...updatedUploadedFiles.map(createFileFromUploaded)];
                        clearObsoleteValidationErrors(allFiles);
                    }
                }
            },
            [
                orderedFiles,
                files,
                uploadedFiles,
                conversationId,
                useCaseId,
                clearObsoleteValidationErrors,
                createFileFromUploaded
            ]
        );

        const characterCount = inputText.length;
        const isOverLimit = characterCount > maxInputLength;
        const hasFiles = files.length > 0 || uploadedFiles.length > 0;
        const totalFiles = files.length + uploadedFiles.length;
        const hasFileErrors = Object.keys(uploadErrors).length > 0 || Object.keys(deleteErrors).length > 0;
        const allFiles = [...files, ...uploadedFiles.map(createFileFromUploaded)];
        const fileCountCheck = isFileCountExceeded(allFiles);
        const hasCountError = fileCountCheck.exceeded;

        const sendDisabled =
            !inputText.trim() || isLoading || isUploading || isDeleting || isOverLimit || hasFileErrors || hasCountError;

        const handleSend = useCallback(() => {
            const value = inputText;
            if (!value.trim() || isLoading || isUploading || isDeleting) return;

            if (hasFileErrors || hasCountError) {
                return;
            }

            if (value.length <= maxInputLength) {
                if (isMultimodalEnabled && uploadedFiles.length > 0 && onSendWithFiles) {
                    onSendWithFiles(value, uploadedFiles, messageId);
                } else {
                    onSend(value);
                }
                setInputText('');
                setMessageId('');

                if (isMultimodalEnabled) {
                    setUploadedFiles([]);
                    setFiles([]);
                    setUploadErrors({});
                    setDeleteErrors({});
                }
            }
        }, [
            inputText,
            isLoading,
            isUploading,
            isDeleting,
            onSend,
            onSendWithFiles,
            maxInputLength,
            uploadedFiles,
            isMultimodalEnabled,
            hasFileErrors,
            hasCountError,
            messageId
        ]);

        const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
            }
        };

        const acceptedFormats = [...MULTIMODAL_SUPPORTED_IMAGE_FORMATS, ...MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS]
            .map((format) => `.${format}`)
            .join(',');

        const sendAriaLabel =
            isLoading || isUploading || isDeleting
                ? 'Send message button - suppressed'
                : isOverLimit
                  ? 'Cannot send - message too long'
                  : hasFileErrors
                    ? 'Cannot send - file errors present'
                    : isMultimodalEnabled && hasFiles
                      ? `Send message with ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`
                      : t('composer.send');

        return (
            <div className="mx-auto w-full max-w-3xl px-4 pb-4">
                <div
                    className={cn(
                        'rounded-2xl border bg-card shadow-sm transition-colors focus-within:border-ring',
                        isDraggingOver && 'border-primary bg-accent'
                    )}
                    onDragOver={
                        isMultimodalEnabled
                            ? (event) => {
                                  event.preventDefault();
                                  setIsDraggingOver(true);
                              }
                            : undefined
                    }
                    onDragLeave={isMultimodalEnabled ? () => setIsDraggingOver(false) : undefined}
                    onDrop={
                        isMultimodalEnabled
                            ? (event) => {
                                  event.preventDefault();
                                  setIsDraggingOver(false);
                                  handleAddFiles(Array.from(event.dataTransfer.files));
                              }
                            : undefined
                    }
                >
                    {/* File chips */}
                    {isMultimodalEnabled && orderedFiles.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5 px-3 pt-3" data-testid="file-token-list">
                            {orderedFiles.map((item, index) => {
                                const error = uploadErrors[item.fileName] || deleteErrors[item.fileName];
                                const isFileUploading = uploadingFiles.has(item.fileName) && !error;
                                return (
                                    <li
                                        key={`${item.fileName}-${index}`}
                                        className={cn(
                                            'inline-flex max-w-56 items-center gap-1 rounded-md border px-2 py-1 text-xs',
                                            error
                                                ? 'border-destructive/50 bg-destructive/10 text-destructive'
                                                : 'bg-muted'
                                        )}
                                        title={error ? error.message : item.fileName}
                                    >
                                        {isFileUploading && (
                                            <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
                                        )}
                                        {error && <AlertCircle className="size-3 shrink-0" aria-hidden="true" />}
                                        <span className="truncate">{formatFileNameForDisplay(item.fileName)}</span>
                                        <button
                                            type="button"
                                            aria-label={t('composer.removeFile', { fileName: item.fileName })}
                                            className="rounded-sm p-0.5 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            onClick={() => handleFileDismiss(index)}
                                        >
                                            <X className="size-3" aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <div className="flex items-end gap-1 p-2">
                        {isMultimodalEnabled && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept={acceptedFormats}
                                    className="hidden"
                                    onChange={(event) => {
                                        handleAddFiles(Array.from(event.target.files ?? []));
                                        event.target.value = '';
                                    }}
                                    data-testid="file-input"
                                />
                                <button
                                    type="button"
                                    aria-label={t('composer.attachFiles')}
                                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() => fileInputRef.current?.click()}
                                    data-testid="attach-files-button"
                                >
                                    <Paperclip className="size-4" aria-hidden="true" />
                                </button>
                            </>
                        )}

                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={inputText}
                            autoFocus
                            onChange={(event) => setInputText(event.target.value)}
                            onKeyDown={handleKeyDown}
                            aria-label={
                                isLoading || isUploading || isDeleting
                                    ? 'Chat input text - suppressed'
                                    : 'Chat input text'
                            }
                            placeholder={
                                isMultimodalEnabled && hasFiles
                                    ? 'Ask a question about your files'
                                    : t('composer.placeholder')
                            }
                            className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                            data-testid="chat-input"
                        />

                        <button
                            type="button"
                            aria-label={sendAriaLabel}
                            disabled={sendDisabled}
                            onClick={handleSend}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                            data-testid="send-button"
                        >
                            {isLoading || isUploading || isDeleting ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <SendHorizontal className="size-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Constraint / status text */}
                <p className="mt-1.5 px-1 text-xs text-muted-foreground">
                    <span className={cn(isOverLimit && 'text-destructive')}>
                        {characterCount}/{formatCharacterCount(maxInputLength)} characters.{' '}
                    </span>
                    {hasCountError && <span className="text-destructive">{fileCountCheck.message} </span>}
                    {isMultimodalEnabled && hasFiles && (
                        <span>
                            {uploadedFiles.length > 0 &&
                                `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} uploaded.`}{' '}
                            {isUploading && 'Uploading...'} {isDeleting && 'Deleting...'}{' '}
                        </span>
                    )}
                    {isInternalUser && (
                        <>
                            Use of this service is subject to the{' '}
                            <a
                                href={DOCS_LINKS.GEN_AI_POLICY}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2"
                            >
                                Third Party Generative AI Use Policy
                            </a>
                            .
                        </>
                    )}
                </p>
            </div>
        );
    }
);
export default ChatInput;
