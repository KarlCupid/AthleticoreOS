import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    FadeInUp,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { AnimatedNumber } from './AnimatedNumber';

interface AnimatedWaveProps {
    size: number;
    color: string;
    duration: number;
    offset: number;
    initialRotation?: number;
}

const AnimatedWave = ({ size, color, duration, offset, initialRotation = 0 }: AnimatedWaveProps) => {
    const progress = useSharedValue(0);

    React.useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration, easing: Easing.linear }),
            -1, // infinite
            false // do not reverse
        );
    }, [duration]);

    const animatedStyle = useAnimatedStyle(() => {
        const deg = initialRotation + (progress.value * 360);
        return {
            transform: [{ rotate: `${deg}deg` }],
        };
    });

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: '50%',
                    bottom: -size + offset,
                    marginLeft: -size / 2,
                    width: size,
                    height: size,
                    borderRadius: size * 0.43,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
};

interface AnimatedBlobProps {
    size: number;
    color: string;
    duration: number;
    top: any;
    left: any;
    initialRotation?: number;
}

const AnimatedBackgroundBlob = ({ size, color, duration, top, left, initialRotation = 0 }: AnimatedBlobProps) => {
    const progress = useSharedValue(0);

    React.useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration, easing: Easing.linear }),
            -1, // infinite
            false // do not reverse
        );
    }, [duration]);

    const animatedStyle = useAnimatedStyle(() => {
        const deg = initialRotation + (progress.value * 360);
        return {
            transform: [{ rotate: `${deg}deg` }],
        };
    });

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top,
                    left,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    width: size,
                    height: size,
                    borderRadius: size * 0.45,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
};


interface HeroHeaderProps {
    greeting: string;
    phase: string;
    readinessScore: number;
    readinessLabel: string;
    acwr?: number;
    sleep?: number;
    weight?: string;
    weightTrend?: 'up' | 'down' | 'stable';
}

export function HeroHeader({
    greeting,
    phase,
    readinessScore,
    readinessLabel,
    acwr,
    sleep,
    weight,
    weightTrend,
}: HeroHeaderProps) {
    const insets = useSafeAreaInsets();
    const { gradient } = useReadinessTheme();

    const dots = 10;
    const filledDots = Math.round((readinessScore / 100) * dots);

    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + SPACING.md,
                        backgroundColor: gradient[1] as string, // solid background base
                    }
                ]}
            >
                {/* Flowing Ambient Background Gradient Replacement */}
                <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
                    <AnimatedBackgroundBlob size={800} color={gradient[0] as string} duration={25000} top="10%" left="20%" initialRotation={0} />
                    <AnimatedBackgroundBlob size={900} color={gradient[0] as string} duration={32000} top="60%" left="85%" initialRotation={120} />
                    <AnimatedBackgroundBlob size={600} color="rgba(255,255,255,0.08)" duration={18000} top="30%" left="50%" initialRotation={240} />
                </View>

                {/* Absolute Waves in relative container */}
                <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
                    <AnimatedWave size={1200} color="rgba(255,255,255,0.15)" offset={60} duration={14000} initialRotation={0} />
                    <AnimatedWave size={1250} color="rgba(255,255,255,0.25)" offset={45} duration={18000} initialRotation={45} />
                    <AnimatedWave size={1200} color={COLORS.background} offset={25} duration={22000} initialRotation={90} />
                </View>

                {/* Content elevated over the waves */}
                <View style={styles.contentWrap}>
                    {/* Greeting */}
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.phase}>{phase}</Text>

                    {/* Readiness Score */}
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(ANIMATION.slow).springify()}
                        style={styles.scoreContainer}
                    >
                        <Text style={styles.scoreLabel}>READINESS</Text>
                        <AnimatedNumber
                            value={readinessScore}
                            duration={800}
                            style={styles.scoreValue}
                        />
                        <View style={styles.dotsRow}>
                            {Array.from({ length: dots }).map((_, i) => (
                                <Animated.View
                                    key={i}
                                    entering={FadeInUp.delay(400 + i * 40).duration(300)}
                                    style={[
                                        styles.dot,
                                        i < filledDots ? styles.dotFilled : styles.dotEmpty,
                                    ]}
                                />
                            ))}
                            <Text style={styles.levelLabel}>{readinessLabel}</Text>
                        </View>
                    </Animated.View>

                    {/* Mini Stats Row */}
                    <Animated.View
                        entering={FadeInUp.delay(600).duration(ANIMATION.slow).springify()}
                        style={styles.statsRow}
                    >
                        {acwr !== undefined && (
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{acwr.toFixed(2)}</Text>
                                <Text style={styles.statLabel}>ACWR</Text>
                            </View>
                        )}
                        {sleep !== undefined && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{sleep}/5</Text>
                                    <Text style={styles.statLabel}>Sleep</Text>
                                </View>
                            </>
                        )}
                        {weight && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                        <Text style={styles.statValue}>{weight}</Text>
                                        {weightTrend && (
                                            <Text style={{
                                                fontSize: 14,
                                                fontFamily: FONT_FAMILY.extraBold,
                                                color: weightTrend === 'down' ? '#4ADE80'
                                                    : weightTrend === 'up' ? '#F87171'
                                                        : 'rgba(255,255,255,0.5)',
                                            }}>
                                                {weightTrend === 'down' ? '↓' : weightTrend === 'up' ? '↑' : '→'}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.statLabel}>Weight</Text>
                                </View>
                            </>
                        )}
                    </Animated.View>
                </View>

                {/* Spacer to push content above the lowest solid wave */}
                <View style={styles.waveSpacer} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: COLORS.background,
    },
    container: {
        paddingBottom: 0,
        position: 'relative',
        overflow: 'hidden',
    },
    contentWrap: {
        zIndex: 2,
        paddingHorizontal: SPACING.lg,
    },
    waveSpacer: {
        height: 80,
    },
    greeting: {
        fontSize: 22,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
        marginBottom: 2,
    },
    phase: {
        fontSize: 14,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: SPACING.lg,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    scoreLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.semiBold,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1.5,
        marginBottom: SPACING.xs,
    },
    scoreValue: {
        fontSize: 56,
        fontFamily: FONT_FAMILY.black,
        color: COLORS.text.inverse,
        lineHeight: 62,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.sm,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotFilled: {
        backgroundColor: COLORS.text.inverse,
    },
    dotEmpty: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    levelLabel: {
        fontSize: 13,
        fontFamily: FONT_FAMILY.semiBold,
        color: COLORS.text.inverse,
        marginLeft: SPACING.sm,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    statValue: {
        fontSize: 16,
        fontFamily: FONT_FAMILY.extraBold,
        color: COLORS.text.inverse,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: FONT_FAMILY.regular,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
