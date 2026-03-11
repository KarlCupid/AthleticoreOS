import React, { ReactNode } from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ANIMATION } from '../theme/theme';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps {
    children: ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    haptic?: boolean;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    activeScale?: number;
}

export function AnimatedPressable({
    children,
    onPress,
    onLongPress,
    haptic = false,
    style,
    disabled = false,
    activeScale = 0.97,
}: AnimatedPressableProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(activeScale, ANIMATION.spring);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, ANIMATION.spring);
    };

    const handlePress = () => {
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    };

    return (
        <AnimatedPressableView
            onPress={handlePress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={[animatedStyle, style]}
        >
            {children}
        </AnimatedPressableView>
    );
}
