import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  MissionDashboardTone,
  MissionDashboardViewModel,
  MissionSupportCardViewModel,
} from '../../../lib/engine/presentation/missionDashboard';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import {
  IconActivity,
  IconAlertTriangle,
  IconBarbell,
  IconCheckCircle,
  IconChevronRight,
  IconScale,
  IconShieldCheck,
  IconTarget,
  IconTrendDown,
  IconTrendUp,
} from '../icons';
import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../../theme/theme';

const MISSION_BACKGROUND = require('../../../assets/images/dashboard/mission-card-bg.png');
const SUPPORT_BACKGROUND = require('../../../assets/images/dashboard/support-card-bg.png');

interface MissionDashboardPanelProps {
  viewModel: MissionDashboardViewModel;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string | null;
  onSecondaryAction?: () => void;
}

const TONE_STYLES: Record<
  MissionDashboardTone,
  { color: string; background: string; border: string }
> = {
  positive: {
    color: COLORS.success,
    background: 'rgba(183, 217, 168, 0.14)',
    border: 'rgba(183, 217, 168, 0.28)',
  },
  caution: {
    color: COLORS.warning,
    background: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.30)',
  },
  danger: {
    color: COLORS.error,
    background: 'rgba(217, 130, 126, 0.16)',
    border: 'rgba(217, 130, 126, 0.32)',
  },
  neutral: {
    color: COLORS.text.tertiary,
    background: 'rgba(245, 245, 240, 0.08)',
    border: 'rgba(245, 245, 240, 0.16)',
  },
};

export const MissionDashboardPanel = memo(function MissionDashboardPanel({
  viewModel,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: MissionDashboardPanelProps) {
  const tone = TONE_STYLES[viewModel.tone];

  return (
    <View style={styles.container}>
      <Card
        style={[styles.missionCard, { borderColor: tone.border }]}
        backgroundImage={MISSION_BACKGROUND}
        backgroundScrimColor="rgba(10, 10, 10, 0.36)"
      >
        <View style={styles.missionTopRow}>
          <View style={styles.missionTitleRow}>
            <View style={[styles.missionIcon, { borderColor: tone.border, backgroundColor: tone.background }]}>
              <IconTarget size={20} color={tone.color} />
            </View>
            <View style={styles.missionTitleCopy}>
              <Text style={styles.kicker}>TODAY'S MISSION</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: tone.background, borderColor: tone.border }]}>
            <View style={[styles.statusDot, { backgroundColor: tone.color }]} />
            <Text
              style={[styles.statusText, { color: tone.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {viewModel.statusLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.missionText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.84}>
          {viewModel.mission}
        </Text>

        <View style={styles.whyBlock}>
          <Text style={styles.whyLabel}>WHY</Text>
          {viewModel.why.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.whyText}>
              {line}
            </Text>
          ))}
        </View>

        <AnimatedPressable style={styles.primaryButton} onPress={onPrimaryAction}>
          <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
            {primaryActionLabel}
          </Text>
          <IconChevronRight size={18} color={COLORS.text.inverse} />
        </AnimatedPressable>

        {secondaryActionLabel && onSecondaryAction ? (
          <AnimatedPressable style={styles.secondaryButton} onPress={onSecondaryAction}>
            <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
              {secondaryActionLabel}
            </Text>
          </AnimatedPressable>
        ) : null}
      </Card>

      <View style={styles.supportGrid}>
        {viewModel.supportCards.map((card) => (
          <SupportCard key={card.kind} card={card} />
        ))}
      </View>
    </View>
  );
});

function SupportCard({ card }: { card: MissionSupportCardViewModel }) {
  const tone = TONE_STYLES[card.tone];

  return (
    <Card
      style={[styles.supportCard, { borderColor: tone.border }]}
      backgroundImage={SUPPORT_BACKGROUND}
      backgroundScrimColor="rgba(10, 10, 10, 0.50)"
    >
      <View style={styles.supportHeader}>
        <View style={[styles.supportIcon, { backgroundColor: tone.background, borderColor: tone.border }]}>
          {renderSupportIcon(card, tone.color)}
        </View>
        <Text style={styles.supportTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
          {card.title}
        </Text>
      </View>
      <Text style={styles.supportStatus} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.82}>
        {card.status}
      </Text>
      <Text style={styles.supportSubtext} numberOfLines={2}>
        {card.subtext}
      </Text>
      {card.action ? (
        <Text style={[styles.supportAction, { color: tone.color }]} numberOfLines={2}>
          {card.action}
        </Text>
      ) : null}
    </Card>
  );
}

function renderSupportIcon(card: MissionSupportCardViewModel, color: string) {
  switch (card.kind) {
    case 'risk_alert':
      return <IconAlertTriangle size={18} color={color} />;
    case 'consistency':
      return <IconCheckCircle size={18} color={color} />;
    case 'bodyweight':
      return <IconScale size={18} color={color} />;
    case 'performance_pulse':
      return <IconActivity size={18} color={color} />;
    case 'fight_camp':
      return <IconShieldCheck size={18} color={color} />;
    case 'training_trend':
    default:
      if (card.status === 'Dropping off') return <IconTrendDown size={18} color={color} />;
      if (card.status === 'Ramping up') return <IconTrendUp size={18} color={color} />;
      return <IconBarbell size={18} color={color} />;
  }
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  missionCard: {
    padding: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.cardElevated,
  },
  missionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  missionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 0,
  },
  missionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  statusPill: {
    maxWidth: 132,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.semiBold,
  },
  missionText: {
    marginTop: SPACING.lg,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  whyBlock: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 245, 240, 0.16)',
    gap: SPACING.xs,
  },
  whyLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 1,
  },
  whyText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  primaryButton: {
    marginTop: SPACING.lg,
    minHeight: 56,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
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
  secondaryButton: {
    marginTop: SPACING.sm,
    minHeight: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  secondaryButtonText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  supportGrid: {
    gap: SPACING.sm,
  },
  supportCard: {
    padding: SPACING.md,
    borderWidth: 1,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  supportIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  supportStatus: {
    marginTop: SPACING.sm,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  supportSubtext: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  supportAction: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.semiBold,
  },
});
