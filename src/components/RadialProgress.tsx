import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { COLORS, FONT_FAMILY, SPACING } from '../theme/theme';

interface RadialProgressProps {
    progress: number; // 0-1
    size?: number;
    strokeWidth?: number;
    color: string;
    trackColor?: string;
    label?: string;
    sublabel?: string;
    icon?: React.ReactNode;
    textColor?: string;
}

export function RadialProgress({
    progress,
    size = 100,
    strokeWidth = 8,
    color,
    trackColor = COLORS.borderLight,
    label,
    sublabel,
    icon,
    textColor = COLORS.text.primary,
}: RadialProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, { width: size }]}>
                <View style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: strokeWidth,
                    borderColor: trackColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <View style={styles.centerContent}>
                        {icon ? (
                            icon
                        ) : label ? (
                            <Text style={[styles.centerLabel, { color: textColor }]} numberOfLines={1}>
                                {label}
                            </Text>
                        ) : null}
                    </View>
                </View>
                {sublabel && (
                    <Text style={styles.sublabel} numberOfLines={1}>
                        {sublabel}
                    </Text>
                )}
            </View>
        );
    }

    // Track path (full circle) - only run on native
    const trackPath = Skia.Path.Make();
    trackPath.addCircle(center, center, radius);

    // Progress arc path
    const progressPath = Skia.Path.Make();
    if (clampedProgress > 0) {
        const startAngle = -90;
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
        <View style={[styles.container, { width: size }]}>
            <View style={{ width: size, height: size }}>
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
                <View style={styles.centerContent}>
                    {icon ? (
                        icon
                    ) : label ? (
                        <Text style={[styles.centerLabel, { color: textColor }]} numberOfLines={1}>
                            {label}
                        </Text>
                    ) : null}
                </View>
            </View>
            {sublabel && (
                <Text style={[styles.sublabel, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                    {sublabel}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    centerContent: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLabel: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.primary,
    },
    sublabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.secondary,
        marginTop: SPACING.xs,
    },
});
