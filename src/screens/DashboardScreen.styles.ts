import { StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', 
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  
  // Hero Section (New Premium Merged Header)
  heroSection: {
    // Replaces full-bleed gradient with clean, sharp surface
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    backgroundColor: 'transparent',
  },
  heroGreetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
  },
  heroGreeting: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  heroDate: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Readiness & Core Metrics Block
  heroMetricsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)', // Glassy Slate 900
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...SHADOWS.md,
  },
  readinessMain: {
    alignItems: 'flex-start',
  },
  readinessLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.black,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  readinessScoreValue: {
    fontSize: 64,
    fontFamily: FONT_FAMILY.black,
    letterSpacing: -2,
    lineHeight: 72,
  },
  readinessLevel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  
  // Secondary hero metrics (ACWR, Sleep, Weight)
  secondaryMetricsList: {
    gap: SPACING.md,
    alignItems: 'flex-end',
  },
  secondaryMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  secondaryMetricValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.black,
    color: '#FFF',
  },
  secondaryMetricLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: 'rgba(255,255,255,0.7)',
  },

  // Compass Action Block (Inside Hero)
  compassCard: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Slightly more opaque glass
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...SHADOWS.md,
  },
  compassSessionRole: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.readiness.prime,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  compassHeadline: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 34,
  },
  compassSummary: {
    marginTop: SPACING.xs,
    fontSize: 16,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  compassReasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  compassReasonBar: {
    width: 3,
    borderRadius: 2,
    marginTop: 4,
    minHeight: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  compassReasonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  compassPrimaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  compassPrimaryText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  compassSecondaryButton: {
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  compassSecondaryText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#FFFFFF',
  },
  compassMissionLink: {
    marginTop: SPACING.lg,
    fontSize: 14,
    fontFamily: FONT_FAMILY.extraBold,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // 2x2 Action Grid
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  quickActionBlock: {
    flexGrow: 1,
    flexBasis: '45%',
    aspectRatio: 1, // Perfect square Apple-Health vibe
    borderRadius: RADIUS.xxl, // Ultra round corners
    padding: SPACING.lg,
    justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  quickActionIconContainer: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // White frost against solid color
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabelBlock: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  quickActionLabelDoneBlock: {
    color: 'rgba(255,255,255,0.7)',
  },

  contextScheduleNote: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.sm,
    lineHeight: 19,
  },

  // Skeleton loading
  skeletonHero: {
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },

  // Chart Overrides for premium look
  chartContainer: {
    height: 200,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  chartCaption: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  // Nutrition/Fuel Overrides
  nutritionCard: {
    padding: SPACING.lg,
  },
  calorieHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  calorieValue: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.8,
  },
  calorieTarget: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.xs,
  },
  macroRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.lg,
  },
  macroRingItem: {
    alignItems: 'center',
  },
  macroRingLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  macroRingSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  hydrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  hydrationBarWrap: {
    flex: 1,
  },
  hydrationBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  hydrationBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.chart.water,
  },
  hydrationText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },

  // Biology / Risk Cards
  biologyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  biologyIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.readiness.cautionLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biologyInfo: {
    flex: 1,
  },
  biologyTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  biologyDesc: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // Phase control (Moved to bottom conceptually, but styled premium)
  phaseControlHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  phaseControlEyebrow: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  phaseControlCurrentMode: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    flexShrink: 1,
    maxWidth: '45%',
    textAlign: 'right',
  },
  phaseControlTitle: {
    marginTop: SPACING.xs,
    fontSize: 20,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  phaseControlDescription: {
    marginTop: SPACING.xs,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  phaseControlSummaryRow: {
    marginTop: SPACING.md,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceSecondary,
  },
  phaseControlSummaryBlock: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  phaseControlSummaryDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderLight,
  },
  phaseControlSummaryLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  phaseControlSummaryValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  phaseControlPrimaryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  phaseControlPrimaryText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  phaseControlSecondaryButton: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  phaseControlSecondaryText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },

  // First-run guidance
  firstRunModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  firstRunModalCard: {
    backgroundColor: '#0F172A', // Slate 900
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  firstRunModalKicker: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.readiness.prime,
    letterSpacing: 2,
  },
  firstRunModalTitle: {
    marginTop: SPACING.xs,
    fontSize: 32,
    fontFamily: FONT_FAMILY.black,
    color: '#FFF',
    letterSpacing: -1,
  },
  firstRunModalBody: {
    marginTop: SPACING.sm,
    fontSize: 16,
    fontFamily: FONT_FAMILY.regular,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  firstRunModalPrimaryButton: {
    marginTop: SPACING.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  firstRunModalPrimaryText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.black,
    color: '#0F172A',
  },
  firstRunModalSecondaryButton: {
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  firstRunModalSecondaryText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#FFFFFF',
  },
  firstRunHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  firstRunKicker: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  firstRunProgress: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    flexShrink: 1,
    textAlign: 'right',
  },
  firstRunTitle: {
    marginTop: SPACING.xs,
    fontSize: 20,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  firstRunSubtitle: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  firstRunStepList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  firstRunStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  firstRunStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  firstRunStepBadgeDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '20',
  },
  firstRunStepBadgeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  firstRunStepBadgeTextDone: {
    color: COLORS.success,
  },
  firstRunStepCopy: {
    flex: 1,
    flexShrink: 1,
  },
  firstRunStepTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  firstRunStepSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    lineHeight: 17,
  },
  firstRunStepCta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    alignSelf: 'center',
  },

  // Why Today? expandable
  whyTodayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  whyTodayTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  whyTodayChevron: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  whyTodayItem: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  whyTodayItemTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  whyTodayItemSentence: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
});
