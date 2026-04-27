import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';
import { GymProfileScreen } from '../screens/GymProfileScreen';
import { APP_STACK_SCREEN_OPTIONS } from './stackOptions';

const Stack = createNativeStackNavigator();

interface PlanningSetupStackProps {
  onComplete: () => void;
}

function PlanningSetupGateScreen({ onComplete }: PlanningSetupStackProps) {
  return <WeeklyPlanSetupScreen onComplete={onComplete} />;
}

export function PlanningSetupStackNavigator({ onComplete }: PlanningSetupStackProps) {
  return (
    <Stack.Navigator screenOptions={APP_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="PlanningSetup">
        {() => <PlanningSetupGateScreen onComplete={onComplete} />}
      </Stack.Screen>
      <Stack.Screen name="GymProfiles" component={GymProfileScreen} />
    </Stack.Navigator>
  );
}
