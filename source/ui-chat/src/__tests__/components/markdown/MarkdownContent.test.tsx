// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownContent from '@/components/markdown/MarkdownContent';

describe('MarkdownContent', () => {
    test('renders plain text and markdown formatting', () => {
        render(<MarkdownContent content={'Some **bold** text'} />);

        expect(screen.getByText('bold')).toBeInTheDocument();
        expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    test('renders inline code', () => {
        render(<MarkdownContent content={'Use `npm start` to run'} />);

        expect(screen.getByTestId('inline-code')).toHaveTextContent('npm start');
    });

    test('renders fenced code blocks with a copy button', () => {
        render(<MarkdownContent content={'```js\nconst a = 1;\nconst b = 2;\n```'} />);

        expect(screen.getByTestId('code-block')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    });

    test('renders tables inside a scroll container', () => {
        const table = '| a | b |\n| - | - |\n| 1 | 2 |';
        const { container } = render(<MarkdownContent content={table} />);

        expect(container.querySelector('.markdown-table-container')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('external links open in a new tab with safe rel attributes', () => {
        render(<MarkdownContent content={'[example](https://example.com)'} />);

        const link = screen.getByRole('link', { name: 'example' });
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    test('strips <thinking> tags from the content', () => {
        render(<MarkdownContent content={'<thinking>internal reasoning</thinking>Final answer'} />);

        expect(screen.queryByText(/internal reasoning/)).not.toBeInTheDocument();
        expect(screen.getByText('Final answer')).toBeInTheDocument();
    });
});
