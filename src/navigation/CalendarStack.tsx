import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarScreen } from '../screens/CalendarScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { WeeklyTemplateScreen } from '../screens/WeeklyTemplateScreen';
import { WeeklyReviewScreen } from '../screens/WeeklyReviewScreen';

const Stack = createNativeStackNavigator();

export function CalendarStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CalendarMain" component={CalendarScreen} />
            <Stack.Screen name="DayDetail" component={DayDetailScreen} />
            <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
            <Stack.Screen name="WeeklyTemplate" component={WeeklyTemplateScreen} />
            <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
        </Stack.Navigator>
    );
}
