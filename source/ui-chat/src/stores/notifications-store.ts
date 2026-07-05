// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import React from 'react';

export type NotificationPayload = {
    id: string;
    header?: React.ReactNode;
    content?: React.ReactNode;
    type: 'success' | 'warning' | 'info' | 'error' | 'in-progress';
};

export interface NotificationsState {
    notifications: NotificationPayload[];
    addNotification: (notification: NotificationPayload) => void;
    deleteNotification: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
    notifications: [],
    addNotification: (notification) =>
        set((state) =>
            state.notifications.some((it) => it.id === notification.id)
                ? state
                : { notifications: [...state.notifications, notification] }
        ),
    deleteNotification: (id) =>
        set((state) => ({ notifications: state.notifications.filter((it) => it.id !== id) }))
}));
