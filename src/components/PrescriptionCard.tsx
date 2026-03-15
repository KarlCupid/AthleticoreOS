import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, BORDERS, ANIMATION } from '../theme/theme';
import { IconActivity } from './icons';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';

interface PrescriptionCardProps {
    message: string | null;
    entering?: boolean;
    enteringDelay?: number;
}

export function PrescriptionCard({ message, entering = false, enteringDelay = 0 }: PrescriptionCardProps) {
    const { themeColor } = useReadinessTheme();

    if (!message) return null;

    const content = (
        <View style={styles.card}>
            <View style={[styles.accentBorder, { backgroundColor: themeColor }]} />
            <View style={styles.iconContainer}>
                <IconActivity size={20} color={themeColor} />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>Today's Insight</Text>
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );

    if (entering) {
        return (
            <Animated.View entering={FadeInDown.delay(enteringDelay).duration(ANIMATION.slow).springify()}>
                {content}
            </Animated.View>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        paddingLeft: SPACING.lg + 4,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        overflow: 'hidden',
        ...SHADOWS.card,
        ...BORDERS.card,
    },
    accentBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: RADIUS.xl,
        borderBottomLeftRadius: RADIUS.xl,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    message: {
        fontSize: 15,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        lineHeight: 22,
    },
});

