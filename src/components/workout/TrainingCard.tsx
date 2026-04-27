import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';

export interface TrainingMetric {
  label: string;
  value: string | number;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}

interface TrainingCardProps {
  eyebrow?: string | null;
  title: string;
  prescription: string;
  effort?: string | null;
  rest?: string | null;
  focus?: string[];
  feel?: string | null;
  mistake?: string | null;
  next?: string | null;
  metrics?: TrainingMetric[];
  compact?: boolean;
  calm?: boolean;
  children?: React.ReactNode;
}

const TONE_COLORS: Record<NonNullable<TrainingMetric['tone']>, { bg: string; text: string }> = {
  default: { bg: COLORS.surfaceSecondary, text: COLORS.text.secondary },
  accent: { bg: COLORS.accentLight, text: COLORS.accent },
  success: { bg: COLORS.readiness.primeLight, text: COLORS.readiness.prime },
  warning: { bg: COLORS.readiness.depletedLight, text: COLORS.readiness.depleted },
};

export function TrainingCard({
  eyebrow,
  title,
  prescription,
  effort,
  rest,
  focus = [],
  feel,
  mistake,
  next,
  metrics = [],
  compact = false,
  calm = false,
  children,
}: TrainingCardProps) {
  const visibleMetrics = metrics.filter((metric) => metric.value !== '');
  const visibleFocus = focus.filter(Boolean).slice(0, 2);

  return (
    <View style={[styles.card, compact && styles.cardCompact, calm && styles.cardCalm]}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}

      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.prescription, compact && styles.prescriptionCompact]}>
          {prescription}
        </Text>
      </View>

      {(effort || rest) ? (
        <View style={styles.coachRow}>
          {effort ? (
            <View style={[styles.coachPill, styles.effortPill]}>
              <Text style={styles.coachLabel}>Effort</Text>
              <Text style={styles.coachValue}>{effort}</Text>
            </View>
          ) : null}
          {rest ? (
            <View style={styles.coachPill}>
              <Text style={styles.coachLabel}>Rest</Text>
              <Text style={styles.coachValue}>{rest}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {visibleFocus.length > 0 ? (
        <View style={styles.focusBlock}>
          <Text style={styles.sectionLabel}>Focus</Text>
          {visibleFocus.map((item) => (
            <View key={item} style={styles.focusRow}>
              <View style={styles.focusDot} />
              <Text style={styles.focusText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {visibleMetrics.length > 0 ? (
        <View style={styles.metricRow}>
          {visibleMetrics.map((metric) => {
            const tone = TONE_COLORS[metric.tone ?? 'default'];
            return (
              <View key={`${metric.label}-${metric.value}`} style={[styles.metric, { backgroundColor: tone.bg }]}>
                <Text style={[styles.metricValue, { color: tone.text }]} numberOfLines={1}>
                  {metric.value}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {metric.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {(feel || mistake || next) ? (
        <View style={styles.notesBlock}>
          {feel ? <Text style={styles.noteText}>Feel: {feel}</Text> : null}
          {mistake ? <Text style={styles.noteText}>Avoid: {mistake}</Text> : null}
          {next ? <Text style={styles.nextText}>Next: {next}</Text> : null}
        </View>
      ) : null}

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  cardCompact: {
    padding: SPACING.sm + 4,
    gap: SPACING.sm,
  },
  cardCalm: {
    backgroundColor: COLORS.surfaceSecondary,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  eyebrow: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  header: {
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY_V2.focus.display,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  titleCompact: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  prescription: {
    ...TYPOGRAPHY_V2.focus.action,
    color: COLORS.text.primary,
  },
  prescriptionCompact: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  coachRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  coachPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    minHeight: 58,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  effortPill: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent + '44',
  },
  coachLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coachValue: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: COLORS.text.primary,
  },
  focusBlock: {
    gap: SPACING.xs,
  },
  sectionLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  focusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 8,
  },
  focusText: {
    ...TYPOGRAPHY_V2.plan.body,
    flex: 1,
    color: COLORS.text.secondary,
  },
  metricRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metric: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 56,
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
    lineHeight: 22,
  },
  metricLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  notesBlock: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  noteText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  nextText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.accent,
  },
  children: {
    gap: SPACING.sm,
  },
});

