// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from './components/app/AppSidebar.tsx';
import { AppHeader } from './components/app/AppHeader.tsx';
import { Toaster } from './components/app/Toaster.tsx';
import { SettingsDialog } from './components/app/SettingsDialog.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';

/**
 * Application shell: skip link, conversation sidebar, top bar and the chat
 * outlet. Replaces the previous Cloudscape AppLayout/SplitPanel structure.
 */
export default function Layout() {
    const { t } = useTranslation();
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <TooltipProvider>
            <a href="#main-content" className="skip-link">
                {t('common.skipToContent')}
            </a>
            <div className="flex h-full">
                <AppSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
                    <main id="main-content" className="flex min-h-0 flex-1 flex-col" data-testid="main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
            <Toaster />
            <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </TooltipProvider>
    );
}
