// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
    title?: string;
    message?: string;
    hideTitle?: boolean;
}

const ErrorPage = ({ title = 'Error', message = 'Page not found', hideTitle = false }: ErrorPageProps) => {
    const navigate = useNavigate();
    return (
        <div className="flex h-full items-center justify-center px-4" data-testid="error-page-content-layout">
            <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm" data-testid="error-page-container">
                {!hideTitle && <h1 className="text-xl font-semibold">{title}</h1>}
                <p className="mt-3 text-sm text-muted-foreground" data-testid="error-page-message">
                    {message}
                </p>
                <Button
                    onClick={() => navigate('/app/chat')}
                    className="mt-6"
                    data-testid="error-page-return-button"
                >
                    Return to Chat
                </Button>
            </div>
        </div>
    );
};

export default ErrorPage;
