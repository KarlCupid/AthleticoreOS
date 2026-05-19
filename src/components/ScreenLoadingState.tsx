import React from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import type { CardBackgroundKey } from '../theme/cardBackgrounds';
import { Card } from './Card';
import { OceanLoader } from './OceanLoader';
import { SkeletonLoader } from './SkeletonLoader';

type LoadingTone = 'today' | 'train' | 'plan' | 'fuel' | 'bodyMass' | 'profile' | 'default';
type LoadingLayout = 'command' | 'training' | 'calendar' | 'fuel' | 'form' | 'bodyMass' | 'list';

interface ScreenLoadingStateProps {
  kicker?: string;
  title: string;
  message?: string;
  tone?: LoadingTone;
  layout?: LoadingLayout;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const TONE_ACCENTS: Record<LoadingTone, string> = {
  today: COLORS.accent,
  train: COLORS.readiness.prime,
  plan: COLORS.accent,
  fuel: COLORS.chart.water,
  bodyMass: COLORS.warning,
  profile: COLORS.success,
  default: COLORS.accent,
};

const CARD_TONES: Record<LoadingTone, CardBackgroundKey> = {
  today: 'mission',
  train: 'workoutFloor',
  plan: 'planning',
  fuel: 'fuelQuiet',
  bodyMass: 'bodyMassSupport',
  profile: 'profile',
  default: 'performance',
};

export function ScreenLoadingState({
  kicker = 'LOADING',
  title,
  message = 'Syncing your latest athlete context.',
  tone = 'default',
  layout = 'command',
  style,
  contentContainerStyle,
  accessibilityLabel,
}: ScreenLoadingStateProps) {
  const accent = TONE_ACCENTS[tone];
  const resolvedAccessibilityLabel = accessibilityLabel ?? `${title}. ${message}`;

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.hero}>
        <View style={[styles.loaderShell, { borderColor: `${accent}55`, backgroundColor: `${accent}14` }]}>
          <OceanLoader size={34} color={accent} />
        </View>
        <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.stack}>
        {renderLayout(layout, tone)}
      </View>
    </ScrollView>
  );
}

function renderLayout(layout: LoadingLayout, tone: LoadingTone) {
  if (layout === 'training') {
    return (
      <>
        <HeroSkeletonCard tone={tone} />
        <ListSkeletonCard tone={tone} rows={3} />
        <CompactSkeletonCard tone={tone} />
      </>
    );
  }

  if (layout === 'calendar') {
    return (
      <>
        <MetricSkeletonCard tone={tone} />
        <CalendarSkeletonCard tone={tone} />
        <ListSkeletonCard tone={tone} rows={2} />
      </>
    );
  }

  if (layout === 'fuel') {
    return (
      <>
        <HeroSkeletonCard tone={tone} />
        <MetricSkeletonCard tone={tone} />
        <ListSkeletonCard tone={tone} rows={3} />
      </>
    );
  }

  if (layout === 'form') {
    return (
      <>
        <HeroSkeletonCard tone={tone} />
        <FormSkeletonCard tone={tone} />
        <CompactSkeletonCard tone={tone} />
      </>
    );
  }

  if (layout === 'bodyMass') {
    return (
      <>
        <MetricSkeletonCard tone={tone} />
        <HeroSkeletonCard tone={tone} />
        <CalendarSkeletonCard tone={tone} compact />
      </>
    );
  }

  if (layout === 'list') {
    return (
      <>
        <ListSkeletonCard tone={tone} rows={4} />
        <ListSkeletonCard tone={tone} rows={3} />
      </>
    );
  }

  return (
    <>
      <HeroSkeletonCard tone={tone} />
      <MetricSkeletonCard tone={tone} />
      <CompactSkeletonCard tone={tone} />
    </>
  );
}

function LoadingCard({ children, tone, style }: { children: React.ReactNode; tone: LoadingTone; style?: StyleProp<ViewStyle> }) {
  return (
    <Card
      variant="glass"
      backgroundTone={CARD_TONES[tone]}
      backgroundScrimColor="rgba(10, 10, 10, 0.78)"
      style={[styles.card, style]}
    >
      {children}
    </Card>
  );
}

function HeroSkeletonCard({ tone }: { tone: LoadingTone }) {
  return (
    <LoadingCard tone={tone} style={styles.heroCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderCopy}>
          <SkeletonLoader width="38%" height={12} shape="text" />
          <SkeletonLoader width="72%" height={24} shape="text" style={styles.skeletonGap} />
        </View>
        <SkeletonLoader width={46} height={46} shape="circle" />
      </View>
      <SkeletonLoader width="100%" height={14} shape="text" style={styles.skeletonGapLarge} />
      <SkeletonLoader width="84%" height={14} shape="text" style={styles.skeletonGap} />
      <View style={styles.tileRow}>
        <SkeletonLoader width="31%" height={58} shape="rect" borderRadius={RADIUS.md} />
        <SkeletonLoader width="31%" height={58} shape="rect" borderRadius={RADIUS.md} />
        <SkeletonLoader width="31%" height={58} shape="rect" borderRadius={RADIUS.md} />
      </View>
    </LoadingCard>
  );
}

function MetricSkeletonCard({ tone }: { tone: LoadingTone }) {
  return (
    <LoadingCard tone={tone}>
      <SkeletonLoader width="42%" height={13} shape="text" />
      <View style={styles.metricRow}>
        <SkeletonLoader width="31%" height={82} shape="rect" borderRadius={RADIUS.md} />
        <SkeletonLoader width="31%" height={82} shape="rect" borderRadius={RADIUS.md} />
        <SkeletonLoader width="31%" height={82} shape="rect" borderRadius={RADIUS.md} />
      </View>
    </LoadingCard>
  );
}

function CompactSkeletonCard({ tone }: { tone: LoadingTone }) {
  return (
    <LoadingCard tone={tone}>
      <SkeletonLoader width="46%" height={13} shape="text" />
      <SkeletonLoader width="88%" height={18} shape="text" style={styles.skeletonGapLarge} />
      <SkeletonLoader width="68%" height={14} shape="text" style={styles.skeletonGap} />
    </LoadingCard>
  );
}

function ListSkeletonCard({ tone, rows }: { tone: LoadingTone; rows: number }) {
  return (
    <LoadingCard tone={tone}>
      <SkeletonLoader width="48%" height={13} shape="text" />
      <View style={styles.listRows}>
        {Array.from({ length: rows }).map((_, index) => (
          <View key={index} style={styles.listRow}>
            <SkeletonLoader width={38} height={38} shape="circle" />
            <View style={styles.listRowCopy}>
              <SkeletonLoader width="78%" height={14} shape="text" />
              <SkeletonLoader width="54%" height={12} shape="text" style={styles.skeletonGap} />
            </View>
          </View>
        ))}
      </View>
    </LoadingCard>
  );
}

function CalendarSkeletonCard({ tone, compact = false }: { tone: LoadingTone; compact?: boolean }) {
  return (
    <LoadingCard tone={tone}>
      <View style={styles.calendarHeader}>
        <SkeletonLoader width="44%" height={16} shape="text" />
        <SkeletonLoader width={64} height={32} shape="rect" borderRadius={RADIUS.full} />
      </View>
      <View style={[styles.calendarGrid, compact && styles.calendarGridCompact]}>
        {Array.from({ length: compact ? 8 : 14 }).map((_, index) => (
          <SkeletonLoader key={index} width="22%" height={compact ? 44 : 52} shape="rect" borderRadius={RADIUS.md} />
        ))}
      </View>
    </LoadingCard>
  );
}

function FormSkeletonCard({ tone }: { tone: LoadingTone }) {
  return (
    <LoadingCard tone={tone}>
      <SkeletonLoader width="52%" height={16} shape="text" />
      <View style={styles.formRows}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.formRow}>
            <SkeletonLoader width="42%" height={13} shape="text" />
            <View style={styles.formPillRow}>
              <SkeletonLoader width="18%" height={40} shape="rect" borderRadius={RADIUS.full} />
              <SkeletonLoader width="18%" height={40} shape="rect" borderRadius={RADIUS.full} />
              <SkeletonLoader width="18%" height={40} shape="rect" borderRadius={RADIUS.full} />
              <SkeletonLoader width="18%" height={40} shape="rect" borderRadius={RADIUS.full} />
            </View>
          </View>
        ))}
      </View>
    </LoadingCard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  hero: {
    alignItems: 'flex-start',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  loaderShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.colored.accent,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.extraBold,
    letterSpacing: 1.4,
  },
  title: {
    marginTop: SPACING.xs,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  message: {
    marginTop: SPACING.xs,
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  stack: {
    gap: SPACING.md,
  },
  card: {
    borderColor: 'rgba(245, 245, 240, 0.18)',
  },
  heroCard: {
    minHeight: 218,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  skeletonGap: {
    marginTop: SPACING.xs,
  },
  skeletonGapLarge: {
    marginTop: SPACING.md,
  },
  tileRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  metricRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  listRows: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  listRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  listRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  calendarGrid: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  calendarGridCompact: {
    marginTop: SPACING.sm,
  },
  formRows: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  formRow: {
    gap: SPACING.sm,
  },
  formPillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
});
