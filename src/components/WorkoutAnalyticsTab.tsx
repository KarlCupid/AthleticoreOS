import React, { lazy, Suspense, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { ChartPlaceholder } from './shared/LazyChart';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { buildWorkoutProgressSummary } from '../screens/workout/utils';

const WorkoutAnalyticsMetrics = lazy(() =>
  import('./WorkoutAnalyticsMetrics').then((module) => ({
    default: module.WorkoutAnalyticsMetrics,
  })),
);

interface WorkoutAnalyticsTabProps {
  userId: string | null;
  trainingLoadData: any[];
  acwrData: any[];
  checkinDates: Set<string>;
  weightData: any[];
  sleepData: any[];
}

function getToneStyles(tone: 'neutral' | 'success' | 'warning') {
  if (tone === 'success') {
    return {
      borderColor: COLORS.success,
      badgeBackground: `${COLORS.success}20`,
      badgeColor: COLORS.success,
    };
  }

  if (tone === 'warning') {
    return {
      borderColor: COLORS.warning,
      badgeBackground: `${COLORS.warning}20`,
      badgeColor: COLORS.warning,
    };
  }

  return {
    borderColor: COLORS.border,
    badgeBackground: COLORS.surfaceSecondary,
    badgeColor: COLORS.text.secondary,
  };
}

export function WorkoutAnalyticsTab({
  userId,
  trainingLoadData,
  acwrData,
  checkinDates,
  weightData,
  sleepData,
}: WorkoutAnalyticsTabProps) {
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const progressSummary = useMemo(
    () => buildWorkoutProgressSummary({
      trainingLoadData,
      acwrData,
      sleepData,
      checkinDates,
    }),
    [trainingLoadData, acwrData, sleepData, checkinDates],
  );

  if (!progressSummary.hasPrimaryData) {
    return (
      <Card>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Progress will get clearer as you log more work</Text>
          <Text style={styles.emptyBody}>
            Finish a few sessions and keep checking in. Then Train will show your rhythm, load balance, and recovery trend here.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {progressSummary.cards.map((card) => {
        const toneStyles = getToneStyles(card.tone);
        return (
          <Card key={card.key} style={[styles.summaryCard, { borderLeftColor: toneStyles.borderColor }]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{card.title}</Text>
              <View style={[styles.summaryBadge, { backgroundColor: toneStyles.badgeBackground }]}>
                <Text style={[styles.summaryBadgeText, { color: toneStyles.badgeColor }]}>
                  {card.tone === 'success' ? 'On track' : card.tone === 'warning' ? 'Attention' : 'Update'}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryHeadline}>{card.headline}</Text>
            <Text style={styles.summaryBody}>{card.body}</Text>
          </Card>
        );
      })}

      <AnimatedPressable
        style={styles.moreMetricsButton}
        onPress={() => setShowMoreMetrics((value) => !value)}
      >
        <Text style={styles.moreMetricsButtonText}>
          {showMoreMetrics ? 'Hide deeper metrics' : 'More metrics'}
        </Text>
      </AnimatedPressable>

      {showMoreMetrics ? (
        <Suspense
          fallback={(
            <View style={styles.metricsStack}>
              <ChartPlaceholder height={180} />
              <ChartPlaceholder height={180} />
            </View>
          )}
        >
          <WorkoutAnalyticsMetrics
            userId={userId}
            trainingLoadData={trainingLoadData}
            acwrData={acwrData}
            checkinDates={checkinDates}
            weightData={weightData}
            sleepData={sleepData}
          />
        </Suspense>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  summaryCard: {
    borderLeftWidth: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  summaryTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    letterSpacing: 0.3,
  },
  summaryHeadline: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  summaryBody: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: SPACING.xs,
  },
  moreMetricsButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  moreMetricsButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
  },
  metricsStack: {
    gap: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
