import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

interface CardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    elevated?: boolean;
    variant?: CardVariant;
    pressable?: boolean;
    onPress?: () => void;
    style?: ViewStyle;
    noPadding?: boolean;
    entering?: boolean;
    enteringDelay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
    children,
    title,
    subtitle,
    elevated,
    variant = 'default',
    pressable = false,
    onPress,
    style,
    noPadding,
    entering = false,
    enteringDelay = 0,
}: CardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        if (pressable || onPress) scale.value = withSpring(0.98, ANIMATION.spring);
    };

    const handlePressOut = () => {
        if (pressable || onPress) scale.value = withSpring(1, ANIMATION.spring);
    };

    // Resolve variant (elevated prop for backward compat)
    const resolvedVariant = elevated ? 'elevated' : variant;

    const containerStyle = [
        styles.card,
        variantMap[resolvedVariant],
        noPadding && { padding: 0 },
        style,
    ];

    const header = title ? (
        <View style={[styles.header, noPadding && { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg }]}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
    ) : null;

    const enteringAnim = entering
        ? FadeInDown.delay(enteringDelay).duration(ANIMATION.slow).springify()
        : undefined;

    if (pressable || onPress) {
        return (
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                entering={enteringAnim}
                style={[containerStyle, animatedStyle]}
            >
                {header}
                {children}
            </AnimatedPressable>
        );
    }

    if (entering) {
        return (
            <Animated.View entering={enteringAnim} style={containerStyle}>
                {header}
                {children}
            </Animated.View>
        );
    }

    return (
        <View style={containerStyle}>
            {header}
            {children}
        </View>
    );
}

const variantMap: Record<CardVariant, ViewStyle> = {
    default: {
        backgroundColor: COLORS.surface,
        ...SHADOWS.card,
    },
    elevated: {
        backgroundColor: COLORS.surface,
        ...SHADOWS.cardElevated,
    },
    outlined: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filled: {
        backgroundColor: COLORS.surfaceSecondary,
    },
};

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.xl,
        padding: SPACING.lg - 4,
    },
    header: {
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
});
