// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useContext } from 'react';
import { BaseFormComponentProps, ModelProviderOption } from '../../interfaces/BaseFormComponent';
import { FormField, Input, InputProps } from '@cloudscape-design/components';
import { updateNumFieldsInError } from '../../utils';
import { useModelTemperatureQuery } from 'hooks/useQueries';
import { DEPLOYMENT_ACTIONS } from '@/utils/constants';
import HomeContext from '@/contexts/home.context';

export interface ModelTemperatureProps extends BaseFormComponentProps {
    modelProvider: ModelProviderOption;
    modelName: string;
    modelData: any;
}

interface TemperatureRange {
    MinTemperature: number;
    DefaultTemperature: number;
    MaxTemperature: number;
}

interface OnTemperatureChangeProps {
    detail: InputProps.ChangeDetail;
    maxTemperature: number;
    minTemperature: number;
}

export const ModelTemperature = (props: ModelTemperatureProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const [temperatureError, setTemperatureError] = React.useState('');
    const [temperatureStep, setTemperatureStep] = React.useState(0.1);
    const [temperatureRange, setTemperatureRange] = React.useState<TemperatureRange>({
        MinTemperature: 0,
        DefaultTemperature: 0.5,
        MaxTemperature: 1
    });
    const [temperature, setTemperature] = React.useState(
        props.modelData.temperature === '' || props.modelData.temperature === undefined
            ? ''
            : String(props.modelData.temperature)
    );

    const modelTemperatureQueryResponse = useModelTemperatureQuery(
        props.modelProvider.value!,
        props.modelName,
        props.modelData?.bedrockInferenceType
    );

    const onTemperatureChange = ({ detail, maxTemperature, minTemperature }: OnTemperatureChangeProps) => {
        setTemperature(detail.value);
        let errors = '';
        if (detail.value.length === 0) {
            // Empty is valid: the temperature parameter is omitted and the model default applies.
            props.onChangeFn({ temperature: '' });
            updateNumFieldsInError(errors, temperatureError, props.setNumFieldsInError);
            setTemperatureError(errors);
            return;
        }
        if (isNaN(parseInt(detail.value)) || isNaN(parseFloat(detail.value))) {
            errors += 'Can only include numbers and a decimal point. ';
        } else if (parseFloat(detail.value) < minTemperature || parseFloat(detail.value) > maxTemperature) {
            errors += `Must be between ${minTemperature} and ${maxTemperature}.`;
        }
        props.onChangeFn({ temperature: parseFloat(detail.value) });
        updateNumFieldsInError(errors, temperatureError, props.setNumFieldsInError);
        setTemperatureError(errors);
    };

    React.useEffect(() => {
        if (modelTemperatureQueryResponse.isError) {
            console.error('Error in fetching model temperature defaults');
        }

        if (modelTemperatureQueryResponse.isSuccess) {
            const tempRangeData = modelTemperatureQueryResponse.data;

            setTemperatureRange(tempRangeData);
            setTemperatureStep(tempRangeData.MaxTemperature > 1 ? 1 : 0.1);

            // When editing, keep the deployment's configured value (including a
            // deliberately cleared field) instead of resetting to the model default.
            if (deploymentAction !== DEPLOYMENT_ACTIONS.EDIT) {
                setTemperature(tempRangeData.DefaultTemperature);
                props.onChangeFn({ temperature: tempRangeData.DefaultTemperature });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.modelData.modelProvider, props.modelData.modelName, modelTemperatureQueryResponse.data]);

    return (
        <FormField
            label={
                <span>
                    Model temperature <i>- optional</i>
                </span>
            }
            description="This parameter regulates the randomness or creativity of the model's predictions. Use a temperature closer to 0 for analytical, deterministic or multiple choice queries. A higher temperature generates creative responses. Leave empty to use the model's default (required for models that reject the temperature parameter)."
            constraintText={`Min: ${temperatureRange.MinTemperature}, Max: ${temperatureRange.MaxTemperature}. Leave empty to use the model's default.`}
            errorText={temperatureError}
            data-testid="model-temperature-field"
        >
            <Input
                type="number"
                step={temperatureStep}
                onChange={({ detail }) =>
                    onTemperatureChange({
                        detail,
                        minTemperature: temperatureRange.MinTemperature,
                        maxTemperature: temperatureRange.MaxTemperature
                    })
                }
                value={temperature}
                autoComplete={false}
                data-testid="model-temperature-input"
            />
        </FormField>
    );
};
