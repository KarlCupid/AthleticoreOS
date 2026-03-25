import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import type { MeStackParamList } from './types';

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeHome" component={ProfileSettingsScreen} />
    </Stack.Navigator>
  );
}
