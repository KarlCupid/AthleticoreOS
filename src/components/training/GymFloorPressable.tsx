import React, { ReactNode } from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { APP_CHROME, ANIMATION, COLORS, RADIUS, TYPOGRAPHY_V2, TAP_TARGETS } from '../../theme/theme';

// Use GymFloorPressable on Training Floor only — not in Plan mode screens.
// For Plan mode interactive elements, use AnimatedPressable.

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface GymFloorPressableProps {
    label: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    variant?: 'primary' | 'secondary';
    onPress: () => void;
    fullWidth?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
}

export function GymFloorPressable({
    label,
    accessibilityLabel,
    accessibilityHint,
    variant = 'primary',
    onPress,
    fullWidth = true,
    disabled = false,
    style,
    children,
}: GymFloorPressableProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: disabled ? 0.4 : 1,
    }));

    const handlePressIn = () => {
        if (!disabled) {
            scale.value = withSpring(0.96, ANIMATION.spring); // More pronounced than AnimatedPressable's 0.97
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, ANIMATION.spring);
    };

    const handlePress = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Medium, not Light
        onPress();
    };

    return (
        <AnimatedPressableView
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled }}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[
                animatedStyle,
                styles.base,
                variant === 'primary' ? styles.primary : styles.secondary,
                fullWidth && styles.fullWidth,
                style,
            ]}
        >
            {children ?? (
                <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>
                    {label}
                </Text>
            )}
        </AnimatedPressableView>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.lg, // 16dp per spec
    },
    primary: {
        backgroundColor: APP_CHROME.accent,
        minHeight: TAP_TARGETS.focusPrimary.min, // 64dp
        paddingHorizontal: 24,
    },
    secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: APP_CHROME.accent,
        minHeight: TAP_TARGETS.focus.min, // 56dp
        paddingHorizontal: 20,
    },
    fullWidth: {
        alignSelf: 'stretch',
    },
    label: {
        ...TYPOGRAPHY_V2.focus.action,
        color: COLORS.text.inverse,
    },
    labelSecondary: {
        color: APP_CHROME.accent,
    },
});
