// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-amplify/ui-react/styles.css';
import { AppRoutes } from './AppRoutes.tsx';

import { useEffect } from 'react';
import { SOLUTION_NAME } from './utils/constants.ts';
import { useConfigStore } from './stores/config-store.ts';
import { usePreferencesStore, applyThemeClass } from './stores/preferences-store.ts';

const AppComponent = () => {
    const useCaseName = useConfigStore((state) => state.runtimeConfig?.UseCaseConfig?.UseCaseName);
    const darkMode = usePreferencesStore((state) => state.darkMode);

    useEffect(() => {
        document.title = useCaseName || SOLUTION_NAME;
    }, [useCaseName]);

    useEffect(() => {
        applyThemeClass(darkMode);
    }, [darkMode]);

    return <AppRoutes></AppRoutes>;
};

export const App = AppComponent;
