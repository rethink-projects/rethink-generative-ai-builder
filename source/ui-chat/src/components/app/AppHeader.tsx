// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from 'react-i18next';
import { Menu, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useConfigStore } from '@/stores/config-store';
import { useUser } from '@/contexts/UserContext';

interface AppHeaderProps {
    onOpenSettings: () => void;
}

/**
 * Top bar of the chat shell: sidebar toggle, assistant name, theme toggle,
 * settings and the user menu.
 */
export function AppHeader({ onOpenSettings }: AppHeaderProps) {
    const { t } = useTranslation();
    const { userName, userEmail, onSignOut } = useUser();
    const darkMode = usePreferencesStore((state) => state.darkMode);
    const setDarkMode = usePreferencesStore((state) => state.setDarkMode);
    const sidebarOpen = usePreferencesStore((state) => state.sidebarOpen);
    const setSidebarOpen = usePreferencesStore((state) => state.setSidebarOpen);
    const useCaseName = useConfigStore((state) => state.runtimeConfig?.UseCaseConfig?.UseCaseName);

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3">
            <Button
                variant="ghost"
                size="icon"
                aria-label={sidebarOpen ? t('sidebar.closeSidebar') : t('sidebar.openSidebar')}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="sidebar-toggle"
            >
                <Menu />
            </Button>

            <h1 className="truncate text-sm font-semibold">{useCaseName}</h1>

            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={darkMode ? t('header.lightMode') : t('header.darkMode')}
                    onClick={() => setDarkMode(!darkMode)}
                    data-testid="theme-toggle"
                >
                    {darkMode ? <Sun /> : <Moon />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('header.settings')}
                    onClick={onOpenSettings}
                    data-testid="settings-button"
                >
                    <Settings />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label={t('header.userMenu')}
                        className="flex size-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-testid="user-menu-trigger"
                    >
                        <UserRound className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <div className="px-2 py-1.5 text-sm">
                            <p className="font-medium">{userName}</p>
                            {userEmail && <p className="text-xs text-muted-foreground">{userEmail}</p>}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSignOut()} data-testid="sign-out-item">
                            {t('header.signOut')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
