// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceDocumentsSection } from '@pages/chat/components/source-documents/SourceDocument';
import { SourceDocument } from '@/models';

const mockSourceDocuments: SourceDocument[] = [
    {
        document_id: 'doc-1',
        document_title: 'User Guide - Section 1',
        excerpt: 'This is an example excerpt.',
        location: 'https://docs.example.com/section1.html',
        score: 'MEDIUM'
    } as any,
    {
        document_id: 'doc-2',
        document_title: undefined,
        excerpt: 'Another excerpt.',
        location: 'https://docs.example.com/section2.html',
        score: 'HIGH'
    } as any
];

describe('SourceDocumentsSection', () => {
    test('renders nothing when there are no documents', () => {
        const { container } = render(<SourceDocumentsSection sourceDocuments={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders a collapsed section with the document count', () => {
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);

        expect(screen.getByTestId('source-doc-expandable-section')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveTextContent('(2)');
    });

    test('expanding shows document titles, excerpts and links', () => {
        render(<SourceDocumentsSection sourceDocuments={mockSourceDocuments} />);

        fireEvent.click(screen.getByRole('button'));

        const items = screen.getAllByTestId('source-doc-item');
        expect(items).toHaveLength(2);
        expect(screen.getAllByText('User Guide - Section 1').length).toBeGreaterThanOrEqual(1);
        // Untitled documents fall back to an index-based label
        expect(screen.getAllByText('Document 2').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('This is an example excerpt.')).toBeInTheDocument();

        const links = items[0].querySelectorAll('a');
        expect(links[0]).toHaveAttribute('href', 'https://docs.example.com/section1.html');
        expect(links[0]).toHaveAttribute('target', '_blank');
    });
});
