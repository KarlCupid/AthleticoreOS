import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

interface PRCelebrationProps {
  visible: boolean;
  exerciseName: string;
  prType: 'weight' | 'reps' | 'e1rm';
  value: number;
  previousValue: number | null;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PR_TYPE_LABELS: Record<PRCelebrationProps['prType'], string> = {
  weight: 'Weight PR',
  reps: 'Rep PR',
  e1rm: 'Estimated 1RM',
};

const PR_TYPE_UNITS: Record<PRCelebrationProps['prType'], string> = {
  weight: 'lbs',
  reps: 'reps',
  e1rm: 'lbs',
};

const CONFETTI_COLORS = [
  COLORS.accent,
  COLORS.success,
  COLORS.warning,
  '#F472B6',
  '#A78BFA',
  '#34D399',
  '#FBBF24',
  '#FB923C',
];

interface ConfettiDot {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

function generateConfetti(count: number): ConfettiDot[] {
  const dots: ConfettiDot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      id: i,
      x: Math.random() * (SCREEN_WIDTH - 40) + 20,
      y: Math.random() * (SCREEN_HEIGHT * 0.6) + SCREEN_HEIGHT * 0.1,
      size: Math.random() * 8 + 4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 500,
    });
  }
  return dots;
}

function ConfettiDots() {
  const dots = useMemo(() => generateConfetti(30), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((dot) => (
        <Animated.View
          key={dot.id}
          entering={FadeIn.delay(dot.delay).duration(400)}
          style={[
            styles.confettiDot,
            {
              left: dot.x,
              top: dot.y,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: dot.color,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function PRCelebration({
  visible,
  exerciseName,
  prType,
  value,
  previousValue,
  onDismiss,
}: PRCelebrationProps) {
  const improvement =
    previousValue !== null ? value - previousValue : null;
  const unit = PR_TYPE_UNITS[prType];
  const typeLabel = PR_TYPE_LABELS[prType];

  const formattedValue =
    prType === 'reps' ? `${value}` : `${value}`;

  const formattedImprovement =
    improvement !== null
      ? prType === 'reps'
        ? `+${improvement}`
        : `+${improvement}`
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <ConfettiDots />

        <Animated.View
          entering={ZoomIn.springify().damping(12).stiffness(150)}
          style={styles.card}
        >
          {/* Trophy */}
          <Text style={styles.trophy}>{'\uD83C\uDFC6'}</Text>

          {/* NEW PR */}
          <Text style={styles.headline}>NEW PR!</Text>

          {/* Exercise name */}
          <Text style={styles.exerciseName}>{exerciseName}</Text>

          {/* Type label */}
          <Text style={styles.typeLabel}>{typeLabel}</Text>

          {/* Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.value}>{formattedValue}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>

          {/* Improvement */}
          {formattedImprovement !== null && previousValue !== null && (
            <Animated.View
              entering={FadeIn.delay(300).duration(400)}
              style={styles.improvementContainer}
            >
              <Text style={styles.improvementText}>
                {formattedImprovement} {unit} from {previousValue} {unit}
              </Text>
            </Animated.View>
          )}

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissBtnText}>Nice!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.82,
    maxWidth: 360,
    ...SHADOWS.lg,
  },
  trophy: {
    fontSize: 56,
    marginBottom: SPACING.sm,
  },
  headline: {
    fontFamily: FONT_FAMILY.black,
    fontSize: 32,
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  exerciseName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 18,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  typeLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  value: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 48,
    color: COLORS.text.primary,
  },
  unit: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 18,
    color: COLORS.text.secondary,
  },
  improvementContainer: {
    backgroundColor: COLORS.success + '1A',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  improvementText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.success,
  },
  dismissBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl * 1.5,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  dismissBtnText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  confettiDot: {
    position: 'absolute',
  },
});
