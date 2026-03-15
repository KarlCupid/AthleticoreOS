import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../theme/theme';

interface SkeletonLoaderProps {
    width: DimensionValue;
    height: number;
    shape?: 'rect' | 'circle' | 'text';
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
    width,
    height,
    shape = 'rect',
    borderRadius,
    style,
}: SkeletonLoaderProps) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: interpolate(
                    shimmer.value,
                    [0, 1],
                    [-200, 200]
                ),
            },
        ],
    }));

    const resolvedRadius =
        borderRadius ??
        (shape === 'circle' ? (typeof height === 'number' ? height / 2 : 999) :
         shape === 'text' ? RADIUS.sm :
         RADIUS.md);

    return (
        <View
            style={[
                styles.container,
                {
                    width: shape === 'circle' ? height : width,
                    height,
                    borderRadius: resolvedRadius,
                },
                style,
            ]}
        >
            <Animated.View style={[styles.shimmer, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surfaceSecondary,
        overflow: 'hidden',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
        width: 200,
    },
    gradient: {
        flex: 1,
    },
});
