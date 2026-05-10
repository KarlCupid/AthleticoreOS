import { useMemo } from 'react';
import {
  useBoxingGeneratedWorkout as useBoxingGeneratedWorkoutImpl,
  type BoxingGeneratedWorkoutController,
  type UseBoxingGeneratedWorkoutOptions,
} from './useBoxingGeneratedWorkout';
import type {
  BoxingGeneratedWorkoutCompletionDraft,
  BoxingGeneratedWorkoutConfig,
  BoxingGeneratedWorkoutStage,
} from '../components/workout/BoxingGeneratedWorkoutSessionCard';

export type GeneratedWorkoutBetaCompletionDraft = BoxingGeneratedWorkoutCompletionDraft;
export type GeneratedWorkoutBetaConfig = BoxingGeneratedWorkoutConfig;
export type GeneratedWorkoutBetaStage = BoxingGeneratedWorkoutStage;
export type GeneratedWorkoutBetaController = BoxingGeneratedWorkoutController;

export interface UseGeneratedWorkoutBetaResult {
  betaEnabled: boolean;
  beta: GeneratedWorkoutBetaController;
}

export function useGeneratedWorkoutBeta(options: UseBoxingGeneratedWorkoutOptions): UseGeneratedWorkoutBetaResult {
  const result = useBoxingGeneratedWorkoutImpl(options);
  return useMemo(
    () => ({
      betaEnabled: result.engineEnabled,
      beta: result.support,
    }),
    [result.engineEnabled, result.support],
  );
}

export const useBoxingGeneratedWorkout = useGeneratedWorkoutBeta;
