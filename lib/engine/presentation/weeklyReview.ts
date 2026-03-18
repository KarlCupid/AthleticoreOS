import type { WeeklyComplianceReport } from '../types/schedule.ts';
import type { CampRiskAssessment } from '../calculateCampRisk.ts';
import type { WeeklyReviewNarrativeViewModel } from './types.ts';

export interface WeeklyReviewInsights {
  readinessAvg: number | null;
  readinessDelta: number | null;
  weightDelta: number | null;
  recommendationFollowThroughPct: number | null;
  recommendationCount: number;
  campRisk: CampRiskAssessment | null;
  campLabel: string;
}

type SportKey = 'sc' | 'boxing' | 'running' | 'conditioning' | 'recovery';
const SPORT_LABELS: Record<SportKey, string> = {
  sc: 'S&C',
  boxing: 'Boxing',
  running: 'Running',
  conditioning: 'Conditioning',
  recovery: 'Recovery',
};

const NULL_DEFAULT: WeeklyReviewNarrativeViewModel = {
  whatImproved: 'No data yet for this week.',
  whatSlipped: null,
  whatChangesNext: 'Complete your first week to see personalized insights.',
  narrativeSummary: 'No data yet for this week. Complete your first week to see personalized insights.',
  highlightChart: 'training_compliance',
  complianceMetrics: [],
  overallPct: 0,
  streak: 0,
};

function buildWhatImproved(
  report: WeeklyComplianceReport,
  insights: WeeklyReviewInsights,
): string {
  if (insights.readinessDelta != null && insights.readinessDelta > 0) {
    return `Readiness improved by ${Math.round(insights.readinessDelta)} points across the week.`;
  }

  const sports: SportKey[] = ['sc', 'boxing', 'running', 'conditioning', 'recovery'];
  const best = sports
    .filter((s) => report[s].planned > 0)
    .sort((a, b) => report[b].pct - report[a].pct)[0];

  if (best && report[best].pct >= 80) {
    return `${SPORT_LABELS[best]} compliance led the week at ${Math.round(report[best].pct)}%.`;
  }

  if (report.streak > 0) {
    return `Consistency held steady — ${report.streak} day${report.streak !== 1 ? 's' : ''} in a row.`;
  }

  return 'You showed up this week — that\'s the foundation.';
}

function buildWhatSlipped(
  report: WeeklyComplianceReport,
  insights: WeeklyReviewInsights,
): string | null {
  const sports: SportKey[] = ['sc', 'boxing', 'running', 'conditioning', 'recovery'];
  const worst = sports
    .filter((s) => report[s].planned > 0 && report[s].pct < 70)
    .sort((a, b) => report[a].pct - report[b].pct)[0];

  if (worst) {
    return `${SPORT_LABELS[worst]} came in at ${Math.round(report[worst].pct)}% of target.`;
  }

  if (
    insights.recommendationFollowThroughPct != null &&
    insights.recommendationFollowThroughPct < 60 &&
    insights.recommendationCount > 0
  ) {
    return `${Math.round(insights.recommendationFollowThroughPct)}% of engine recommendations were followed through.`;
  }

  return null;
}

function buildWhatChangesNext(insights: WeeklyReviewInsights): string {
  if (insights.campRisk?.drivers?.[0]) {
    return insights.campRisk.drivers[0];
  }

  if (
    insights.recommendationCount > 0 &&
    insights.recommendationFollowThroughPct != null &&
    insights.recommendationFollowThroughPct < 80
  ) {
    return "Focus on follow-through — matching the engine's recommendations is the fastest way to improve next week.";
  }

  return "Keep building on this week's foundation.";
}

function pickHighlightChart(
  insights: WeeklyReviewInsights,
): WeeklyReviewNarrativeViewModel['highlightChart'] {
  if (insights.weightDelta != null && Math.abs(insights.weightDelta) > 0.5) {
    return 'weight_trend';
  }
  if (insights.readinessDelta != null) {
    return 'readiness_trend';
  }
  return 'training_compliance';
}

export function buildWeeklyReviewNarrativeViewModel(
  report: WeeklyComplianceReport | null,
  insights: WeeklyReviewInsights | null,
): WeeklyReviewNarrativeViewModel {
  if (!report) return NULL_DEFAULT;

  const safeInsights: WeeklyReviewInsights = insights ?? {
    readinessAvg: null,
    readinessDelta: null,
    weightDelta: null,
    recommendationFollowThroughPct: null,
    recommendationCount: 0,
    campRisk: null,
    campLabel: '',
  };

  const whatImproved = buildWhatImproved(report, safeInsights);
  const whatSlipped = buildWhatSlipped(report, safeInsights);
  const whatChangesNext = buildWhatChangesNext(safeInsights);

  const parts = [whatImproved, whatSlipped, whatChangesNext].filter(Boolean) as string[];
  const narrativeSummary = parts.join(' ');

  const sports: SportKey[] = ['sc', 'boxing', 'running', 'conditioning', 'recovery'];
  const complianceMetrics = sports
    .filter((s) => report[s].planned > 0)
    .map((s) => ({
      label: SPORT_LABELS[s],
      planned: report[s].planned,
      actual: report[s].actual,
      pct: report[s].pct,
    }));

  return {
    whatImproved,
    whatSlipped,
    whatChangesNext,
    narrativeSummary,
    highlightChart: pickHighlightChart(safeInsights),
    complianceMetrics,
    overallPct: report.overallPct,
    streak: report.streak,
  };
}
