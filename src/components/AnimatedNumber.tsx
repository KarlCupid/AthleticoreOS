import React, { useEffect } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import {
    useSharedValue,
    useDerivedValue,
    withTiming,
    Easing,
    useAnimatedReaction,
    runOnJS,
} from 'react-native-reanimated';
import { ANIMATION } from '../theme/theme';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    style?: StyleProp<TextStyle>;
}

export function AnimatedNumber({
    value,
    duration = ANIMATION.slow,
    prefix = '',
    suffix = '',
    decimals = 0,
    style,
}: AnimatedNumberProps) {
    const animatedValue = useSharedValue(0);
    const [displayValue, setDisplayValue] = React.useState(0);

    useEffect(() => {
        animatedValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.cubic),
        });
    }, [value, duration]);

    const updateDisplay = (v: number) => {
        setDisplayValue(v);
    };

    useAnimatedReaction(
        () => animatedValue.value,
        (current) => {
            runOnJS(updateDisplay)(current);
        }
    );

    const formatted = decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.round(displayValue).toString();

    return (
        <Text style={style}>
            {prefix}{formatted}{suffix}
        </Text>
    );
}
