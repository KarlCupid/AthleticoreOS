import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { LegalSupportScreen } from '../screens/LegalSupportScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import type { MeStackParamList } from './types';

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeHome" component={ProfileSettingsScreen} />
      <Stack.Screen name="LegalSupport" component={LegalSupportScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    </Stack.Navigator>
  );
}
