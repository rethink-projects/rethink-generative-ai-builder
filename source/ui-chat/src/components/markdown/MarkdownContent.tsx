// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { memo, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Check, Copy } from 'lucide-react';
import './MarkdownContent.scss';

/**
 * Fenced code block with a copy-to-clipboard action.
 */
const CodeBlock = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    };

    return (
        <div className="markdown-code-block group relative" data-testid="code-block">
            <button
                type="button"
                aria-label={copied ? 'Code copied' : 'Copy code'}
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded-md border bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
            >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
};

/**
 * Custom components for rendering different Markdown elements
 */
const MARKDOWN_COMPONENTS: Components = {
    /**
     * Renders code blocks (with copy action) and inline code
     */
    code: ({ children }) => {
        // remove trailing new line char
        const code = String(children).replace(/\n$/, '');

        const hasMultipleLines = code.includes('\n');
        if (!hasMultipleLines) return <code data-testid="inline-code">{children}</code>;

        return <CodeBlock code={code} />;
    },
    p({ children }) {
        return <p>{children}</p>;
    },
    table({ children }) {
        return (
            <div className="markdown-table-container">
                <table className="markdown-table">{children}</table>
            </div>
        );
    },
    th({ children }) {
        return <th className="markdown-th">{children}</th>;
    },
    td({ children }) {
        return <td className="markdown-td">{children}</td>;
    },
    /**
     * External links open in a new tab with safe rel attributes
     */
    a({ href, children, ...props }) {
        const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
        return (
            <a
                href={href}
                {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
                className="text-primary underline underline-offset-2"
                {...props}
            >
                {children}
            </a>
        );
    }
};

interface MarkdownContentProps {
    content: string;
}

const stripThinkingTags = (text: string): string => {
    // Remove thinking tags and everything between them (case-insensitive, global, multiline)
    return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
};

/**
 * Component that renders Markdown content with custom styling and components
 * Supports GitHub Flavored Markdown and math expressions
 * Memoized to prevent unnecessary re-renders
 */
const MarkdownContent = memo(({ content }: MarkdownContentProps) => {
    const cleanedContent = stripThinkingTags(content);

    return (
        <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} components={MARKDOWN_COMPONENTS}>
                {cleanedContent}
            </ReactMarkdown>
        </div>
    );
});

MarkdownContent.displayName = 'MarkdownContent';

export default MarkdownContent;
