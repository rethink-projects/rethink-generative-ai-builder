// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { RuntimeConfig, TextUseCaseConfig, UseCaseType, AgentUseCaseConfig } from '../models';
import {
    DEFAULT_CHAT_INPUT_MAX_LENGTH,
    AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH,
    MAX_PROMPT_TEMPLATE_LENGTH,
    USE_CASE_TYPES,
    MULTIMODAL_SUPPORTED_USE_CASE_TYPES
} from '../utils/constants';

export interface ConfigStoreState {
    runtimeConfig: RuntimeConfig | null;
    setRuntimeConfig: (config: RuntimeConfig) => void;
    setUseCaseConfig: (useCaseConfig: AgentUseCaseConfig | TextUseCaseConfig) => void;
}

/**
 * Holds the runtime configuration fetched at boot (runtimeConfig.json) and
 * enriched with the use case details fetched after sign-in.
 */
export const useConfigStore = create<ConfigStoreState>()((set) => ({
    runtimeConfig: null,
    setRuntimeConfig: (config) => set({ runtimeConfig: { ...config } }),
    setUseCaseConfig: (useCaseConfig) =>
        set((state) => ({
            runtimeConfig: { ...state.runtimeConfig, UseCaseConfig: useCaseConfig } as RuntimeConfig
        }))
}));

/*
 * Selector helpers. They take the runtimeConfig so they can be used both from
 * the hook form (`useConfigStore(selectUseCaseType)`) and imperatively with
 * `useConfigStore.getState()`.
 */

export const selectDefaultPromptTemplate = (state: Pick<ConfigStoreState, 'runtimeConfig'>): string => {
    const useCaseConfig = state.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.PromptParams?.PromptTemplate || '';
};

export const selectUseCaseType = (state: Pick<ConfigStoreState, 'runtimeConfig'>): UseCaseType =>
    (state.runtimeConfig?.UseCaseConfig?.UseCaseType as UseCaseType) || (USE_CASE_TYPES.TEXT as UseCaseType);

export const getPromptTemplateLength = (state: Pick<ConfigStoreState, 'runtimeConfig'>): number => {
    const useCaseConfig = state.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.PromptParams?.MaxPromptTemplateLength ?? MAX_PROMPT_TEMPLATE_LENGTH;
};

export const getMaxInputTextLength = (state: Pick<ConfigStoreState, 'runtimeConfig'>): number => {
    const useCaseConfig = state.runtimeConfig?.UseCaseConfig;
    if (useCaseConfig?.UseCaseType === USE_CASE_TYPES.AGENT) {
        return DEFAULT_CHAT_INPUT_MAX_LENGTH;
    } else if (
        useCaseConfig?.UseCaseType === USE_CASE_TYPES.AGENT_BUILDER ||
        useCaseConfig?.UseCaseType === USE_CASE_TYPES.WORKFLOW
    ) {
        return AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH;
    }
    const textConfig = useCaseConfig as TextUseCaseConfig;
    return textConfig?.LlmParams?.PromptParams?.MaxInputTextLength ?? DEFAULT_CHAT_INPUT_MAX_LENGTH;
};

export const getRagEnabledState = (state: Pick<ConfigStoreState, 'runtimeConfig'>): boolean => {
    const useCaseConfig = state.runtimeConfig?.UseCaseConfig as TextUseCaseConfig;
    return useCaseConfig?.LlmParams?.RAGEnabled;
};

export const getUseCaseId = (state: Pick<ConfigStoreState, 'runtimeConfig'>): string => {
    return state.runtimeConfig?.UseCaseId || '';
};

export const getUseCaseConfigKey = (state: Pick<ConfigStoreState, 'runtimeConfig'>): string => {
    return state.runtimeConfig?.UseCaseConfigKey || '';
};

export const getUseCaseConfig = (
    state: Pick<ConfigStoreState, 'runtimeConfig'>
): AgentUseCaseConfig | TextUseCaseConfig | undefined => {
    return state.runtimeConfig?.UseCaseConfig;
};

export const getFeedbackEnabledState = (state: Pick<ConfigStoreState, 'runtimeConfig'>): boolean => {
    return state.runtimeConfig?.UseCaseConfig?.FeedbackParams?.FeedbackEnabled ?? false;
};

export const getModelProviderName = (state: Pick<ConfigStoreState, 'runtimeConfig'>): string => {
    return (state.runtimeConfig?.UseCaseConfig as TextUseCaseConfig)?.ModelProviderName ?? '';
};

const isMultimodalSupportedUseCase = (
    useCaseType: string
): useCaseType is (typeof MULTIMODAL_SUPPORTED_USE_CASE_TYPES)[number] => {
    return (MULTIMODAL_SUPPORTED_USE_CASE_TYPES as readonly string[]).includes(useCaseType);
};

export const getMultimodalEnabledState = (state: Pick<ConfigStoreState, 'runtimeConfig'>): boolean => {
    const useCaseConfig = state.runtimeConfig?.UseCaseConfig;

    if (!useCaseConfig || typeof useCaseConfig !== 'object' || typeof (useCaseConfig as any).UseCaseType !== 'string') {
        return false;
    }

    if (!isMultimodalSupportedUseCase(useCaseConfig.UseCaseType)) {
        return false;
    }

    return (useCaseConfig as any).LlmParams?.MultimodalParams?.MultimodalEnabled === true;
};
