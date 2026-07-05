// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AutosuggestProps } from '@cloudscape-design/components';

/**
 * Curated catalog of common Bedrock on-demand foundation models with friendly
 * display names. The model-info API only returns a "default" record per
 * provider, so this static list powers the model picker; any newer or custom
 * model id can still be typed in freely (the Autosuggest accepts free text).
 */
export interface CatalogModel {
    /** Bedrock model id, e.g. anthropic.claude-3-5-sonnet-20240620-v1:0 */
    value: string;
    /** Friendly display name shown to admins */
    label: string;
    /** Model vendor used for grouping */
    vendor: string;
    description?: string;
}

export const BEDROCK_MODEL_CATALOG: CatalogModel[] = [
    // Amazon
    { value: 'amazon.nova-micro-v1:0', label: 'Nova Micro', vendor: 'Amazon', description: 'Fastest, lowest cost' },
    { value: 'amazon.nova-lite-v1:0', label: 'Nova Lite', vendor: 'Amazon', description: 'Fast multimodal' },
    { value: 'amazon.nova-pro-v1:0', label: 'Nova Pro', vendor: 'Amazon', description: 'Capable multimodal' },
    { value: 'amazon.titan-text-express-v1', label: 'Titan Text Express', vendor: 'Amazon' },
    // Anthropic
    {
        value: 'anthropic.claude-sonnet-4-20250514-v1:0',
        label: 'Claude Sonnet 4',
        vendor: 'Anthropic',
        description: 'Latest balanced Claude'
    },
    {
        value: 'anthropic.claude-opus-4-20250514-v1:0',
        label: 'Claude Opus 4',
        vendor: 'Anthropic',
        description: 'Most capable Claude'
    },
    {
        value: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
        label: 'Claude 3.7 Sonnet',
        vendor: 'Anthropic'
    },
    {
        value: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        label: 'Claude 3.5 Sonnet v2',
        vendor: 'Anthropic'
    },
    {
        value: 'anthropic.claude-3-5-haiku-20241022-v1:0',
        label: 'Claude 3.5 Haiku',
        vendor: 'Anthropic',
        description: 'Fast and affordable'
    },
    { value: 'anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku', vendor: 'Anthropic' },
    // Meta
    { value: 'meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B Instruct', vendor: 'Meta' },
    { value: 'meta.llama3-1-70b-instruct-v1:0', label: 'Llama 3.1 70B Instruct', vendor: 'Meta' },
    { value: 'meta.llama3-1-8b-instruct-v1:0', label: 'Llama 3.1 8B Instruct', vendor: 'Meta' },
    // Mistral AI
    { value: 'mistral.mistral-large-2402-v1:0', label: 'Mistral Large', vendor: 'Mistral AI' },
    { value: 'mistral.mistral-small-2402-v1:0', label: 'Mistral Small', vendor: 'Mistral AI' },
    // Cohere
    { value: 'cohere.command-r-plus-v1:0', label: 'Command R+', vendor: 'Cohere' },
    { value: 'cohere.command-r-v1:0', label: 'Command R', vendor: 'Cohere' },
    // AI21 Labs
    { value: 'ai21.jamba-1-5-large-v1:0', label: 'Jamba 1.5 Large', vendor: 'AI21 Labs' },
    { value: 'ai21.jamba-1-5-mini-v1:0', label: 'Jamba 1.5 Mini', vendor: 'AI21 Labs' },
    // DeepSeek
    { value: 'deepseek.r1-v1:0', label: 'DeepSeek-R1', vendor: 'DeepSeek' }
];

/**
 * Common cross-region inference profile ids (system-defined). Any other
 * profile id can be typed in freely.
 */
export const BEDROCK_INFERENCE_PROFILE_CATALOG: CatalogModel[] = [
    { value: 'us.anthropic.claude-sonnet-4-20250514-v1:0', label: 'Claude Sonnet 4 (US)', vendor: 'Anthropic' },
    { value: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', label: 'Claude 3.7 Sonnet (US)', vendor: 'Anthropic' },
    { value: 'us.anthropic.claude-3-5-haiku-20241022-v1:0', label: 'Claude 3.5 Haiku (US)', vendor: 'Anthropic' },
    { value: 'us.amazon.nova-pro-v1:0', label: 'Nova Pro (US)', vendor: 'Amazon' },
    { value: 'us.amazon.nova-lite-v1:0', label: 'Nova Lite (US)', vendor: 'Amazon' },
    { value: 'us.amazon.nova-micro-v1:0', label: 'Nova Micro (US)', vendor: 'Amazon' },
    { value: 'us.meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B (US)', vendor: 'Meta' },
    { value: 'eu.anthropic.claude-sonnet-4-20250514-v1:0', label: 'Claude Sonnet 4 (EU)', vendor: 'Anthropic' },
    { value: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0', label: 'Claude 3.7 Sonnet (EU)', vendor: 'Anthropic' },
    { value: 'eu.amazon.nova-pro-v1:0', label: 'Nova Pro (EU)', vendor: 'Amazon' },
    { value: 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet v2 (APAC)', vendor: 'Anthropic' }
];

/**
 * Builds grouped Autosuggest options from a catalog, merging in any extra
 * model ids (e.g. returned by the model-info API) that are not in the
 * curated list.
 */
export const buildModelOptions = (
    catalog: CatalogModel[],
    extraModelIds: string[] = []
): AutosuggestProps.Options => {
    const knownIds = new Set(catalog.map((model) => model.value));
    const groups = new Map<string, CatalogModel[]>();

    catalog.forEach((model) => {
        const group = groups.get(model.vendor) ?? [];
        group.push(model);
        groups.set(model.vendor, group);
    });

    const extras = extraModelIds.filter((id) => id && id !== 'default' && !knownIds.has(id));

    const options: AutosuggestProps.Options = Array.from(groups.entries()).map(([vendor, models]) => ({
        label: vendor,
        options: models.map((model) => ({
            value: model.value,
            label: model.label,
            description: model.description ?? model.value,
            tags: [model.value]
        }))
    }));

    if (extras.length > 0) {
        options.push({
            label: 'Other available models',
            options: extras.map((id) => ({ value: id, label: id }))
        });
    }

    return options;
};

/** Returns the friendly display name for a model id, or the id itself */
export const getModelDisplayName = (modelId: string): string => {
    const match =
        BEDROCK_MODEL_CATALOG.find((model) => model.value === modelId) ??
        BEDROCK_INFERENCE_PROFILE_CATALOG.find((model) => model.value === modelId);
    return match ? match.label : modelId;
};
