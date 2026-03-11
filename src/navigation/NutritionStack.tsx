import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NutritionScreen } from '../screens/NutritionScreen';
import { FoodSearchScreen } from '../screens/FoodSearchScreen';
import { FoodDetailScreen } from '../screens/FoodDetailScreen';
import { CustomFoodScreen } from '../screens/CustomFoodScreen';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { FoodItemRow, MealType } from '../../lib/engine/types';

export type NutritionStackParamList = {
  NutritionHome: undefined;
  FoodSearch: { mealType: MealType; date?: string };
  FoodDetail: {
    foodItem: FoodItemRow | Omit<FoodItemRow, 'id'>;
    mealType: MealType;
    date?: string;
  };
  CustomFood: undefined;
  BarcodeScan: { mealType: MealType; date?: string };
};

const Stack = createNativeStackNavigator<NutritionStackParamList>();

export function NutritionStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NutritionHome" component={NutritionScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <Stack.Screen name="CustomFood" component={CustomFoodScreen} />
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} />
    </Stack.Navigator>
  );
}
