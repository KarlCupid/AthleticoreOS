import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';

const Stack = createNativeStackNavigator();

interface PlanningSetupStackProps {
  onComplete: () => void;
}

function PlanningSetupGateScreen({ onComplete }: PlanningSetupStackProps) {
  return <WeeklyPlanSetupScreen onComplete={onComplete} />;
}

export function PlanningSetupStackNavigator({ onComplete }: PlanningSetupStackProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlanningSetup">
        {() => <PlanningSetupGateScreen onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
