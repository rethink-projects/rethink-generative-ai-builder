// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useConfigStore } from '@/stores/config-store';

interface WelcomeStateProps {
    onSuggestedPrompt: (prompt: string) => void;
    disabled?: boolean;
}

/**
 * Friendly empty state shown before the first message: assistant name, a short
 * explanation, and clickable starter prompts.
 */
export function WelcomeState({ onSuggestedPrompt, disabled = false }: WelcomeStateProps) {
    const { t } = useTranslation();
    const useCaseName = useConfigStore((state) => state.runtimeConfig?.UseCaseConfig?.UseCaseName);

    const suggestions = [
        t('welcome.suggestion1'),
        t('welcome.suggestion2'),
        t('welcome.suggestion3'),
        t('welcome.suggestion4')
    ];

    return (
        <div className="flex h-full flex-col items-center justify-center px-4 py-8" data-testid="welcome-state">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-lime text-[#1a2405]">
                <Sparkles className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-center text-2xl font-semibold">{t('welcome.title')}</h2>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                {useCaseName ? `${useCaseName} — ` : ''}
                {t('welcome.subtitle')}
            </p>

            <div className="mt-8 w-full max-w-lg">
                <h3 className="sr-only">{t('welcome.suggestionsLabel')}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((suggestion) => (
                        <li key={suggestion}>
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onSuggestedPrompt(suggestion)}
                                className="w-full rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                data-testid="suggested-prompt"
                            >
                                {suggestion}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
