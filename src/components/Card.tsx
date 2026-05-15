import React, { ReactNode, memo } from 'react';
import { ImageBackground, ImageSourcePropType, View, Text, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
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
    backgroundTone = 'none',
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

const CARD_SURFACE = 'rgba(10, 10, 10, 0.74)';
const CARD_SURFACE_STRONG = 'rgba(10, 10, 10, 0.84)';
const CARD_BORDER = 'rgba(245, 245, 240, 0.16)';
const CARD_BORDER_ACCENT = 'rgba(212, 175, 55, 0.28)';

const variantMap: Record<CardVariant, ViewStyle> = {
    default: {
        backgroundColor: CARD_SURFACE,
        ...SHADOWS.card,
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    elevated: {
        backgroundColor: CARD_SURFACE_STRONG,
        ...SHADOWS.cardElevated,
        borderWidth: 1,
        borderColor: CARD_BORDER_ACCENT,
    },
    outlined: {
        backgroundColor: 'rgba(10, 10, 10, 0.64)',
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    filled: {
        backgroundColor: 'rgba(18, 18, 18, 0.82)',
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    glass: {
        backgroundColor: 'rgba(10, 10, 10, 0.66)',
        borderWidth: 1,
        borderColor: CARD_BORDER,
        ...SHADOWS.card,
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
