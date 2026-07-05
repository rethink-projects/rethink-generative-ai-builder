// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo } from 'react';
import { BaseFormComponentProps } from '@/components/wizard/interfaces/';
import { updateNumFieldsInError } from '@/components/wizard/utils';
import { Autosuggest, AutosuggestProps, Box, FormField } from '@cloudscape-design/components';
import { InfoLink } from '@/components/commons';
import { BEDROCK_INFERENCE_PROFILE_CATALOG, buildModelOptions } from './bedrock-model-catalog';

export interface InferenceProfileIdInputProps extends BaseFormComponentProps {
    modelData: any;
    inferenceProfileIdError?: string;
    setInferenceProfileIdError?: React.Dispatch<React.SetStateAction<string>>;
    registerErrorSetter?: (setter: React.Dispatch<React.SetStateAction<string>>) => void;
}

export const InferenceProfileIdInput = (props: InferenceProfileIdInputProps) => {
    const [localInferenceProfileIdError, setLocalInferenceProfileIdError] = React.useState('');

    // Use provided error state and setter if available, otherwise use local state
    const inferenceProfileIdError =
        props.inferenceProfileIdError !== undefined ? props.inferenceProfileIdError : localInferenceProfileIdError;

    const setInferenceProfileIdError = props.setInferenceProfileIdError || setLocalInferenceProfileIdError;

    // Register error setter with parent component if registerErrorSetter is provided
    useEffect(() => {
        if (props.registerErrorSetter) {
            props.registerErrorSetter(setInferenceProfileIdError);
        }
    }, [props.registerErrorSetter]);

    const profileOptions = useMemo(() => buildModelOptions(BEDROCK_INFERENCE_PROFILE_CATALOG), []);

    const onInferenceProfileIdChange = (detail: AutosuggestProps.ChangeDetail) => {
        props.onChangeFn({ inferenceProfileId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9-:.]+$`)) {
            errors += 'Invalid inference profile ID.';
        }
        updateNumFieldsInError(errors, inferenceProfileIdError, props.setNumFieldsInError);
        setInferenceProfileIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    {'Inference Profile ID'} - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(inferenceProfileIdInfoPanel)}
                    ariaLabel={'Information about inference profile id.'}
                />
            }
            description={
                <span>
                    ID of the inference profile you want to use. See the list of available inference profiles in the{' '}
                    <a
                        href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Amazon Bedrock User Guide
                    </a>
                    .
                </span>
            }
            constraintText="Note: When using an inference profile, ensure the model is enabled in both the source and target regions. Cross-region inference requires model access in all regions involved."
            errorText={inferenceProfileIdError}
            data-testid="inference-profile-id-field"
        >
            <Autosuggest
                placeholder={'Choose a profile or enter an inference profile ID...'}
                value={props.modelData.inferenceProfileId || ''}
                onChange={({ detail }) => onInferenceProfileIdChange(detail)}
                options={profileOptions}
                filteringType="auto"
                enteredTextLabel={(value) => `Use custom inference profile ID: "${value}"`}
                ariaLabel="Bedrock inference profile ID"
                empty="No matching profiles. You can still enter a custom inference profile ID."
                data-testid="inference-profile-id-input"
            />
        </FormField>
    );
};

const inferenceProfileIdInfoPanel = {
    title: 'Inference profile ID',
    content: (
        <div>
            <Box variant="p">The unique identifier of the inference profile.</Box>
            <div>
                <Box variant="p">
                    If you use an inference profile, specify the inference profile ID. For a list of inference profile
                    IDs, see
                    <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-support.html">
                        Supported Regions and models for cross-region inference
                    </a>{' '}
                    in the Amazon Bedrock User Guide.
                </Box>
            </div>
            <Box variant="p">Length Constraints: Minimum length of 1. Maximum length of 64.</Box>
            <Box variant="p">
                Pattern: <code>{'^[a-zA-Z0-9-:.]+$'}</code>
            </Box>
            <Box variant="p">Required: Yes</Box>
        </div>
    ),
    links: [
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_GetInferenceProfile.html#bedrock-GetInferenceProfile-response-inferenceProfileId',
            text: 'Bedrock inference profile ID'
        }
    ]
};

export default InferenceProfileIdInput;
