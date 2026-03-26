/**
 * Strategy resolver — returns the appropriate workout renderer component
 * based on loading strategy, workout type, and section template.
 *
 * Returns `null` when no specific renderer exists yet, signaling the
 * GuidedWorkoutScreen to fall back to the current inline rendering.
 */

import type { ComponentType } from 'react';
import type { LoadingStrategy, WorkoutSectionTemplate } from '../../../../lib/engine/types/training';
import type { WorkoutType } from '../../../../lib/engine/types/foundational';
import type { StrategyRendererProps } from './StrategyRendererProps';

import { StrengthRenderer } from './StrengthRenderer';
import { EMOMRenderer } from './EMOMRenderer';
import { AMRAPRenderer } from './AMRAPRenderer';
import { TabataRenderer } from './TabataRenderer';
import { CircuitRenderer } from './CircuitRenderer';
import { DensityRenderer } from './DensityRenderer';
import { ForTimeRenderer } from './ForTimeRenderer';
import { RecoveryRenderer } from './RecoveryRenderer';
import { ActivationRenderer } from './ActivationRenderer';
import { ConditioningRenderer } from './ConditioningRenderer';

type Renderer = ComponentType<StrategyRendererProps>;

/**
 * Resolve the appropriate renderer for the current exercise/section.
 *
 * Priority:
 *   1. Section template overrides (activation → ActivationRenderer, cooldown → RecoveryRenderer)
 *   2. Loading strategy match
 *   3. Workout type match (conditioning, recovery)
 *   4. null → fallback to current inline rendering
 */
export function resolveRenderer(
  loadingStrategy: LoadingStrategy | null | undefined,
  workoutType: WorkoutType | null | undefined,
  sectionTemplate: WorkoutSectionTemplate | null | undefined,
): Renderer | null {
  // 1. Section template overrides
  if (sectionTemplate === 'activation') return ActivationRenderer;
  if (sectionTemplate === 'cooldown') return RecoveryRenderer;

  // 2. Loading strategy match
  if (loadingStrategy) {
    switch (loadingStrategy) {
      case 'straight_sets':
      case 'top_set_backoff':
        return StrengthRenderer;
      case 'emom':
        return EMOMRenderer;
      case 'amrap':
        return AMRAPRenderer;
      case 'tabata':
        return TabataRenderer;
      case 'circuit_rounds':
        return CircuitRenderer;
      case 'density_block':
        return DensityRenderer;
      case 'for_time':
      case 'timed_sets':
        return ForTimeRenderer;
      case 'recovery_flow':
        return RecoveryRenderer;
      case 'intervals':
        return ConditioningRenderer;
    }
  }

  // 3. Workout type match
  if (workoutType === 'conditioning') return ConditioningRenderer;
  if (workoutType === 'recovery') return RecoveryRenderer;

  // 4. Default: Strength renderer for any unmatched case (most common)
  return StrengthRenderer;
}

export type { StrategyRendererProps } from './StrategyRendererProps';
