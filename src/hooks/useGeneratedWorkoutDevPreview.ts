import { useCallback, useEffect, useState } from 'react';
import {
  normalizeGeneratedWorkoutError,
  resolveGeneratedWorkoutContentReviewOptions,
  resolveGeneratedWorkoutFeatureFlags,
  workoutProgrammingService,
  type GeneratedWorkout,
} from '../../lib/performance-engine/workout-programming';
import { workoutProgrammingServiceFixtures } from '../../lib/performance-engine/workout-programming/workoutProgrammingServiceFixtures';

interface UseGeneratedWorkoutDevPreviewOptions {
  active: boolean;
}

export interface UseGeneratedWorkoutDevPreviewResult {
  enabled: boolean;
  workout: GeneratedWorkout | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export function useGeneratedWorkoutDevPreview({
  active,
}: UseGeneratedWorkoutDevPreviewOptions): UseGeneratedWorkoutDevPreviewResult {
  const { previewEnabled } = resolveGeneratedWorkoutFeatureFlags({
    betaFlag: process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA,
    previewFlag: process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW,
    dev: typeof __DEV__ !== 'undefined' && __DEV__,
    buildProfile: process.env.EXPO_PUBLIC_BUILD_PROFILE,
  });
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!previewEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const generatedPreview = await workoutProgrammingService.generatePreviewWorkout(
        workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
        {
          persistGeneratedWorkout: false,
          ...resolveGeneratedWorkoutContentReviewOptions('dev-preview'),
        },
      );
      setWorkout(generatedPreview);
    } catch (loadError) {
      setError(normalizeGeneratedWorkoutError(loadError, 'Generated workout preview failed.'));
    } finally {
      setLoading(false);
    }
  }, [previewEnabled]);

  useEffect(() => {
    if (previewEnabled && active && !workout && !loading) {
      void load();
    }
  }, [active, load, loading, previewEnabled, workout]);

  return {
    enabled: previewEnabled,
    workout,
    loading,
    error,
    load,
  };
}
