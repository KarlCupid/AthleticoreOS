import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type {
  FitnessLevel,
  Phase,
  ReadinessState,
  WeeklyPlanEntryRow,
  WorkoutFocus,
} from '../../lib/engine/types';
import type { TrainStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<TrainStackParamList>;

const FOCUS_LABELS: Record<WorkoutFocus, string> = {
  lower: 'Lower Body',
  upper_push: 'Upper Push',
  upper_pull: 'Upper Pull',
  full_body: 'Full Body',
  conditioning: 'Conditioning',
  sport_specific: 'Sport Specific',
  recovery: 'Recovery',
};

interface UseWorkoutDetailControllerParams {
  navigation: NavProp;
  entry: WeeklyPlanEntryRow | null;
  readinessState: ReadinessState;
  phase: Phase;
  fitnessLevel: FitnessLevel;
  markSkipped: () => Promise<void>;
  restore: () => Promise<void>;
  regenerate: (newFocus?: WorkoutFocus) => Promise<void>;
}

export function useWorkoutDetailController({
  navigation,
  entry,
  readinessState,
  phase,
  fitnessLevel,
  markSkipped,
  restore,
  regenerate,
}: UseWorkoutDetailControllerParams) {
  const handleStartWorkout = useCallback(() => {
    if (!entry) return;
    navigation.navigate('GuidedWorkout', {
      weeklyPlanEntryId: entry.id,
      scheduledActivityId: entry.scheduled_activity_id ?? undefined,
      focus: entry.focus ?? undefined,
      availableMinutes: entry.estimated_duration_min,
      readinessState,
      phase,
      fitnessLevel,
      trainingDate: entry.date,
      isDeloadWeek: entry.is_deload,
    });
  }, [entry, fitnessLevel, navigation, phase, readinessState]);

  const handleSkipDay = useCallback(() => {
    Alert.alert('Skip Day?', 'This session will be marked as skipped.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip', style: 'destructive', onPress: () => void markSkipped() },
    ]);
  }, [markSkipped]);

  const handleRestore = useCallback(() => {
    void restore();
  }, [restore]);

  const handleReschedule = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showFocusPicker = useCallback(() => {
    const focusOptions: WorkoutFocus[] = ['lower', 'upper_push', 'upper_pull', 'full_body', 'conditioning', 'sport_specific'];
    Alert.alert(
      'Choose Focus',
      'Select a new focus for this session.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...focusOptions.map((focus) => ({
          text: FOCUS_LABELS[focus],
          onPress: () => void regenerate(focus),
        })),
      ],
    );
  }, [regenerate]);

  const handleOptionsPress = useCallback(() => {
    if (!entry) return;

    Alert.alert('Workout Options', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Regenerate Workout',
        onPress: () => {
          Alert.alert(
            'Regenerate?',
            'This will replace the current workout with a newly generated one.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Regenerate', onPress: () => void regenerate() },
            ],
          );
        },
      },
      {
        text: 'Change Focus',
        onPress: showFocusPicker,
      },
      {
        text: 'Mark as Rest Day',
        style: 'destructive',
        onPress: handleSkipDay,
      },
    ]);
  }, [entry, handleSkipDay, regenerate, showFocusPicker]);

  return {
    handleStartWorkout,
    handleSkipDay,
    handleRestore,
    handleReschedule,
    handleOptionsPress,
  };
}
