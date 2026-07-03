// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { BaseFormComponentProps, ModelProviderOption } from '../../interfaces/BaseFormComponent';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { updateNumFieldsInError } from '../../utils';

export interface ModelMaxTokensProps extends BaseFormComponentProps {
    modelProvider: ModelProviderOption;
    modelName: string;
    modelData: any;
}

export const ModelMaxTokens = (props: ModelMaxTokensProps) => {
    const [maxTokensError, setMaxTokensError] = React.useState('');
    const [maxTokens, setMaxTokens] = React.useState(
        props.modelData.maxTokens === '' || props.modelData.maxTokens === undefined
            ? ''
            : String(props.modelData.maxTokens)
    );

    const onMaxTokensChange = ({ detail }: { detail: InputProps.ChangeDetail }) => {
        setMaxTokens(detail.value);
        let errors = '';
        if (detail.value.length === 0) {
            // Empty is valid: the parameter is omitted and the model default applies.
            props.onChangeFn({ maxTokens: '' });
            updateNumFieldsInError(errors, maxTokensError, props.setNumFieldsInError);
            setMaxTokensError(errors);
            return;
        }
        const parsed = Number(detail.value);
        if (!Number.isInteger(parsed) || parsed < 1) {
            errors += 'Must be a whole number greater than 0.';
            props.onChangeFn({ maxTokens: detail.value });
        } else {
            props.onChangeFn({ maxTokens: parsed });
        }
        updateNumFieldsInError(errors, maxTokensError, props.setNumFieldsInError);
        setMaxTokensError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Maximum output tokens <i>- optional</i>
                </span>
            }
            description="Maximum number of tokens the model may generate in a single response. Increase this for long responses (e.g. reports). Leave empty to use the model's default."
            constraintText="Leave empty to use the model's default."
            errorText={maxTokensError}
            data-testid="model-max-tokens-field"
        >
            <Input
                type="number"
                step={1}
                onChange={({ detail }) => onMaxTokensChange({ detail })}
                value={maxTokens}
                autoComplete={false}
                data-testid="model-max-tokens-input"
            />
        </FormField>
    );
};

export default ModelMaxTokens;
