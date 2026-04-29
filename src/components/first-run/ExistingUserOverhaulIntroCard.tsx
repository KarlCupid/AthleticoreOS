import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import { IconChevronRight } from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';

interface ExistingUserOverhaulIntroCardProps {
  missingDataPrompts: string[];
  onContinue: () => void;
  onDismiss: () => void;
  onReviewMissingData: () => void;
}

const CONTINUITY_NOTES = [
  {
    title: 'What changed',
    body: "Today's Mission brings the key pieces together so you know what to do and why.",
  },
  {
    title: 'What stayed',
    body: 'Your history is coming with you. Athleticore now uses it to guide your daily mission, phase transitions, fueling, and readiness.',
  },
  {
    title: 'No restart',
    body: 'Plans no longer restart from scratch. When your phase or fight timeline changes, Athleticore adjusts the journey.',
  },
  {
    title: 'Anchors stay anchored',
    body: 'Protected workouts stay anchored while the supporting work adapts.',
  },
];

export function ExistingUserOverhaulIntroCard({
  missingDataPrompts,
  onContinue,
  onDismiss,
  onReviewMissingData,
}: ExistingUserOverhaulIntroCardProps) {
  const hasMissingData = missingDataPrompts.length > 0;

  return (
    <View testID="existing-user-overhaul-intro">
      <Card
        style={styles.card}
        backgroundTone="planning"
        backgroundScrimColor="rgba(10, 10, 10, 0.72)"
      >
      <View style={styles.topRow}>
        <Text style={styles.kicker}>GUIDED JOURNEY</Text>
        <Text style={styles.status}>Updated</Text>
      </View>

      <Text style={styles.title}>Your history is coming with you</Text>
      <Text style={styles.body}>
        Your app is now organized around your athlete journey. Your training, fueling, readiness, body mass, and fight timeline work together through Today's Mission.
      </Text>

      <View style={styles.noteGrid}>
        {CONTINUITY_NOTES.map((note) => (
          <View key={note.title} style={styles.note}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteBody}>{note.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.contextBox}>
        <Text style={styles.contextTitle}>Worth updating</Text>
        {hasMissingData ? (
          <View style={styles.promptList}>
            {missingDataPrompts.map((prompt) => (
              <View key={prompt} style={styles.promptRow}>
                <View style={styles.promptDot} />
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.contextBody}>
            No critical setup gaps found. You can keep moving from Today's Mission.
          </Text>
        )}
      </View>

      <Text style={styles.safetyCopy}>
        Fight opportunities, fueling, readiness, and body-mass context stay connected. Athleticore keeps weight-class guidance safety-first and asks for more context when it needs it.
      </Text>

      <View style={styles.footerRow}>
        <AnimatedPressable
          testID="existing-user-overhaul-dismiss"
          style={styles.quietButton}
          onPress={onDismiss}
        >
          <Text style={styles.quietText}>Dismiss</Text>
        </AnimatedPressable>

        <View style={styles.actionButtons}>
          {hasMissingData ? (
            <AnimatedPressable
              testID="existing-user-overhaul-review-missing"
              style={styles.secondaryButton}
              onPress={onReviewMissingData}
            >
              <Text style={styles.secondaryText}>Review missing context</Text>
            </AnimatedPressable>
          ) : null}

          <AnimatedPressable
            testID="existing-user-overhaul-continue"
            style={styles.primaryButton}
            onPress={onContinue}
          >
            <Text style={styles.primaryText}>Open Today's Mission</Text>
            <IconChevronRight size={18} color={COLORS.text.inverse} />
          </AnimatedPressable>
        </View>
      </View>
      </Card>
    </View>
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
  status: {
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
  noteGrid: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  note: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(245, 245, 240, 0.06)',
  },
  noteTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  noteBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  contextBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: COLORS.accentLight,
  },
  contextTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  contextBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  promptList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  promptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: COLORS.accent,
  },
  promptText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  safetyCopy: {
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  footerRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
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
  secondaryButton: {
    minHeight: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: 'rgba(10, 10, 10, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  secondaryText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
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
});
