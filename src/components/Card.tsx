import React, { ReactNode, memo } from 'react';
import { ImageBackground, ImageSourcePropType, View, Text, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, BORDERS, ANIMATION } from '../theme/theme';
import { CARD_BACKGROUNDS, type CardBackgroundKey } from '../theme/cardBackgrounds';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';

interface CardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    elevated?: boolean;
    variant?: CardVariant;
    pressable?: boolean;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    noPadding?: boolean;
    entering?: boolean;
    enteringDelay?: number;
    subtitleLines?: number;
    backgroundImage?: ImageSourcePropType | null;
    backgroundTone?: CardBackgroundKey | 'none';
    backgroundScrimColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Card = memo(function Card({
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
    subtitleLines = 1,
    backgroundImage,
    backgroundTone = 'default',
    backgroundScrimColor,
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
            {subtitle && <Text style={styles.subtitle} numberOfLines={subtitleLines}>{subtitle}</Text>}
        </View>
    ) : null;

    const enteringAnim = entering
        ? FadeInDown.delay(enteringDelay).duration(ANIMATION.slow).springify()
        : undefined;

    const resolvedBackgroundImage =
        backgroundImage === null || backgroundTone === 'none'
            ? undefined
            : backgroundImage ?? CARD_BACKGROUNDS[backgroundTone];
    const resolvedScrimColor =
        backgroundScrimColor ?? (backgroundImage ? 'rgba(10, 10, 10, 0.42)' : 'rgba(10, 10, 10, 0.68)');

    const backgroundLayer = resolvedBackgroundImage ? (
        <ImageBackground
            source={resolvedBackgroundImage}
            resizeMode="cover"
            style={StyleSheet.absoluteFillObject}
            imageStyle={styles.backgroundImage}
        >
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: resolvedScrimColor }]} />
        </ImageBackground>
    ) : null;

    if (pressable || onPress) {
        return (
            <AnimatedPressable
                {...(onPress ? { onPress } : {})}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                {...(enteringAnim ? { entering: enteringAnim } : {})}
                style={[containerStyle, animatedStyle]}
            >
                {backgroundLayer}
                {header}
                {children}
            </AnimatedPressable>
        );
    }

    if (entering) {
        return (
            <Animated.View {...(enteringAnim ? { entering: enteringAnim } : {})} style={containerStyle}>
                {backgroundLayer}
                {header}
                {children}
            </Animated.View>
        );
    }

    return (
        <View style={containerStyle}>
            {backgroundLayer}
            {header}
            {children}
        </View>
    );
});

const variantMap: Record<CardVariant, ViewStyle> = {
    default: {
        backgroundColor: 'rgba(10, 10, 10, 0.68)',
        ...SHADOWS.card,
        ...BORDERS.card,
    },
    elevated: {
        backgroundColor: 'rgba(10, 10, 10, 0.86)',
        ...SHADOWS.cardElevated,
        ...BORDERS.elevated,
    },
    outlined: {
        backgroundColor: 'rgba(10, 10, 10, 0.56)',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filled: {
        backgroundColor: COLORS.surfaceSecondary,
    },
    glass: {
        backgroundColor: 'rgba(10, 10, 10, 0.58)',
        borderWidth: 1,
        borderColor: 'rgba(245, 245, 240, 0.14)',
    },
};

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.xl,
        padding: SPACING.lg - 4,
        overflow: 'hidden',
    },
    backgroundImage: {
        borderRadius: RADIUS.xl,
    },
    header: {
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
        letterSpacing: 0,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.regular,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
});
