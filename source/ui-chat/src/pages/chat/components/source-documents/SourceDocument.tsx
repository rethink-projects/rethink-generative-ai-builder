// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from 'react-i18next';
import { ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { SourceDocument } from '../../../../models';

interface SourceDocumentsSectionProps {
    sourceDocuments?: SourceDocument[];
}

/**
 * Collapsed list of RAG source documents with excerpt and link per document.
 */
export const SourceDocumentsSection: React.FC<SourceDocumentsSectionProps> = ({ sourceDocuments }) => {
    const { t } = useTranslation();

    if (!sourceDocuments || sourceDocuments.length === 0) {
        return null;
    }

    return (
        <Collapsible className="mt-2" data-testid="source-doc-expandable-section">
            <CollapsibleTrigger className="group flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]:rotate-90" />
                {t('messages.sources')} ({sourceDocuments.length})
            </CollapsibleTrigger>
            <CollapsiblePanel>
                <ul className="mt-2 space-y-2">
                    {sourceDocuments.map((doc, index) => (
                        <li
                            key={`${doc.location}-${index}`}
                            className="rounded-md border bg-muted/40 p-2 text-xs"
                            data-testid="source-doc-item"
                        >
                            <div className="flex items-center gap-1.5 font-medium">
                                <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="truncate">{doc.document_title ?? `Document ${index + 1}`}</span>
                                {doc.location && (
                                    <a
                                        href={doc.location}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                        <ExternalLink className="size-3" aria-hidden="true" />
                                        <span className="sr-only">{doc.document_title ?? `Document ${index + 1}`}</span>
                                    </a>
                                )}
                            </div>
                            {doc.excerpt && <p className="mt-1 line-clamp-3 text-muted-foreground">{doc.excerpt}</p>}
                        </li>
                    ))}
                </ul>
            </CollapsiblePanel>
        </Collapsible>
    );
};
