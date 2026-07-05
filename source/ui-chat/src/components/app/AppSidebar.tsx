// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, MessagesSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useConfigStore, getUseCaseConfigKey } from '@/stores/config-store';
import { useConversationsQuery } from '@/hooks/queries';
import { useUser } from '@/contexts/UserContext';

/**
 * Left sidebar with the brand header, "new conversation" action and the
 * server-persisted conversation history of the signed-in user.
 */
export function AppSidebar() {
    const { t } = useTranslation();
    const { isAuthenticated } = useUser();
    const sidebarOpen = usePreferencesStore((state) => state.sidebarOpen);
    const setSidebarOpen = usePreferencesStore((state) => state.setSidebarOpen);

    const useCaseName = useConfigStore((state) => state.runtimeConfig?.UseCaseConfig?.UseCaseName);
    const useCaseConfigKey = useConfigStore(getUseCaseConfigKey);

    const selectedConversationId = useChatStore((state) => state.selectedConversationId);
    const activeConversationId = useChatStore((state) => state.conversationId);
    const isGenAiResponseLoading = useChatStore((state) => state.isGenAiResponseLoading);
    const selectConversation = useChatStore((state) => state.selectConversation);
    const resetChat = useChatStore((state) => state.resetChat);

    const { data, isLoading, isError } = useConversationsQuery(useCaseConfigKey, isAuthenticated);
    const conversations = data?.conversations ?? [];

    const handleNewConversation = () => {
        if (isGenAiResponseLoading) return;
        resetChat();
    };

    const handleSelectConversation = (conversationId: string) => {
        if (isGenAiResponseLoading) return;
        selectConversation(conversationId);
    };

    return (
        <>
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 md:hidden"
                    aria-hidden="true"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <aside
                aria-label={t('sidebar.recentConversations')}
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform md:static md:z-auto',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
                )}
                data-testid="app-sidebar"
            >
                <div className="flex items-center gap-2 px-4 py-4">
                    {/* Rethink-style arrow mark */}
                    <span
                        aria-hidden="true"
                        className="flex size-8 items-center justify-center rounded-md bg-brand-lime font-bold text-[#1a2405]"
                    >
                        ↗
                    </span>
                    <span className="truncate text-sm font-semibold" title={useCaseName}>
                        {useCaseName}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto md:hidden"
                        aria-label={t('sidebar.closeSidebar')}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X />
                    </Button>
                </div>

                <div className="px-3">
                    <Button
                        className="w-full justify-start"
                        onClick={handleNewConversation}
                        disabled={isGenAiResponseLoading}
                        data-testid="new-conversation-button"
                    >
                        <MessageSquarePlus />
                        {t('sidebar.newConversation')}
                    </Button>
                </div>

                <nav
                    aria-label={t('sidebar.recentConversations')}
                    className="mt-4 flex-1 overflow-y-auto px-3 pb-4"
                    data-testid="conversation-list"
                >
                    <h2 className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('sidebar.recentConversations')}
                    </h2>

                    {isLoading && (
                        <div className="space-y-2 px-2" aria-label={t('sidebar.loadingConversations')}>
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-5/6" />
                            <Skeleton className="h-8 w-4/6" />
                        </div>
                    )}

                    {isError && (
                        <p className="px-2 text-sm text-muted-foreground">{t('sidebar.conversationsUnavailable')}</p>
                    )}

                    {!isLoading && !isError && conversations.length === 0 && (
                        <p className="px-2 text-sm text-muted-foreground">{t('sidebar.emptyConversations')}</p>
                    )}

                    <ul className="space-y-1">
                        {conversations.map((conversation) => {
                            const isActive =
                                conversation.conversationId === (selectedConversationId ?? '') ||
                                conversation.conversationId === activeConversationId;
                            return (
                                <li key={conversation.conversationId}>
                                    <button
                                        type="button"
                                        aria-current={isActive ? 'true' : undefined}
                                        disabled={isGenAiResponseLoading}
                                        onClick={() => handleSelectConversation(conversation.conversationId)}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                                            isActive
                                                ? 'bg-sidebar-accent font-medium'
                                                : 'hover:bg-sidebar-accent/60'
                                        )}
                                        data-testid={`conversation-item-${conversation.conversationId}`}
                                    >
                                        <MessagesSquare className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                            {conversation.title || conversation.conversationId}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>
        </>
    );
}
