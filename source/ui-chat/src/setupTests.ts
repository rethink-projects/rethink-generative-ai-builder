// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import '@testing-library/jest-dom';
import { MOCK_SERVER_URL, server } from './__tests__/server';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { Amplify } from 'aws-amplify';
import nodeFetch, { Request, Response } from 'node-fetch';

process.env.TZ = 'UTC'; // fix environment timezone for tests to UTC

// Provide localStorage mock for test environments where jsdom doesn't expose it as a function
if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            Object.keys(store).forEach((key) => delete store[key]);
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null
    };
}

// avoid a problem of RTK Query in vitest, see https://github.com/reduxjs/redux-toolkit/issues/3254
Object.assign(global, { fetch: nodeFetch, Request, Response });

beforeAll(() => {
    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId: '',
                userPoolClientId: ''
            }
        },
        API: {
            REST: {
                'solution-api': {
                    endpoint: MOCK_SERVER_URL
                }
            }
        }
    });
    server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());
afterEach(async () => {
    server.resetHandlers();

    // Zustand stores are module-level singletons: reset them between tests
    const { useChatStore } = await import('./stores/chat-store');
    const { useConfigStore } = await import('./stores/config-store');
    const { usePreferencesStore } = await import('./stores/preferences-store');
    const { useNotificationsStore } = await import('./stores/notifications-store');
    useChatStore.setState(useChatStore.getInitialState(), true);
    useConfigStore.setState(useConfigStore.getInitialState(), true);
    usePreferencesStore.setState(usePreferencesStore.getInitialState(), true);
    useNotificationsStore.setState(useNotificationsStore.getInitialState(), true);
    localStorage.clear();
});
