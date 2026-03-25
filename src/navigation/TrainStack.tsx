import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';
import { ExerciseSearchScreen } from '../screens/ExerciseSearchScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { CustomExerciseScreen } from '../screens/CustomExerciseScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { GuidedWorkoutScreen } from '../screens/GuidedWorkoutScreen';
import { WorkoutSummaryScreen } from '../screens/WorkoutSummaryScreen';
import { GymProfileScreen } from '../screens/GymProfileScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import type { TrainStackParamList } from './types';

const Stack = createNativeStackNavigator<TrainStackParamList>();

export function TrainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutHome" component={WorkoutScreen} />
      <Stack.Screen name="WeeklyPlanSetup" component={WeeklyPlanSetupScreen} />
      <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="CustomExercise" component={CustomExerciseScreen} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="GuidedWorkout" component={GuidedWorkoutScreen} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
      <Stack.Screen name="GymProfiles" component={GymProfileScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </Stack.Navigator>
  );
}
