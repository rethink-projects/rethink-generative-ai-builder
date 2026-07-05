// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../AppRoutes.tsx';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { UserContext } from '../../contexts/UserContext.tsx';
import { AuthUser } from '@aws-amplify/auth';
import { applyStateToStores, createTestQueryClient, RootState } from './test-redux-store-factory';

/*
 * Render a page within the context of a Router, the Zustand stores and a
 * TanStack QueryClient. `preloadedState` accepts the legacy slice-shaped
 * object ({ config, preferences, notifications }) and seeds the stores.
 */
export function renderAppContent(props?: { preloadedState?: Partial<RootState>; initialRoute: string }) {
    if (props?.preloadedState) {
        applyStateToStores(props.preloadedState);
    }
    const queryClient = createTestQueryClient();

    const renderResult = render(
        <MemoryRouter initialEntries={[props?.initialRoute ?? '/']}>
            <QueryClientProvider client={queryClient}>
                <AppRoutes></AppRoutes>
            </QueryClientProvider>
        </MemoryRouter>
    );
    return {
        renderResult,
        queryClient
    };
}

interface WrapperOptions {
    userId?: string;
    userName?: string;
    userEmail?: string;
    isAuthenticated?: boolean;
    isLoading?: boolean;
    onSignIn?: () => Promise<void>;
    onSignOut?: () => Promise<void>;
    getAccessToken?: () => Promise<string>;
}

/**
 * Creates a wrapper component with UserContext (and a QueryClient) for testing
 */
export const createTestWrapper = (options: WrapperOptions = {}) => {
    const {
        userId = 'test-user-id',
        userName = 'Test User',
        userEmail = 'test@example.com',
        isAuthenticated = true,
        isLoading = false,
        onSignIn = async () => {},
        onSignOut = async () => {},
        getAccessToken = async () => 'mock-token'
    } = options;

    const mockUserContext = {
        isAuthenticated,
        isLoading,
        userName,
        userEmail,
        authUser: {
            userId,
            username: userName
        } as AuthUser,
        userId,
        onSignIn,
        onSignOut,
        getAccessToken
    };

    const queryClient = createTestQueryClient();

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <UserContext.Provider value={mockUserContext}>{children}</UserContext.Provider>
        </QueryClientProvider>
    );
};
