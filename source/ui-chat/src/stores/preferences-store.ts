// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RuntimeConfig, TextUseCaseConfig } from '../models';
import { USE_CASE_TYPES_ROUTE } from '../utils/constants';

export interface PreferencesState {
    sidebarOpen: boolean;
    darkMode: boolean;
    promptTemplate: string;
    setSidebarOpen: (open: boolean) => void;
    setDarkMode: (dark: boolean) => void;
    setPromptTemplate: (template: string) => void;
    clearPromptTemplate: () => void;
    initializeFromRuntime: (config: RuntimeConfig) => void;
}

const prefersDark = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

/**
 * Legacy preferences were stored under 'userPreferences' by the previous Redux
 * implementation; read them once so upgrading users keep their choices.
 */
const loadLegacyPreferences = (): { darkMode?: boolean; promptTemplate?: string } => {
    try {
        const stored = localStorage.getItem('userPreferences');
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const legacy = loadLegacyPreferences();

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set, get) => ({
            sidebarOpen: true,
            darkMode: legacy.darkMode ?? prefersDark(),
            promptTemplate: legacy.promptTemplate ?? '',
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            setDarkMode: (dark) => set({ darkMode: dark }),
            setPromptTemplate: (template) => set({ promptTemplate: template }),
            clearPromptTemplate: () => set({ promptTemplate: '' }),
            initializeFromRuntime: (config) => {
                const isTextUseCase = config.SocketRoutes?.includes(USE_CASE_TYPES_ROUTE.TEXT);
                const useCaseConfig = config.UseCaseConfig as TextUseCaseConfig;

                if (isTextUseCase && useCaseConfig?.LlmParams?.PromptParams) {
                    // Only set the default when the user has not customized it
                    if (!get().promptTemplate) {
                        set({ promptTemplate: useCaseConfig.LlmParams.PromptParams.PromptTemplate ?? '' });
                    }
                } else {
                    set({ promptTemplate: '' });
                }
            }
        }),
        {
            name: 'gaab-chat-preferences',
            partialize: (state) => ({
                sidebarOpen: state.sidebarOpen,
                darkMode: state.darkMode,
                promptTemplate: state.promptTemplate
            })
        }
    )
);

/** Applies the current theme preference by toggling the `dark` class on <html> */
export const applyThemeClass = (darkMode: boolean) => {
    document.documentElement.classList.toggle('dark', darkMode);
};
