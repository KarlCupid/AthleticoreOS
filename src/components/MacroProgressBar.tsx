import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, ANIMATION } from '../theme/theme';

interface MacroProgressBarProps {
    label: string;
    current: number;
    target: number;
    color: string;
    unit?: string;
}

export function MacroProgressBar({
    label,
    current,
    target,
    color,
    unit = 'g',
}: MacroProgressBarProps) {
    const pct = target > 0 ? Math.min(current / target, 1.5) : 0;
    const displayPct = Math.min(pct, 1);
    const isOver = pct > 1;
    const pctLabel = target > 0 ? Math.round((current / target) * 100) : 0;

    const animatedWidth = useSharedValue(0);

    useEffect(() => {
        animatedWidth.value = withTiming(displayPct, {
            duration: ANIMATION.slow + 200,
            easing: Easing.out(Easing.cubic),
        });
    }, [displayPct]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${animatedWidth.value * 100}%`,
    }));

    const barColor = isOver ? COLORS.readiness.caution : color;
    const gradientColors = isOver
        ? [COLORS.readiness.caution, COLORS.readiness.cautionLight] as const
        : [color, color + '99'] as const;

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.valueRow}>
                    <Text style={[styles.value, isOver && { color: COLORS.readiness.caution }]}>
                        {Math.round(current)}{' '}
                        <Text style={styles.target}>/ {Math.round(target)}{unit}</Text>
                    </Text>
                    <View style={[styles.pctBadge, { backgroundColor: barColor + '15' }]}>
                        <Text style={[styles.pctText, { color: barColor }]}>{pctLabel}%</Text>
                    </View>
                </View>
            </View>
            <View style={styles.barBackground}>
                <Animated.View style={[styles.barFill, barStyle]}>
                    <LinearGradient
                        colors={[gradientColors[0], gradientColors[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.sm + 4,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs + 2,
    },
    label: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    value: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    target: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
    },
    pctBadge: {
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    pctText: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
    },
    barBackground: {
        height: 8,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.borderLight,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
    },
});
