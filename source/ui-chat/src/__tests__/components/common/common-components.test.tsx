// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AUTHORS } from '../../../pages/chat/config';
import { ScrollableContainer, ChatBubbleAvatar } from '../../../components/common/common-components';

describe('Common Components', () => {
    describe('ScrollableContainer', () => {
        it('renders children in a scrollable container with correct styles', () => {
            const ref = React.createRef<HTMLDivElement>();
            render(
                <ScrollableContainer ref={ref}>
                    <div>Scrollable Content</div>
                </ScrollableContainer>
            );

            const scrollContainer = screen.getByTestId('chat-scroll-container');
            expect(scrollContainer).toBeInTheDocument();
            expect(scrollContainer.style.overflowY).toBe('auto');
            expect(scrollContainer.style.position).toBe('absolute');
            expect(scrollContainer.style.inset).toBe('0');
            expect(screen.getByText('Scrollable Content')).toBeInTheDocument();
        });
    });

    describe('ChatBubbleAvatar', () => {
        it('renders assistant avatar with the accessible name', () => {
            const { container } = render(
                <ChatBubbleAvatar type={AUTHORS.ASSISTANT} name="AI Assistant" initials="AI" loading={false} />
            );

            const avatar = container.querySelector('[title="AI Assistant"]');
            expect(avatar).toBeInTheDocument();
        });

        it('renders user avatar with initials', () => {
            const { container } = render(
                <ChatBubbleAvatar type="user" name="Test User" initials="TU" loading={false} />
            );

            const avatar = container.querySelector('[title="Test User"]');
            expect(avatar).toBeInTheDocument();
            expect(avatar?.textContent).toBe('TU');
        });
    });
});
