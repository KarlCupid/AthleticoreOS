import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';

import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  TIMER_COLORS,
  TIMER_DIMENSIONS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import { BreathingRing } from './BreathingRing';
import { AmbientParticles } from './AmbientParticles';
import { RestTimerActions } from './RestTimerActions';
import { useTimerHaptics } from './useTimerHaptics';

interface SkiaRestTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  exerciseType: string;
  nextExerciseName: string | null;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}

const SIZE = TIMER_DIMENSIONS.ringSize;
const CENTER = SIZE / 2;
const STROKE = TIMER_DIMENSIONS.ringStroke;
const RADIUS = (SIZE - STROKE) / 2;

export function SkiaRestTimer(props: SkiaRestTimerProps) {
  if (Platform.OS === 'web') {
    return <SkiaRestTimerWeb {...props} />;
  }

  return <SkiaRestTimerNative {...props} />;
}

function RollingDigit({ digit }: { digit: string }) {
  const prevRef = useRef(digit);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (prevRef.current === digit) return;
    prevRef.current = digit;

    translateY.value = withSequence(
      withTiming(-20, { duration: 100, easing: Easing.in(Easing.ease) }),
      withTiming(20, { duration: 0 }),
      withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) }),
    );
    opacity.value = withSequence(withTiming(0, { duration: 100 }), withTiming(0, { duration: 0 }), withTiming(1, { duration: 150 }));
  }, [digit, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <Animated.Text style={[styles.digitText, style]}>{digit}</Animated.Text>;
}

function RollingTimeDisplay({ remainingSeconds, isUrgent }: { remainingSeconds: number; isUrgent: boolean }) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const urgentStyle = isUrgent ? styles.digitTextUrgent : null;

  return (
    <View style={styles.timeRow}>
      <View style={styles.digitWrap}>
        <RollingDigit digit={String(minutes)} />
      </View>
      <Text style={[styles.colonText, urgentStyle]}>:</Text>
      <View style={styles.digitWrap}>
        <RollingDigit digit={Math.floor(seconds / 10).toString()} />
      </View>
      <View style={styles.digitWrap}>
        <RollingDigit digit={(seconds % 10).toString()} />
      </View>
    </View>
  );
}

function SkiaRestTimerWeb({
  remainingSeconds,
  exerciseType,
  nextExerciseName,
  onSkip,
  onExtend,
}: SkiaRestTimerProps) {
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.ringContainer}>
        <View
          style={[
            styles.webRingFallback,
            {
              borderColor: isUrgent ? COLORS.error : '#D4AF37',
              borderWidth: STROKE,
              borderRadius: SIZE / 2,
              width: SIZE,
              height: SIZE,
            },
          ]}
        />
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={[styles.digitText, isUrgent && styles.digitTextUrgent]}>
            {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
          </Text>
          <Text style={styles.restLabel}>REST</Text>
          <Text style={styles.exerciseLabel} numberOfLines={1}>
            {exerciseType}
          </Text>
        </View>
      </View>

      <RestTimerActions onSkip={onSkip} onExtend={onExtend} nextExerciseName={nextExerciseName} />
    </View>
  );
}

function SkiaRestTimerNative({
  totalSeconds,
  remainingSeconds,
  exerciseType,
  nextExerciseName,
  onSkip,
  onExtend,
}: SkiaRestTimerProps) {
  useTimerHaptics({ remainingSeconds, totalSeconds });

  const sweepAngle = useSharedValue(360);
  const pulseScale = useSharedValue(1);
  const isPulsing = useRef(false);

  useEffect(() => {
    const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    sweepAngle.value = withTiming(progress * 360, {
      duration: 900,
      easing: Easing.inOut(Easing.ease),
    });
  }, [remainingSeconds, totalSeconds, sweepAngle]);

  useEffect(() => {
    const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;
    if (isUrgent && !isPulsing.current) {
      isPulsing.current = true;
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else if (!isUrgent && isPulsing.current) {
      isPulsing.current = false;
      pulseScale.value = withTiming(1.0, { duration: 200 });
    }
  }, [remainingSeconds, pulseScale]);

  const urgency = useDerivedValue(() => 1 - sweepAngle.value / 360);
  const arcPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (sweepAngle.value > 0.5) {
      path.addArc(Skia.XYWHRect(CENTER - RADIUS, CENTER - RADIUS, RADIUS * 2, RADIUS * 2), -90, sweepAngle.value);
    }
    return path;
  });
  const arcColor = useDerivedValue(() =>
    interpolateColor(sweepAngle.value / 360, [0, 0.15, 0.3, 1], ['#D9827E', '#D9827E', '#B8892D', '#D4AF37']),
  );
  const glowColor = useDerivedValue(() =>
    interpolateColor(
      sweepAngle.value / 360,
      [0, 0.15, 0.3, 1],
      ['rgba(220,38,38,0.18)', 'rgba(220,38,38,0.18)', 'rgba(217,119,6,0.18)', 'rgba(15,168,136,0.18)'],
    ),
  );
  const glowColor2 = useDerivedValue(() =>
    interpolateColor(
      sweepAngle.value / 360,
      [0, 0.15, 0.3, 1],
      ['rgba(220,38,38,0.10)', 'rgba(220,38,38,0.10)', 'rgba(217,119,6,0.10)', 'rgba(15,168,136,0.10)'],
    ),
  );
  const tipCx = useDerivedValue(() => CENTER + RADIUS * Math.cos(((-90 + sweepAngle.value) * Math.PI) / 180));
  const tipCy = useDerivedValue(() => CENTER + RADIUS * Math.sin(((-90 + sweepAngle.value) * Math.PI) / 180));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.ringContainer}>
        <Canvas style={{ width: SIZE, height: SIZE }}>
          <BreathingRing cx={CENTER} cy={CENTER} />
          <AmbientParticles canvasSize={SIZE} urgency={urgency} />
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} style="stroke" strokeWidth={STROKE} color={TIMER_COLORS.track} />
          <Path path={arcPath} style="stroke" strokeWidth={TIMER_DIMENSIONS.glowStroke + 8} color={glowColor2} strokeCap="round" />
          <Path path={arcPath} style="stroke" strokeWidth={TIMER_DIMENSIONS.glowStroke} color={glowColor} strokeCap="round" />
          <Path path={arcPath} style="stroke" strokeWidth={STROKE} color={arcColor} strokeCap="round" />
          <Circle cx={tipCx} cy={tipCy} r={TIMER_DIMENSIONS.endCapRadius} color={arcColor} />
        </Canvas>

        <View style={styles.centerContent} pointerEvents="none">
          <Animated.View style={pulseStyle}>
            <RollingTimeDisplay remainingSeconds={remainingSeconds} isUrgent={isUrgent} />
          </Animated.View>
          <Text style={styles.restLabel}>REST</Text>
          <Text style={styles.exerciseLabel} numberOfLines={1}>
            {exerciseType}
          </Text>
        </View>
      </View>

      <RestTimerActions onSkip={onSkip} onExtend={onExtend} nextExerciseName={nextExerciseName} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TIMER_COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    zIndex: 100,
  },
  ringContainer: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  webRingFallback: {
    ...StyleSheet.absoluteFillObject,
    borderStyle: 'solid',
    opacity: 0.3,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitWrap: {
    overflow: 'hidden',
    width: 34,
    alignItems: 'center',
  },
  digitText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 52,
    lineHeight: 60,
    color: '#F5F5F0',
    includeFontPadding: false,
  },
  digitTextUrgent: {
    color: COLORS.error,
  },
  colonText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 48,
    lineHeight: 60,
    color: '#F5F5F0',
    includeFontPadding: false,
    marginBottom: 4,
  },
  restLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.45)',
  },
  exerciseLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: TYPOGRAPHY_V2.focus.caption.fontSize,
    color: 'rgba(255,255,255,0.55)',
    maxWidth: SIZE * 0.6,
    textAlign: 'center',
  },
});
