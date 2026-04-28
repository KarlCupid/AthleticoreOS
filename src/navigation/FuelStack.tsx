import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NutritionScreen } from '../screens/NutritionScreen';
import { FoodSearchScreen } from '../screens/FoodSearchScreen';
import { FoodDetailScreen } from '../screens/FoodDetailScreen';
import { CustomFoodScreen } from '../screens/CustomFoodScreen';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { WeightClassHomeScreen } from '../screens/WeightClassHomeScreen';
import { WeightClassPlanSetupScreen } from '../screens/WeightClassPlanSetupScreen';
import { CompetitionBodyMassScreen } from '../screens/CompetitionBodyMassScreen';
import { PostWeighInRecoveryScreen } from '../screens/PostWeighInRecoveryScreen';
import { WeightClassHistoryScreen } from '../screens/WeightClassHistoryScreen';
import type { FuelStackParamList } from './types';
import { APP_STACK_SCREEN_OPTIONS } from './stackOptions';

const Stack = createNativeStackNavigator<FuelStackParamList>();

export function FuelStackNavigator() {
  return (
    <Stack.Navigator screenOptions={APP_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="NutritionHome" component={NutritionScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <Stack.Screen name="CustomFood" component={CustomFoodScreen} />
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} />
      <Stack.Screen name="WeightClassHome" component={WeightClassHomeScreen} />
      <Stack.Screen name="WeightClassPlanSetup" component={WeightClassPlanSetupScreen} />
      <Stack.Screen name="CompetitionBodyMass" component={CompetitionBodyMassScreen} />
      <Stack.Screen name="PostWeighInRecovery" component={PostWeighInRecoveryScreen} />
      <Stack.Screen name="WeightClassHistory" component={WeightClassHistoryScreen} />
    </Stack.Navigator>
  );
}
