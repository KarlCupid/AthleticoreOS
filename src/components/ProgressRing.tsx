import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { COLORS, FONT_FAMILY } from '../theme/theme';

interface ProgressRingProps {
    progress: number; // 0-1
    size?: number;
    strokeWidth?: number;
    color: string;
    trackColor?: string;
    label?: string;
    labelStyle?: any;
}

export function ProgressRing({
    progress,
    size = 48,
    strokeWidth = 4,
    color,
    trackColor = COLORS.borderLight,
    label,
    labelStyle,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    // Track path (full circle)
    const trackPath = Skia.Path.Make();
    trackPath.addCircle(center, center, radius);

    // Progress arc path
    const progressPath = Skia.Path.Make();
    if (clampedProgress > 0) {
        const startAngle = -90; // Start from top
        const sweepAngle = clampedProgress * 360;
        const rect = Skia.XYWHRect(
            center - radius,
            center - radius,
            radius * 2,
            radius * 2
        );
        progressPath.addArc(rect, startAngle, sweepAngle);
    }

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Canvas style={{ width: size, height: size }}>
                <Path
                    path={trackPath}
                    style="stroke"
                    strokeWidth={strokeWidth}
                    color={trackColor}
                    strokeCap="round"
                />
                {clampedProgress > 0 && (
                    <Path
                        path={progressPath}
                        style="stroke"
                        strokeWidth={strokeWidth}
                        color={color}
                        strokeCap="round"
                    />
                )}
            </Canvas>
            {label !== undefined && (
                <View style={styles.labelContainer}>
                    <Text style={[styles.label, labelStyle]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    labelContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.primary,
    },
});
