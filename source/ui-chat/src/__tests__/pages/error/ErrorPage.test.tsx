// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorPage from '../../../pages/error/ErrorPage';

// Mock react-router-dom properly
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
    };
});

const mockNavigate = vi.fn();

describe('ErrorPage', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders with default props', () => {
        render(<ErrorPage />);

        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByTestId('error-page-message')).toHaveTextContent('Page not found');
        expect(screen.getByTestId('error-page-return-button')).toBeInTheDocument();
    });

    it('renders with custom title and message', () => {
        render(<ErrorPage title="Custom Title" message="Custom message" />);

        expect(screen.getByText('Custom Title')).toBeInTheDocument();
        expect(screen.getByTestId('error-page-message')).toHaveTextContent('Custom message');
    });

    it('renders without title when hideTitle is true', () => {
        render(<ErrorPage hideTitle message="No title here" />);

        expect(screen.queryByText('Error')).not.toBeInTheDocument();
        expect(screen.getByTestId('error-page-message')).toHaveTextContent('No title here');
    });

    it('navigates back to chat when clicking the return button', () => {
        render(<ErrorPage />);

        fireEvent.click(screen.getByTestId('error-page-return-button'));
        expect(mockNavigate).toHaveBeenCalledWith('/app/chat');
    });
});
