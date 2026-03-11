import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WeightCutHomeScreen } from '../screens/WeightCutHomeScreen';
import { CutPlanSetupScreen } from '../screens/CutPlanSetupScreen';
import { FightWeekProtocolScreen } from '../screens/FightWeekProtocolScreen';
import { RehydrationProtocolScreen } from '../screens/RehydrationProtocolScreen';
import { CutHistoryScreen } from '../screens/CutHistoryScreen';

export type WeightCutStackParamList = {
  WeightCutHome: undefined;
  CutPlanSetup: undefined;
  FightWeekProtocol: undefined;
  RehydrationProtocol: { weighInWeightLbs: number; hoursToFight: number };
  CutHistory: undefined;
};

const Stack = createNativeStackNavigator<WeightCutStackParamList>();

export function WeightCutStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WeightCutHome" component={WeightCutHomeScreen} />
      <Stack.Screen name="CutPlanSetup" component={CutPlanSetupScreen} />
      <Stack.Screen name="FightWeekProtocol" component={FightWeekProtocolScreen} />
      <Stack.Screen name="RehydrationProtocol" component={RehydrationProtocolScreen} />
      <Stack.Screen name="CutHistory" component={CutHistoryScreen} />
    </Stack.Navigator>
  );
}
