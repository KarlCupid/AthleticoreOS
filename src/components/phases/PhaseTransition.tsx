import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    runOnJS,
} from 'react-native-reanimated';
import { APP_CHROME, COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';

// Brief phase transition screen shown between camp phases (GPP→SPP, SPP→Peak, etc.)
// Auto-advances after 3 seconds. Lazy-loaded — only import in phase-aware navigation.

interface PhaseTransitionProps {
    fromPhase: string;  // e.g. "General Physical Preparation"
    toPhase: string;    // e.g. "Specific Physical Preparation"
    tagline: string;    // Motivational one-liner from engine
    onComplete: () => void;
    displayMs?: number; // Default 3000ms
}

const PHASE_MOTIVATIONS: Record<string, string> = {
    'GPP → SPP': 'Foundation built. Now make it specific.',
    'SPP → Peak': 'Volume drops. Intensity spikes. Trust the plan.',
    'Peak → Fight Week': 'One week out. Sharpen, don\'t grind.',
    default: 'New phase. Same standard.',
};

export function PhaseTransition({ fromPhase, toPhase, tagline, onComplete, displayMs = 3000 }: PhaseTransitionProps) {
    const opacity = useSharedValue(0);
    const arrowOpacity = useSharedValue(0);

    useEffect(() => {
        // Fade in
        opacity.value = withTiming(1, { duration: 400 });
        arrowOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

        // Auto-advance after displayMs
        const timer = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 400 }, (done) => {
                if (done) runOnJS(onComplete)();
            });
        }, displayMs);

        return () => clearTimeout(timer);
    }, []);

    const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const arrowStyle = useAnimatedStyle(() => ({ opacity: arrowOpacity.value }));

    return (
        <Animated.View style={[styles.screen, containerStyle]}>
            <View style={styles.content}>
                {/* From → To */}
                <Text style={styles.fromLabel}>{fromPhase}</Text>
                <Animated.Text style={[styles.arrow, arrowStyle]}>↓</Animated.Text>
                <Text style={styles.toLabel}>{toPhase}</Text>

                {/* Accent bar */}
                <View style={styles.accent} />

                {/* Tagline */}
                <Text style={styles.tagline}>{tagline}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: APP_CHROME.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    content: {
        alignItems: 'center',
        gap: SPACING.sm,
    },
    fromLabel: {
        ...TYPOGRAPHY_V2.plan.caption,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    arrow: {
        fontSize: 32,
        color: APP_CHROME.accent,
        fontFamily: FONT_FAMILY.semiBold,
    },
    toLabel: {
        ...TYPOGRAPHY_V2.plan.display,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    accent: {
        width: 40,
        height: 3,
        backgroundColor: APP_CHROME.accent,
        borderRadius: 2,
        marginVertical: SPACING.md,
    },
    tagline: {
        ...TYPOGRAPHY_V2.plan.body,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 26,
    },
});
