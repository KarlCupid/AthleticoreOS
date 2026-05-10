import React from 'react';
import type { UseGeneratedWorkoutBetaResult } from '../../hooks/useGeneratedWorkoutBeta';
import {
  BoxingGeneratedWorkoutContainer,
  type BoxingGeneratedWorkoutContainerProps,
} from './BoxingGeneratedWorkoutContainer';

interface GeneratedWorkoutBetaContainerProps {
  controller: UseGeneratedWorkoutBetaResult;
}

export function GeneratedWorkoutBetaContainer({ controller }: GeneratedWorkoutBetaContainerProps) {
  return (
    <BoxingGeneratedWorkoutContainer
      controller={{
        engineEnabled: controller.betaEnabled,
        support: controller.beta,
      }}
    />
  );
}

export { BoxingGeneratedWorkoutContainer };
export type { BoxingGeneratedWorkoutContainerProps };
