import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { RADIUS, SPACING, SHADOWS } from '../theme/theme';

interface GlassCardProps {
    children: ReactNode;
    intensity?: number;
    style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, intensity = 40, style }: GlassCardProps) {
    if (Platform.OS === 'ios') {
        return (
            <View style={[styles.wrapper, style]}>
                <BlurView intensity={intensity} tint="light" style={styles.blur}>
                    <View style={styles.content}>{children}</View>
                </BlurView>
            </View>
        );
    }

    // Android fallback: semi-transparent solid background
    return (
        <View style={[styles.wrapper, styles.androidFallback, style]}>
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    blur: {
        flex: 1,
    },
    content: {
        padding: SPACING.lg,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    androidFallback: {
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
});
