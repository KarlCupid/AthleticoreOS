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

// ---------------------------------------------------------------------------
// Types — identical to RestTimerOverlay for drop-in replacement
// ---------------------------------------------------------------------------

interface SkiaRestTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  exerciseType: string;
  nextExerciseName: string | null;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}

// ---------------------------------------------------------------------------
// Rolling digit — slides old digit out, new digit in
// ---------------------------------------------------------------------------

function RollingDigit({ digit }: { digit: string }) {
  const prevRef = useRef(digit);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (prevRef.current === digit) return;
    prevRef.current = digit;

    // Slide out up, then snap to bottom, slide in up
    translateY.value = 0;
    opacity.value = 1;
    translateY.value = withSequence(
      withTiming(-20, { duration: 100, easing: Easing.in(Easing.ease) }),
      withTiming(20, { duration: 0 }),
      withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) }),
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 150 }),
    );
  }, [digit]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.digitText, style]}>{digit}</Animated.Text>
  );
}

function RollingTimeDisplay({
  remainingSeconds,
  isUrgent,
}: {
  remainingSeconds: number;
  isUrgent: boolean;
}) {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const m = String(mins);
  const s0 = Math.floor(secs / 10).toString();
  const s1 = (secs % 10).toString();

  const urgentStyle = isUrgent ? styles.digitTextUrgent : null;

  return (
    <View style={styles.timeRow}>
      <View style={styles.digitWrap}>
        <RollingDigit digit={m} />
      </View>
      <Text style={[styles.colonText, urgentStyle]}>:</Text>
      <View style={styles.digitWrap}>
        <RollingDigit digit={s0} />
      </View>
      <View style={styles.digitWrap}>
        <RollingDigit digit={s1} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SIZE = TIMER_DIMENSIONS.ringSize;
const CENTER = SIZE / 2;
const STROKE = TIMER_DIMENSIONS.ringStroke;
const RADIUS = (SIZE - STROKE) / 2;

export function SkiaRestTimer({
  totalSeconds,
  remainingSeconds,
  exerciseType,
  nextExerciseName,
  onSkip,
  onExtend,
}: SkiaRestTimerProps) {
  // Haptic milestones
  useTimerHaptics({ remainingSeconds, totalSeconds });

  // Web Fallback: Render a simplified timer to avoid Skia crashes
  if (Platform.OS === 'web') {
    const isUrgentWeb = remainingSeconds <= 10 && remainingSeconds > 0;
    return (
      <View style={styles.overlay}>
        <View style={styles.ringContainer}>
          <View 
            style={[
              styles.webRingFallback, 
              { 
                borderColor: isUrgentWeb ? COLORS.error : '#0FA888',
                borderWidth: STROKE,
                borderRadius: SIZE / 2,
                width: SIZE,
                height: SIZE,
              }
            ]} 
          />
          <View style={styles.centerContent} pointerEvents="none">
             <View style={styles.timeRow}>
                <Text style={[styles.digitText, isUrgentWeb && styles.digitTextUrgent]}>
                  {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                </Text>
             </View>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.exerciseLabel} numberOfLines={1}>
              {exerciseType}
            </Text>
          </View>
        </View>

        <RestTimerActions
          onSkip={onSkip}
          onExtend={onExtend}
          nextExerciseName={nextExerciseName}
        />
      </View>
    );
  }

  // Core sweep angle (degrees, 360 = full, 0 = done)
  const sweepAngle = useSharedValue(360);

  useEffect(() => {
    const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    sweepAngle.value = withTiming(progress * 360, {
      duration: 900,
      easing: Easing.inOut(Easing.ease),
    });
  }, [remainingSeconds, totalSeconds]);

  // Urgency 0 (calm) → 1 (done)
  const urgency = useDerivedValue(() => 1 - sweepAngle.value / 360);

  // Arc progress path (reactive)
  const arcPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (sweepAngle.value > 0.5) {
      const rect = Skia.XYWHRect(
        CENTER - RADIUS,
        CENTER - RADIUS,
        RADIUS * 2,
        RADIUS * 2,
      );
      path.addArc(rect, -90, sweepAngle.value);
    }
    return path;
  });

  // Arc stroke color: mint → amber → red as progress drains
  const arcColor = useDerivedValue(() => {
    const p = sweepAngle.value / 360; // 1 = full, 0 = empty
    return interpolateColor(
      p,
      [0, 0.15, 0.30, 1.0],
      ['#DC2626', '#DC2626', '#D97706', '#0FA888'],
    );
  });

  // Outer glow layer — same path, wider + semi-transparent
  const glowColor = useDerivedValue(() => {
    const p = sweepAngle.value / 360;
    return interpolateColor(
      p,
      [0, 0.15, 0.30, 1.0],
      ['rgba(220,38,38,0.18)', 'rgba(220,38,38,0.18)', 'rgba(217,119,6,0.18)', 'rgba(15,168,136,0.18)'],
    );
  });

  // Middle glow layer
  const glowColor2 = useDerivedValue(() => {
    const p = sweepAngle.value / 360;
    return interpolateColor(
      p,
      [0, 0.15, 0.30, 1.0],
      ['rgba(220,38,38,0.10)', 'rgba(220,38,38,0.10)', 'rgba(217,119,6,0.10)', 'rgba(15,168,136,0.10)'],
    );
  });

  // End-cap dot position
  const tipCx = useDerivedValue(() => {
    const rad = ((-90 + sweepAngle.value) * Math.PI) / 180;
    return CENTER + RADIUS * Math.cos(rad);
  });
  const tipCy = useDerivedValue(() => {
    const rad = ((-90 + sweepAngle.value) * Math.PI) / 180;
    return CENTER + RADIUS * Math.sin(rad);
  });

  // Pulsing scale when urgency kicks in (<= 10s)
  const pulseScale = useSharedValue(1);
  const isPulsing = useRef(false);

  useEffect(() => {
    const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;
    if (isUrgent && !isPulsing.current) {
      isPulsing.current = true;
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0,  { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    } else if (!isUrgent && isPulsing.current) {
      isPulsing.current = false;
      pulseScale.value = withTiming(1.0, { duration: 200 });
    }
  }, [remainingSeconds]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <View style={styles.overlay}>
      {/* Ring + center content */}
      <View style={styles.ringContainer}>
        <Canvas style={{ width: SIZE, height: SIZE }}>
          {/* Ambient breathing ring */}
          <BreathingRing cx={CENTER} cy={CENTER} />

          {/* Floating particles */}
          <AmbientParticles canvasSize={SIZE} urgency={urgency} />

          {/* Track ring (faint full circle) */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            style="stroke"
            strokeWidth={STROKE}
            color={TIMER_COLORS.track}
          />

          {/* Outer glow — widest, most transparent */}
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={TIMER_DIMENSIONS.glowStroke + 8}
            color={glowColor2}
            strokeCap="round"
          />

          {/* Inner glow — medium, semi-transparent */}
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={TIMER_DIMENSIONS.glowStroke}
            color={glowColor}
            strokeCap="round"
          />

          {/* Progress arc — sharp, full opacity */}
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={STROKE}
            color={arcColor}
            strokeCap="round"
          />

          {/* End-cap dot at arc tip */}
          <Circle
            cx={tipCx}
            cy={tipCy}
            r={TIMER_DIMENSIONS.endCapRadius}
            color={arcColor}
          />
        </Canvas>

        {/* Center overlay — time display */}
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

      {/* Skip / Extend / Up Next */}
      <RestTimerActions
        onSkip={onSkip}
        onExtend={onExtend}
        nextExerciseName={nextExerciseName}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  digitTextUrgent: {
    color: COLORS.error,
  },
  colonText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 48,
    lineHeight: 60,
    color: '#FFFFFF',
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
