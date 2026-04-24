import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { LogScreen } from '../screens/LogScreen';
import type { TodayStackParamList } from './types';
import { APP_STACK_SCREEN_OPTIONS } from './stackOptions';

const Stack = createNativeStackNavigator<TodayStackParamList>();

export function TodayStackNavigator() {
  return (
    <Stack.Navigator screenOptions={APP_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="TodayHome" component={DashboardScreen} />
      <Stack.Screen name="Log" component={LogScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
    </Stack.Navigator>
  );
}
