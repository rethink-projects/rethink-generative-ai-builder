// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Moon, Sun } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferences-store';
import {
    useConfigStore,
    getModelProviderName,
    getPromptTemplateLength,
    getRagEnabledState,
    selectDefaultPromptTemplate
} from '@/stores/config-store';
import { validatePromptTemplate } from '@/utils/validation';
import { MODEL_PROVIDER } from '@/utils/constants';
import i18n from '@/i18n/i18n';

const LANGUAGES = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' }
];

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Novice-friendly settings: theme and language up front, the system prompt
 * editor tucked away in a collapsed "advanced" section with the original
 * validation rules preserved.
 */
export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { t } = useTranslation();

    const darkMode = usePreferencesStore((state) => state.darkMode);
    const setDarkMode = usePreferencesStore((state) => state.setDarkMode);
    const savedPromptTemplate = usePreferencesStore((state) => state.promptTemplate);
    const setPromptTemplate = usePreferencesStore((state) => state.setPromptTemplate);

    const defaultPromptTemplate = useConfigStore(selectDefaultPromptTemplate);
    const isRagEnabled = useConfigStore(getRagEnabledState) ?? false;
    const maxPromptLength = useConfigStore(getPromptTemplateLength);
    const modelProvider = useConfigStore(getModelProviderName);

    const [promptValue, setPromptValue] = useState('');
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [language, setLanguage] = useState(i18n.resolvedLanguage ?? 'en');

    useEffect(() => {
        const initialPrompt = savedPromptTemplate || defaultPromptTemplate;
        setPromptValue(initialPrompt);

        const { error } = validatePromptTemplate({
            promptTemplate: initialPrompt,
            isRagEnabled,
            modelProvider
        });
        setError(error);
    }, [savedPromptTemplate, defaultPromptTemplate, isRagEnabled, modelProvider, open]);

    const handlePromptChange = (value: string) => {
        setPromptValue(value);
        const { error } = validatePromptTemplate({
            promptTemplate: value,
            isRagEnabled,
            maxPromptTemplateLength: maxPromptLength,
            modelProvider
        });
        setError(error);
        setSaved(false);
    };

    const handleSave = () => {
        const { isValid, error } = validatePromptTemplate({
            promptTemplate: promptValue,
            isRagEnabled,
            modelProvider
        });

        if (isValid) {
            setPromptTemplate(promptValue);
            setError('');
            setSaved(true);
        } else {
            setError(error);
        }
    };

    const handleReset = () => {
        if (defaultPromptTemplate) {
            handlePromptChange(defaultPromptTemplate);
            setPromptTemplate(defaultPromptTemplate);
            setSaved(true);
        }
    };

    const handleLanguageChange = (value: string) => {
        setLanguage(value);
        i18n.changeLanguage(value);
    };

    const promptConstraint = (() => {
        if (modelProvider === MODEL_PROVIDER.SAGEMAKER) {
            return isRagEnabled
                ? 'Must include {context}, {input}, and {history} exactly once.'
                : 'Must include both {input} and {history} exactly once.';
        }
        return isRagEnabled ? 'Must include {context} exactly once.' : '';
    })();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent closeLabel={t('settings.title')} className="max-h-[85vh] overflow-y-auto" data-testid="settings-dialog">
                <DialogTitle>{t('settings.title')}</DialogTitle>
                <DialogDescription className="sr-only">{t('settings.title')}</DialogDescription>

                <div className="mt-4 space-y-5">
                    {/* Theme */}
                    <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium" htmlFor="theme-toggle-group">
                            {t('settings.theme')}
                        </label>
                        <div id="theme-toggle-group" className="flex gap-1 rounded-md border p-0.5" role="group">
                            <Button
                                variant={darkMode ? 'ghost' : 'secondary'}
                                size="sm"
                                onClick={() => setDarkMode(false)}
                                aria-pressed={!darkMode}
                            >
                                <Sun /> {t('settings.themeLight')}
                            </Button>
                            <Button
                                variant={darkMode ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setDarkMode(true)}
                                aria-pressed={darkMode}
                            >
                                <Moon /> {t('settings.themeDark')}
                            </Button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between gap-4">
                        <label className="text-sm font-medium">{t('settings.language')}</label>
                        <div className="w-44">
                            <Select
                                items={LANGUAGES}
                                value={language}
                                onValueChange={(value) => handleLanguageChange(value as string)}
                            >
                                <SelectTrigger data-testid="language-select" />
                                <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                        <SelectItem key={lang.value} value={lang.value}>
                                            {lang.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Advanced: system prompt */}
                    {defaultPromptTemplate && (
                        <Collapsible>
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md py-2 text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <ChevronRight className="size-4 transition-transform group-data-[panel-open]:rotate-90" />
                                {t('settings.advanced')}
                            </CollapsibleTrigger>
                            <CollapsiblePanel className="space-y-3 pt-2">
                                <p className="text-sm text-muted-foreground">{t('settings.advancedDescription')}</p>
                                <Textarea
                                    value={promptValue}
                                    onChange={(event) => handlePromptChange(event.target.value)}
                                    rows={10}
                                    spellCheck
                                    aria-label={t('settings.promptTemplateLabel')}
                                    aria-invalid={!!error}
                                    data-testid="prompt-template-textarea"
                                />
                                {promptConstraint && (
                                    <p className="text-xs text-muted-foreground">{promptConstraint}</p>
                                )}
                                {error && (
                                    <p role="alert" className="text-sm text-destructive" data-testid="prompt-error">
                                        {error}
                                    </p>
                                )}
                                {saved && (
                                    <p role="status" className="text-sm text-primary" data-testid="prompt-saved">
                                        {t('settings.promptSaved')}
                                    </p>
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        disabled={promptValue === defaultPromptTemplate}
                                        data-testid="reset-prompt-btn"
                                    >
                                        {t('settings.reset')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={!!error || promptValue === savedPromptTemplate}
                                        data-testid="save-prompt-btn"
                                    >
                                        {t('settings.save')}
                                    </Button>
                                </div>
                            </CollapsiblePanel>
                        </Collapsible>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
