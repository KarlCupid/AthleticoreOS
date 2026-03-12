import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WeeklyPlanScreen } from '../screens/WeeklyPlanScreen';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { ExerciseSearchScreen } from '../screens/ExerciseSearchScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { CustomExerciseScreen } from '../screens/CustomExerciseScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { GuidedWorkoutScreen } from '../screens/GuidedWorkoutScreen';
import { WorkoutSummaryScreen } from '../screens/WorkoutSummaryScreen';
import { GymProfileScreen } from '../screens/GymProfileScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { WeeklyTemplateScreen } from '../screens/WeeklyTemplateScreen';
import { WeeklyReviewScreen } from '../screens/WeeklyReviewScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { FoodSearchScreen } from '../screens/FoodSearchScreen';
import { FoodDetailScreen } from '../screens/FoodDetailScreen';
import { CustomFoodScreen } from '../screens/CustomFoodScreen';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { WeightCutHomeScreen } from '../screens/WeightCutHomeScreen';
import { CutPlanSetupScreen } from '../screens/CutPlanSetupScreen';
import { FightWeekProtocolScreen } from '../screens/FightWeekProtocolScreen';
import { RehydrationProtocolScreen } from '../screens/RehydrationProtocolScreen';
import { CutHistoryScreen } from '../screens/CutHistoryScreen';
import type { PlanStackParamList } from './types';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export function PlanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlanHome" component={WeeklyPlanScreen} />
      <Stack.Screen name="WeeklyPlanSetup" component={WeeklyPlanSetupScreen} />
      <Stack.Screen name="WorkoutHome" component={WorkoutScreen} />
      <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
      <Stack.Screen name="CustomExercise" component={CustomExerciseScreen} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="GuidedWorkout" component={GuidedWorkoutScreen} />
      <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
      <Stack.Screen name="GymProfiles" component={GymProfileScreen} />
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="WeeklyTemplate" component={WeeklyTemplateScreen} />
      <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <Stack.Screen name="NutritionHome" component={NutritionScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <Stack.Screen name="CustomFood" component={CustomFoodScreen} />
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} />
      <Stack.Screen name="WeightCutHome" component={WeightCutHomeScreen} />
      <Stack.Screen name="CutPlanSetup" component={CutPlanSetupScreen} />
      <Stack.Screen name="FightWeekProtocol" component={FightWeekProtocolScreen} />
      <Stack.Screen name="RehydrationProtocol" component={RehydrationProtocolScreen} />
      <Stack.Screen name="CutHistory" component={CutHistoryScreen} />
    </Stack.Navigator>
  );
}
