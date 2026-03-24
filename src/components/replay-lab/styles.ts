import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY_V2, SEMANTIC_PALETTE } from '../../theme/theme';

/** Shared styles used by 3+ files in the replay-lab directory. */
export const shared = StyleSheet.create({
  bodyText: {
    marginTop: SPACING.sm,
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
  },
  detailText: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  listGap: {
    gap: SPACING.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tag: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  inlineStatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  inlineStat: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
});

/** Semantic tone background colors for MetricTile. */
export const TONE_TINTS = {
  default: COLORS.surfaceSecondary,
  good: SEMANTIC_PALETTE.positive.tint,
  warning: SEMANTIC_PALETTE.caution.tint,
  danger: SEMANTIC_PALETTE.alert.tint,
} as const;

export type MetricTone = keyof typeof TONE_TINTS;
