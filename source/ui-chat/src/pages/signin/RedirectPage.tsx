// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { useUser } from '../../contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { getAppNestedPath, ROUTES } from '../../utils/constants';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const RedirectPage = () => {
    const { isAuthenticated, isLoading, onSignIn } = useUser();

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading...
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={getAppNestedPath(`${ROUTES.APP.CHAT}`)} replace />;
    }

    return (
        <div className="flex h-full items-center justify-center px-4" data-testid="redirect-page-content">
            <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
                <span
                    aria-hidden="true"
                    className="mx-auto flex size-10 items-center justify-center rounded-md bg-brand-lime text-lg font-bold text-[#1a2405]"
                >
                    ↗
                </span>
                <h1 className="mt-4 text-xl font-semibold" data-testid="redirect-page-content-layout-header">
                    Welcome!
                </h1>
                <h2 className="mt-1 text-sm text-muted-foreground" data-testid="auth-required-container-header">
                    Authentication Required
                </h2>
                <p className="mt-4 text-sm">Please sign in to access the application</p>
                <Button onClick={onSignIn} className="mt-4 w-full" data-testid="sign-in-button">
                    Sign In
                </Button>
            </div>
        </div>
    );
};

export default RedirectPage;
