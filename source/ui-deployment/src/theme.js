// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Mode, applyMode } from '@cloudscape-design/global-styles';
import { applyTheme } from '@cloudscape-design/components/theming';

const PREFERENCES_STORAGE_KEY = 'gaab-admin-preferences';

/**
 * Rethink brand theme for Cloudscape: dark-lime primary actions on light
 * surfaces and bright lime on dark surfaces (lime on white fails WCAG
 * contrast, so light mode uses a darkened green).
 */
const RETHINK_THEME = {
    theme: {
        tokens: {
            colorBackgroundButtonPrimaryDefault: { light: '#3f6212', dark: '#c6f542' },
            colorBackgroundButtonPrimaryHover: { light: '#365314', dark: '#d9f99d' },
            colorBackgroundButtonPrimaryActive: { light: '#2b4310', dark: '#bef264' },
            colorTextButtonPrimaryDefault: { light: '#f7fee7', dark: '#1a2405' },
            colorTextButtonPrimaryHover: { light: '#f7fee7', dark: '#1a2405' },
            colorTextButtonPrimaryActive: { light: '#f7fee7', dark: '#1a2405' },
            colorTextAccent: { light: '#3f6212', dark: '#c6f542' },
            colorTextLinkDefault: { light: '#3f6212', dark: '#c6f542' },
            colorTextLinkHover: { light: '#365314', dark: '#d9f99d' },
            colorBackgroundControlChecked: { light: '#3f6212', dark: '#c6f542' },
            colorBorderItemSelected: { light: '#3f6212', dark: '#c6f542' },
            colorBackgroundItemSelected: { light: '#ecfccb', dark: '#2a2f1c' }
        }
    }
};

export const loadDarkModePreference = () => {
    try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored).darkMode === true;
        }
    } catch {
        // fall through to system preference
    }
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
};

export const persistDarkModePreference = (darkMode) => {
    try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ darkMode }));
    } catch {
        // best effort only
    }
};

/** Applies the Cloudscape color mode and mirrors it as a `dark` class for Tailwind */
export const applyColorMode = (darkMode) => {
    applyMode(darkMode ? Mode.Dark : Mode.Light);
    document.documentElement.classList.toggle('dark', darkMode);
};

/** Applies the Rethink brand theme to all Cloudscape components */
export const applyRethinkTheme = () => {
    applyTheme(RETHINK_THEME);
};
