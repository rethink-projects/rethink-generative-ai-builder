// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, mockedAuthenticator, renderWithProvider } from '@/utils';
import { ModelMaxTokens } from '../ModelMaxTokens';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { Auth } from 'aws-amplify';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('ModelMaxTokens', () => {
    beforeEach(() => {
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with existing value and accepts changes', () => {
        const props = {
            modelData: { maxTokens: 4096 },
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'amazon.titan-text-express-v1'
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(<ModelMaxTokens {...props} {...callbacks} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        const input = cloudscapeWrapper.findInput('[data-testid="model-max-tokens-input"]');
        expect(input?.getInputValue()).toEqual('4096');

        input?.focus();
        input?.setInputValue('8192');
        input?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            maxTokens: 8192
        });
    });

    test('renders empty by default and clearing reports empty value', () => {
        const props = {
            modelData: { maxTokens: 1024 },
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'amazon.titan-text-express-v1'
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(<ModelMaxTokens {...props} {...callbacks} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        const input = cloudscapeWrapper.findInput('[data-testid="model-max-tokens-input"]');
        input?.focus();
        input?.setInputValue('');
        input?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            maxTokens: ''
        });
    });
});
