import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { ANIMATION, APP_CHROME, COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2, TAP_TARGETS } from '../../theme/theme';

// Used for 2–3 option selections in Morning Flow and Quick Fuel screens.
// Replaces numeric sliders for check-in flows.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickSelectButtonProps {
    label: string;
    sublabel?: string;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function QuickSelectButton({ label, sublabel, selected, onPress, disabled = false, style }: QuickSelectButtonProps) {
    const borderColor = useSharedValue(selected ? APP_CHROME.accent : COLORS.border);
    const bgColor = useSharedValue(selected ? '#F0FFF8' : COLORS.surface);

    React.useEffect(() => {
        borderColor.value = withTiming(selected ? APP_CHROME.accent : COLORS.border, { duration: 150 });
        bgColor.value = withTiming(selected ? '#F0FFF8' : COLORS.surface, { duration: 150 });
    }, [selected]);

    const animatedStyle = useAnimatedStyle(() => ({
        borderColor: borderColor.value,
        backgroundColor: bgColor.value,
        opacity: disabled ? 0.4 : 1,
    }));

    return (
        <AnimatedPressable
            onPress={disabled ? undefined : onPress}
            style={[styles.button, animatedStyle, style]}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
            {sublabel && (
                <Text style={[styles.sublabel, selected && styles.sublabelSelected]}>{sublabel}</Text>
            )}
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: TAP_TARGETS.focusPrimary.recommended, // 72dp
        borderWidth: 2,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        flex: 1,
    },
    label: {
        ...TYPOGRAPHY_V2.plan.headline,
        color: COLORS.text.primary,
    },
    labelSelected: {
        color: APP_CHROME.accent,
        fontFamily: FONT_FAMILY.extraBold,
    },
    sublabel: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.secondary,
        marginTop: 3,
    },
    sublabelSelected: {
        color: APP_CHROME.accent,
    },
});
