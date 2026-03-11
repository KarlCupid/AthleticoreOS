import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { LogScreen } from '../screens/LogScreen';

const Stack = createNativeStackNavigator();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={DashboardScreen} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="Log" component={LogScreen} />
    </Stack.Navigator>
  );
}
