import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { APP_CHROME, COLORS, RADIUS, SPACING, TYPOGRAPHY_V2, SEMANTIC_PALETTE } from '../../theme/theme';

// Shown on Weekly Review when athlete hits 90%+ compliance for 3+ consecutive weeks.
// Lazy-loaded: import only in WeeklyReviewScreen, never on Compass or Training Floor.

interface StreakMilestoneProps {
    weeksCount: number;
    compliancePercent: number; // 0–100
}

export function StreakMilestone({ weeksCount, compliancePercent }: StreakMilestoneProps) {
    const scale = useSharedValue(0.85);
    const opacity = useSharedValue(0);
    const accentWidth = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 160 });
        opacity.value = withTiming(1, { duration: 400 });
        accentWidth.value = withTiming(1, { duration: 800 });
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const accentStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: accentWidth.value }],
    }));

    return (
        <Animated.View style={[styles.card, cardStyle]}>
            {/* Animated accent line at top */}
            <Animated.View style={[styles.accentLine, accentStyle]} />

            <View style={styles.body}>
                <Text style={styles.badge}>🔥</Text>
                <Text style={styles.headline}>
                    {weeksCount}-Week Streak
                </Text>
                <Text style={styles.sub}>
                    {Math.round(compliancePercent)}% compliance — you're building something real.
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: SEMANTIC_PALETTE.positive.tint,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    accentLine: {
        height: 3,
        backgroundColor: APP_CHROME.accent,
        borderRadius: 2,
        transformOrigin: 'left',
    },
    body: {
        padding: SPACING.lg,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    badge: {
        fontSize: 36,
        marginBottom: SPACING.xs,
    },
    headline: {
        ...TYPOGRAPHY_V2.plan.title,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    sub: {
        ...TYPOGRAPHY_V2.plan.body,
        color: COLORS.text.secondary,
        textAlign: 'center',
    },
});
