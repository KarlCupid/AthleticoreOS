import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { ExerciseSearchScreen } from '../screens/ExerciseSearchScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { CustomExerciseScreen } from '../screens/CustomExerciseScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { GuidedWorkoutScreen } from '../screens/GuidedWorkoutScreen';
import { WorkoutSummaryScreen } from '../screens/WorkoutSummaryScreen';
import { WeeklyPlanScreen } from '../screens/WeeklyPlanScreen';
import { WeeklyPlanSetupScreen } from '../screens/WeeklyPlanSetupScreen';
import { GymProfileScreen } from '../screens/GymProfileScreen';
import { ExerciseLibraryRow, WorkoutFocus, WorkoutType, ReadinessState, Phase, FitnessLevel } from '../../lib/engine/types';

export type SCStackParamList = {
    WorkoutHome: undefined;
    ExerciseSearch: { workoutLogId?: string };
    ExerciseDetail: {
        exercise: ExerciseLibraryRow;
        workoutLogId?: string;
    };
    CustomExercise: undefined;
    ActiveWorkout: {
        workoutLogId: string;
        focus: WorkoutFocus | null;
        workoutType: WorkoutType;
        selectedExerciseId?: string;
        selectionToken?: string;
    };
    // V2 screens
    GuidedWorkout: {
        weeklyPlanEntryId?: string;
        focus?: WorkoutFocus;
        availableMinutes?: number;
        readinessState: ReadinessState;
        phase: Phase;
        fitnessLevel: FitnessLevel;
        trainingDate?: string;
        isDeloadWeek?: boolean;
    };
    WorkoutSummary: {
        durationMin: number;
        totalSets: number;
        totalVolume: number;
        avgRPE: number | null;
        exercisesCompleted: number;
        hadPR: boolean;
        prExerciseName?: string;
    };
    WeeklyPlan: undefined;
    WeeklyPlanSetup: undefined;
    GymProfiles: undefined;
};

const Stack = createNativeStackNavigator<SCStackParamList>();

export function SCStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="WorkoutHome" component={WorkoutScreen} />
            <Stack.Screen name="ExerciseSearch" component={ExerciseSearchScreen} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
            <Stack.Screen name="CustomExercise" component={CustomExerciseScreen} />
            <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
            {/* V2 Guided S&C System */}
            <Stack.Screen name="GuidedWorkout" component={GuidedWorkoutScreen} />
            <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
            <Stack.Screen name="WeeklyPlan" component={WeeklyPlanScreen} />
            <Stack.Screen name="WeeklyPlanSetup" component={WeeklyPlanSetupScreen} />
            <Stack.Screen name="GymProfiles" component={GymProfileScreen} />
        </Stack.Navigator>
    );
}

