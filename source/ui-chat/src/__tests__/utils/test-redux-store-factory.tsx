// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Test-state factories. Historically these seeded a Redux store; the app now
 * uses Zustand stores + TanStack Query, so the factories keep their public API
 * (createState/renderWithStore/renderHookWithStore and the per-slice
 * factories) but write into the Zustand stores and wrap renders in a
 * QueryClientProvider.
 */

import { render, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useConfigStore } from '../../stores/config-store';
import { usePreferencesStore } from '../../stores/preferences-store';
import { useNotificationsStore, NotificationPayload } from '../../stores/notifications-store';

import { DEFAULT_AGENT_CONFIG, DEFAULT_TEXT_CONFIG } from './test-configs';
import { RuntimeConfig } from '../../models';

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Legacy slice-shaped state, still used by tests via createState overrides */
export interface ConfigState {
    runtimeConfig: RuntimeConfig | null;
    loading?: boolean;
    error?: string | null;
}

export interface PreferencesState {
    sidebarOpen?: boolean;
    darkMode?: boolean;
    promptTemplate?: string;
    // legacy fields kept so old overrides don't break type-wise
    navigationSideBarOpen?: boolean;
    settingsPanelOpen?: boolean;
    settingsPanelPosition?: 'side' | 'bottom';
}

export interface NotificationState {
    notifications: NotificationPayload[];
}

export interface RootState {
    config: ConfigState;
    preferences: PreferencesState;
    notifications: NotificationState;
}

// Base factory interface
interface MockStateFactory<T> {
    create(overrides?: Partial<T>): T;
    createPartial(overrides?: Partial<T>): Partial<T>;
}

// Config State Factory
export class ConfigStateFactory implements MockStateFactory<ConfigState> {
    private getDefaultRuntimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
        const useCaseType = overrides?.UseCaseConfig?.UseCaseType || 'Text';
        const baseConfig = useCaseType === 'Agent' ? DEFAULT_AGENT_CONFIG : DEFAULT_TEXT_CONFIG;

        return {
            ...baseConfig,
            ...overrides,
            UseCaseConfig: {
                ...baseConfig.UseCaseConfig,
                ...(overrides?.UseCaseConfig || {})
            }
        } as RuntimeConfig;
    }

    private defaultState: ConfigState = {
        runtimeConfig: { ...DEFAULT_TEXT_CONFIG } as RuntimeConfig,
        loading: false,
        error: null
    };

    create(overrides: Partial<ConfigState> = {}): ConfigState {
        if (overrides.runtimeConfig) {
            return {
                ...this.defaultState,
                ...overrides,
                runtimeConfig: this.getDefaultRuntimeConfig(overrides.runtimeConfig)
            };
        }

        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<ConfigState> = {}): Partial<ConfigState> {
        return this.create(overrides);
    }

    createRuntimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
        return this.getDefaultRuntimeConfig(overrides);
    }
}

// Preferences State Factory
export class PreferencesStateFactory implements MockStateFactory<PreferencesState> {
    private defaultState: PreferencesState = {
        sidebarOpen: true,
        darkMode: false,
        promptTemplate: ''
    };

    create(overrides: Partial<PreferencesState> = {}): PreferencesState {
        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<PreferencesState> = {}): Partial<PreferencesState> {
        return this.create(overrides);
    }
}

export class NotificationsStateFactory implements MockStateFactory<NotificationState> {
    private defaultState: NotificationState = {
        notifications: []
    };

    create(overrides: Partial<NotificationState> = {}): NotificationState {
        return {
            ...this.defaultState,
            ...overrides
        };
    }

    createPartial(overrides: Partial<NotificationState> = {}): Partial<NotificationState> {
        return this.create(overrides);
    }
}

/** Applies a slice-shaped state object onto the Zustand stores */
export const applyStateToStores = (state: Partial<RootState>) => {
    if (state.config?.runtimeConfig !== undefined) {
        useConfigStore.setState({ runtimeConfig: state.config.runtimeConfig });
    }
    if (state.preferences) {
        usePreferencesStore.setState({
            ...(state.preferences.sidebarOpen !== undefined && { sidebarOpen: state.preferences.sidebarOpen }),
            ...(state.preferences.darkMode !== undefined && { darkMode: state.preferences.darkMode }),
            ...(state.preferences.promptTemplate !== undefined && {
                promptTemplate: state.preferences.promptTemplate
            })
        });
    }
    if (state.notifications) {
        useNotificationsStore.setState({ notifications: state.notifications.notifications });
    }
};

export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, refetchOnWindowFocus: false }
        }
    });

// Store Factory that combines all slice factories
export class TestStoreFactory {
    private configFactory: ConfigStateFactory;
    private preferencesFactory: PreferencesStateFactory;
    private notificationsFactory: NotificationsStateFactory;

    constructor() {
        this.configFactory = new ConfigStateFactory();
        this.preferencesFactory = new PreferencesStateFactory();
        this.notificationsFactory = new NotificationsStateFactory();
    }

    createState(overrides: Partial<RootState> = {}): Partial<RootState> {
        return {
            config: this.configFactory.create(overrides.config),
            preferences: this.preferencesFactory.create(overrides.preferences),
            notifications: this.notificationsFactory.create(overrides.notifications),
            ...overrides
        };
    }

    /** Seeds the Zustand stores and returns accessors mimicking the old store API */
    createStore(overrides: Partial<RootState> = {}) {
        const state = this.createState(overrides);
        applyStateToStores(state);
        return {
            getState: (): RootState => ({
                config: { runtimeConfig: useConfigStore.getState().runtimeConfig },
                preferences: usePreferencesStore.getState(),
                notifications: { notifications: useNotificationsStore.getState().notifications }
            })
        };
    }

    renderWithStore<T extends React.ReactElement>(ui: T, stateOverrides: DeepPartial<RootState> = {}) {
        const store = this.createStore(stateOverrides as Partial<RootState>);
        const queryClient = createTestQueryClient();

        const Wrapper = ({ children }: PropsWithChildren<{}>) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        return {
            store,
            ...render(ui, { wrapper: Wrapper })
        };
    }

    renderHookWithStore(hook: any, stateOverrides: Partial<RootState> = {}) {
        const store = this.createStore(stateOverrides);
        const queryClient = createTestQueryClient();

        const wrapper = ({ children }: PropsWithChildren<{}>) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        return {
            store,
            ...renderHook(hook, { wrapper })
        };
    }
}

// Export a singleton instance
export const testStoreFactory = new TestStoreFactory();

// Export factory instances for individual use
export const configFactory = new ConfigStateFactory();
export const preferencesFactory = new PreferencesStateFactory();
export const notificationsFactory = new NotificationsStateFactory();
