import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import type { FuelStackParamList } from './types';

const Stack = createNativeStackNavigator<FuelStackParamList>();

export function FuelStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
