import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { WeightProgressScreen } from '../screens/WeightProgressScreen';
import { FitnessQuestionnaireScreen } from '../screens/FitnessQuestionnaireScreen';
import { LogScreen } from '../screens/LogScreen';

const Stack = createNativeStackNavigator();

export function DashboardStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DashboardHome" component={DashboardScreen} />
            <Stack.Screen name="WeightProgress" component={WeightProgressScreen} />
            <Stack.Screen name="FitnessQuestionnaire" component={FitnessQuestionnaireScreen} />
            <Stack.Screen name="Log" component={LogScreen} />
        </Stack.Navigator>
    );
}
