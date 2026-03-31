import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
    icon: ReactNode;
    label: string;
    value: string;
    numericValue?: number;
    sub?: string;
    color?: string;
    trend?: 'up' | 'down' | 'flat';
    sparkline?: ReactNode;
    style?: StyleProp<ViewStyle>;
    entering?: boolean;
    enteringDelay?: number;
}

export function StatCard({
    icon,
    label,
    value,
    numericValue,
    sub,
    color,
    trend,
    sparkline,
    style,
    entering = false,
    enteringDelay = 0,
}: StatCardProps) {
    const trendArrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : trend === 'flat' ? '\u2192' : null;
    const trendColor = trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.error : COLORS.text.tertiary;

    const card = (
        <View style={[styles.card, style]}>
            <View style={styles.header}>
                <View style={[styles.iconCircle, color ? { backgroundColor: color + '15' } : undefined]}>
                    {icon}
                </View>
                <Text style={styles.label} numberOfLines={1}>{label}</Text>
            </View>
            <View style={styles.valueRow}>
                {numericValue !== undefined ? (
                    <AnimatedNumber
                        value={numericValue}
                        style={styles.value}
                        duration={ANIMATION.slow}
                    />
                ) : (
                    <Text style={styles.value}>{value}</Text>
                )}
                {trendArrow && (
                    <Text style={[styles.trend, { color: trendColor }]}>{trendArrow}</Text>
                )}
            </View>
            {sub && <Text style={styles.sub}>{sub}</Text>}
            {sparkline && <View style={styles.sparklineWrap}>{sparkline}</View>}
        </View>
    );

    if (entering) {
        return (
            <Animated.View entering={FadeInDown.delay(enteringDelay).duration(ANIMATION.slow).springify()}>
                {card}
            </Animated.View>
        );
    }

    return card;
}

const styles = StyleSheet.create({
    card: {
        width: '47%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...SHADOWS.card,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: SPACING.xs,
    },
    value: {
        fontSize: 28,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    trend: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
    },
    sub: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    sparklineWrap: {
        marginTop: SPACING.sm,
        height: 30,
    },
});
