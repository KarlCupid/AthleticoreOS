import type { AthleteGoalMode, WeightClassInfluenceState, WeighInTiming } from './types.ts';
import { FIGHT_CAMP_SAFETY_POLICY } from './safety/policy.ts';

export type CampRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface CampRiskInput {
  goalMode: AthleteGoalMode;
  weightClassState: WeightClassInfluenceState;
  daysOut: number | null;
  remainingWeightLbs?: number | null;
  weighInTiming?: WeighInTiming | null;
  readinessAvg?: number | null;
  readinessDelta?: number | null;
  acwrRatio?: number | null;
  recommendationFollowThroughPct?: number | null;
  isTravelWindow?: boolean;
}

export interface CampRiskAssessment {
  score: number;
  level: CampRiskLevel;
  projectedMakeWeightStatus: string;
  drivers: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toRiskLevel(score: number): CampRiskLevel {
  if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.critical) return 'critical';
  if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.high) return 'high';
  if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.moderate) return 'moderate';
  return 'low';
}

function formatProjectedMakeWeightStatus(input: {
  remainingWeightLbs: number | null;
  weightClassState: WeightClassInfluenceState;
  weighInTiming?: WeighInTiming | null;
}): string {
  const { remainingWeightLbs, weightClassState, weighInTiming } = input;

  if (remainingWeightLbs == null) {
    if (weightClassState === 'driving') {
      return 'High risk: driving weight-class state with missing current body-mass data';
    }
    return 'Insufficient weight data';
  }

  if (remainingWeightLbs <= 0) {
    return 'On weight trajectory';
  }

  const overLabel = `${remainingWeightLbs.toFixed(1)} lb over`;
  const sameDayTag = weighInTiming === 'same_day' ? ' · same-day weigh-in constraints' : '';

  if (weightClassState === 'driving') {
    return `High risk (${overLabel})${sameDayTag}`;
  }
  if (weightClassState === 'monitoring') {
    return `Monitor closely (${overLabel})${sameDayTag}`;
  }
  return `Track gap (${overLabel})${sameDayTag}`;
}

export function calculateCampRisk(input: CampRiskInput): CampRiskAssessment | null {
  if (input.goalMode !== 'fight_camp') return null;

  let score = 12;
  const drivers: string[] = [];

  switch (input.weightClassState) {
    case 'driving':
      score += 24;
      drivers.push('Weight-class management state is driving planning decisions.');
      break;
    case 'monitoring':
      score += 12;
      drivers.push('Weight-class management is in monitoring mode.');
      break;
    default:
      break;
  }

  if (input.remainingWeightLbs != null) {
    if (input.remainingWeightLbs > 5) {
      score += 22;
      drivers.push(`Remaining gap is ${input.remainingWeightLbs.toFixed(1)} lb.`);
    } else if (input.remainingWeightLbs > 2) {
      score += 14;
      drivers.push(`Remaining gap is ${input.remainingWeightLbs.toFixed(1)} lb.`);
    } else if (input.remainingWeightLbs > 0) {
      score += 6;
    }
  }

  if (
    input.weighInTiming === 'same_day'
    && (input.remainingWeightLbs ?? 0) > 1.5
  ) {
    score += 8;
    drivers.push('Same-day weigh-in reduces safe body-mass change tolerance.');
  }

  if (input.daysOut != null) {
    if (input.daysOut <= 7) {
      score += 16;
      drivers.push('Fight week timeline leaves little margin.');
    } else if (input.daysOut <= 14) {
      score += 12;
    } else if (input.daysOut <= 28) {
      score += 8;
    } else if (input.daysOut <= 56) {
      score += 4;
    }
  }

  if (input.readinessAvg != null) {
    if (input.readinessAvg < 4) {
      score += 10;
      drivers.push('Readiness average is low.');
    } else if (input.readinessAvg < 6) {
      score += 6;
    }
  }

  if (input.readinessDelta != null) {
    if (input.readinessDelta <= -2) {
      score += 10;
      drivers.push('Readiness trend is dropping sharply.');
    } else if (input.readinessDelta <= -1) {
      score += 6;
    }
  }

  if (input.acwrRatio != null) {
    if (input.acwrRatio >= 1.5) {
      score += 10;
      drivers.push('Acute load is elevated versus chronic load.');
    } else if (input.acwrRatio >= 1.3) {
      score += 6;
    } else if (input.acwrRatio <= 0.8) {
      score += 4;
    }
  }

  if (input.recommendationFollowThroughPct != null) {
    if (input.recommendationFollowThroughPct < 50) {
      score += 8;
      drivers.push('Recommendation follow-through is below 50%.');
    } else if (input.recommendationFollowThroughPct < 70) {
      score += 4;
    }
  }

  if (input.isTravelWindow) {
    score += (input.daysOut != null && input.daysOut <= 14) ? 6 : 3;
    drivers.push('Travel window active, prioritize recovery and logistics.');
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  if (drivers.length === 0) {
    drivers.push('No major camp risk drivers detected.');
  }

  return {
    score: finalScore,
    level: toRiskLevel(finalScore),
    projectedMakeWeightStatus: formatProjectedMakeWeightStatus({
      remainingWeightLbs: input.remainingWeightLbs ?? null,
      weightClassState: input.weightClassState,
      weighInTiming: input.weighInTiming,
    }),
    drivers,
  };
}
