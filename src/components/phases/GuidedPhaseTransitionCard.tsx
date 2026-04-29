import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { GuidedPhaseTransitionViewModel } from '../../../lib/performance-engine';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import {
  IconActivity,
  IconBarbell,
  IconCalendar,
  IconChevronRight,
  IconDroplets,
  IconInfo,
  IconShieldCheck,
  IconTarget,
} from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';

export interface GuidedPhaseTransitionCardProps {
  transition: GuidedPhaseTransitionViewModel;
  onContinue: () => void;
  style?: StyleProp<ViewStyle>;
}

type RowId =
  | 'preserved'
  | 'changed'
  | 'training'
  | 'fuel'
  | 'recovery'
  | 'protected'
  | 'fight';

interface SummaryRow {
  id: RowId;
  label: string;
  text: string;
}

export const GuidedPhaseTransitionCard = memo(function GuidedPhaseTransitionCard({
  transition,
  onContinue,
  style,
}: GuidedPhaseTransitionCardProps) {
  if (!transition.available) return null;

  const rows = buildRows(transition);
  const hasLimitedConfidence = transition.confidence.level === 'low' || transition.confidence.level === 'unknown';

  return (
    <Card
      style={[styles.card, style]}
      backgroundTone="planning"
      backgroundScrimColor="rgba(10, 10, 10, 0.70)"
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <IconActivity size={19} color={COLORS.accent} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.kicker}>JOURNEY UPDATE</Text>
            <Text style={styles.title} numberOfLines={2}>
              {transition.title}
            </Text>
          </View>
        </View>
        <View style={styles.phasePill}>
          <Text style={styles.phasePillText} numberOfLines={1}>
            Now: {transition.currentPhaseLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.whereText}>{transition.whereYouAreNow}</Text>
      <Text style={styles.summaryText}>{transition.transitionSummary}</Text>

      <View style={styles.reasonBlock}>
        <Text style={styles.sectionLabel}>WHY IT CHANGED</Text>
        <Text style={styles.reasonText}>{transition.whyChanging}</Text>
      </View>

      <View style={styles.rowList}>
        {rows.map((row) => (
          <View key={row.id} style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              {renderRowIcon(row.id)}
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={styles.summaryBody}>{row.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.nextBlock}>
        <IconTarget size={17} color={COLORS.accent} />
        <View style={styles.nextCopy}>
          <Text style={styles.summaryLabel}>NEXT FOCUS</Text>
          <Text style={styles.summaryBody}>{transition.nextFocus}</Text>
        </View>
      </View>

      {hasLimitedConfidence ? (
        <View style={styles.confidenceBlock}>
          <IconInfo size={16} color={COLORS.text.tertiary} />
          <Text style={styles.confidenceText}>{transition.confidence.summary}</Text>
        </View>
      ) : null}

      <AnimatedPressable testID="phase-transition-primary-cta" style={styles.primaryButton} onPress={onContinue}>
        <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
          {transition.ctaLabel}
        </Text>
        <IconChevronRight size={18} color={COLORS.text.inverse} />
      </AnimatedPressable>
    </Card>
  );
});

function buildRows(transition: GuidedPhaseTransitionViewModel): SummaryRow[] {
  return [
    {
      id: 'preserved',
      label: 'What carries forward',
      text: transition.preservedContext.slice(0, 2).join(' '),
    },
    {
      id: 'changed',
      label: 'What changes now',
      text: transition.changedFocus.slice(0, 2).join(' '),
    },
    { id: 'training', label: 'Training', text: transition.trainingChanges },
    { id: 'fuel', label: 'Fuel', text: transition.fuelingChanges },
    { id: 'recovery', label: 'Recovery', text: transition.recoveryExpectations },
    { id: 'protected', label: 'Protected work', text: transition.protectedWorkoutHandling },
    transition.fightOrCompetitionContext
      ? { id: 'fight', label: 'Fight context', text: transition.fightOrCompetitionContext }
      : null,
  ].filter((row): row is SummaryRow => Boolean(row));
}

function renderRowIcon(id: RowId) {
  switch (id) {
    case 'training':
      return <IconBarbell size={16} color={COLORS.accent} />;
    case 'fuel':
      return <IconDroplets size={16} color={COLORS.accent} />;
    case 'recovery':
      return <IconCalendar size={16} color={COLORS.accent} />;
    case 'protected':
      return <IconShieldCheck size={16} color={COLORS.accent} />;
    case 'fight':
      return <IconTarget size={16} color={COLORS.accent} />;
    case 'changed':
    case 'preserved':
    default:
      return <IconActivity size={16} color={COLORS.accent} />;
  }
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.14)',
    backgroundColor: 'rgba(10, 10, 10, 0.80)',
    ...SHADOWS.cardElevated,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.30)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  title: {
    marginTop: 3,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  phasePill: {
    maxWidth: 138,
    minHeight: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phasePillText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  whereText: {
    marginTop: SPACING.lg,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  summaryText: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
  },
  reasonBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.14)',
    gap: SPACING.xs,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  rowList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.10)',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.26)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryBody: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  nextBlock: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    padding: SPACING.md,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  confidenceBlock: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  confidenceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  primaryButton: {
    marginTop: SPACING.lg,
    minHeight: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    ...SHADOWS.colored.accent,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.inverse,
    textAlign: 'center',
  },
});
