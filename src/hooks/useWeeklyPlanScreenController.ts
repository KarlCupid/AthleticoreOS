import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ReadinessState, WeeklyPlanEntryRow } from '../../lib/engine/types';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import { getGuidedWorkoutContext } from '../../lib/api/fightCampService';
import type { PlanStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<PlanStackParamList>;

interface UseWeeklyPlanScreenControllerParams {
  navigation: NavProp;
  currentLevel: ReadinessState | null;
  missedEntries: WeeklyPlanEntryRow[];
  rescheduleDay: (entry: WeeklyPlanEntryRow) => Promise<unknown>;
  cancelPlan: () => Promise<void>;
  loadPlan: (forceStartDate?: string) => Promise<void>;
}

export function useWeeklyPlanScreenController({
  navigation,
  currentLevel,
  missedEntries,
  rescheduleDay,
  cancelPlan,
  loadPlan,
}: UseWeeklyPlanScreenControllerParams) {
  const handleDayPress = useCallback(async (entry: WeeklyPlanEntryRow) => {
    const userId = await getActiveUserId();
    if (!userId) return;

    const context = await getGuidedWorkoutContext(userId, entry.date);
    navigation.navigate('WorkoutDetail', {
      weeklyPlanEntryId: entry.id,
      date: entry.date,
      readinessState: currentLevel ?? 'Prime',
      phase: context.phase,
      fitnessLevel: context.fitnessLevel,
      isDeloadWeek: entry.is_deload,
    });
  }, [currentLevel, navigation]);

  const handleMissedBannerPress = useCallback(() => {
    if (missedEntries.length > 0) {
      void rescheduleDay(missedEntries[0]);
    }
  }, [missedEntries, rescheduleDay]);

  const handleSetupPress = useCallback(() => {
    navigation.navigate('WeeklyPlanSetup');
  }, [navigation]);

  const handleOptionsPress = useCallback(() => {
    Alert.alert(
      'Plan Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust Plan',
          onPress: handleSetupPress,
        },
        {
          text: 'End Current Plan',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'End Plan?',
              'This will clear all upcoming scheduled sessions for this week. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Plan', style: 'destructive', onPress: () => void cancelPlan() },
              ],
            );
          },
        },
      ],
      { cancelable: true },
    );
  }, [cancelPlan, handleSetupPress]);

  const handleTodayPress = useCallback(() => {
    void loadPlan();
  }, [loadPlan]);

  const handleQuickLogPress = useCallback(() => {
    Alert.alert('Coming Soon', 'Direct logging will open here.');
  }, []);

  return {
    handleDayPress,
    handleMissedBannerPress,
    handleSetupPress,
    handleOptionsPress,
    handleTodayPress,
    handleQuickLogPress,
  };
}
