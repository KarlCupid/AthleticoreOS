import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WeeklyPlanScreen } from '../screens/WeeklyPlanScreen';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { WeeklyReviewScreen } from '../screens/WeeklyReviewScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import type { PlanStackParamList } from './types';
import { APP_STACK_SCREEN_OPTIONS } from './stackOptions';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export function PlanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={APP_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="PlanHome" component={WeeklyPlanScreen} />
      <Stack.Screen name="WeeklyPlanSetup" component={WeeklyPlanSetupScreen} />
      <Stack.Screen name="CalendarMain" component={CalendarScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
    </Stack.Navigator>
  );
}
