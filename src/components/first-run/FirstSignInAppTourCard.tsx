import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../Card';
import { AnimatedPressable } from '../AnimatedPressable';
import { IconChevronRight } from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';

export type FirstSignInAppTourStepId =
  | 'today_mission'
  | 'training'
  | 'fueling'
  | 'check_in'
  | 'journey'
  | 'fight_hub';

export interface FirstSignInAppTourStep {
  id: FirstSignInAppTourStepId;
  title: string;
  body: string;
  actionLabel: string;
}

interface FirstSignInAppTourCardProps {
  steps: FirstSignInAppTourStep[];
  currentIndex: number;
  paused: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onResume: () => void;
  onOpenStep: (step: FirstSignInAppTourStep) => void;
}

export function FirstSignInAppTourCard({
  steps,
  currentIndex,
  paused,
  onBack,
  onNext,
  onSkip,
  onResume,
  onOpenStep,
}: FirstSignInAppTourCardProps) {
  const safeIndex = Math.max(0, Math.min(currentIndex, Math.max(steps.length - 1, 0)));
  const step = steps[safeIndex];
  const isLast = safeIndex >= steps.length - 1;

  if (!step) return null;

  if (paused) {
    return (
      <Card style={styles.card} backgroundTone="planning" backgroundScrimColor="rgba(10, 10, 10, 0.72)">
        <View style={styles.topRow}>
          <Text style={styles.kicker}>FIRST LOOK</Text>
          <Text style={styles.progress}>Saved</Text>
        </View>
        <Text style={styles.title}>Pick up the walkthrough</Text>
        <Text style={styles.body}>
          Your walkthrough is saved. Today's Mission and the main actions stay open when you need them.
        </Text>
        <AnimatedPressable
          testID="first-sign-in-tour-resume"
          style={styles.primaryButton}
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel="Resume first-run walkthrough"
        >
          <Text style={styles.primaryText}>Resume walkthrough</Text>
          <IconChevronRight size={18} color={COLORS.text.inverse} />
        </AnimatedPressable>
      </Card>
    );
  }

  return (
    <Card style={styles.card} backgroundTone="planning" backgroundScrimColor="rgba(10, 10, 10, 0.72)">
      <View style={styles.topRow}>
        <Text style={styles.kicker}>FIRST LOOK</Text>
        <Text style={styles.progress}>{safeIndex + 1}/{steps.length}</Text>
      </View>

      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.actionRow}>
        <AnimatedPressable
          testID="first-sign-in-tour-open-step"
          style={styles.secondaryButton}
          onPress={() => onOpenStep(step)}
          accessibilityRole="button"
          accessibilityLabel={step.actionLabel}
        >
          <Text style={styles.secondaryText}>{step.actionLabel}</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.footerRow}>
        <AnimatedPressable
          testID="first-sign-in-tour-skip"
          style={styles.quietButton}
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel="Save walkthrough for later"
        >
          <Text style={styles.quietText}>Save for later</Text>
        </AnimatedPressable>

        <View style={styles.navButtons}>
          {safeIndex > 0 ? (
            <AnimatedPressable
              testID="first-sign-in-tour-back"
              style={styles.navButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Previous walkthrough step"
            >
              <Text style={styles.navText}>Back</Text>
            </AnimatedPressable>
          ) : null}

          <AnimatedPressable
            testID={isLast ? 'first-sign-in-tour-complete' : 'first-sign-in-tour-next'}
            style={styles.primaryButton}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Finish first-run walkthrough' : 'Next walkthrough step'}
          >
            <Text style={styles.primaryText}>{isLast ? 'Done' : 'Next'}</Text>
            <IconChevronRight size={18} color={COLORS.text.inverse} />
          </AnimatedPressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.24)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  progress: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  title: {
    marginTop: SPACING.sm,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  body: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  actionRow: {
    marginTop: SPACING.md,
  },
  footerRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  primaryText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.inverse,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secondaryText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    textAlign: 'center',
  },
  quietButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  quietText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  navButton: {
    minHeight: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(10, 10, 10, 0.30)',
  },
  navText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
});
