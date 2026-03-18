import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { APP_CHROME, COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';

// In-session PR badge — fires within 500ms of set being logged, does not interrupt workout.
// Lazy-loaded: this component should only be imported in GuidedWorkoutScreen, never on Compass.

interface PRBadgeProps {
    exerciseName: string;
    newRecord: string; // e.g. "120kg × 5"
    onDismiss?: () => void;
    autoDismissMs?: number;
}

export function PRBadge({ exerciseName, newRecord, onDismiss, autoDismissMs = 2500 }: PRBadgeProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Enter
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 200 });

        // Haptic on mount
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Auto-dismiss
        const timer = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 300 }, (done) => {
                if (done) runOnJS(onDismiss ?? (() => {}))();
            });
            scale.value = withTiming(0.8, { duration: 300 });
        }, autoDismissMs);

        return () => clearTimeout(timer);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.badge, animatedStyle]}>
            <Text style={styles.trophy}>🏆</Text>
            <View style={styles.text}>
                <Text style={styles.headline}>Personal Record</Text>
                <Text style={styles.exercise}>{exerciseName}</Text>
                <Text style={styles.record}>{newRecord}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.readiness.primeLight,
        borderWidth: 1.5,
        borderColor: APP_CHROME.accent,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
        // Positioned by parent (absolute, above set log)
    },
    trophy: {
        fontSize: 28,
    },
    text: {
        flex: 1,
    },
    headline: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: APP_CHROME.accent,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    exercise: {
        ...TYPOGRAPHY_V2.plan.body,
        color: COLORS.text.primary,
        fontFamily: FONT_FAMILY.semiBold,
    },
    record: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.secondary,
    },
});
