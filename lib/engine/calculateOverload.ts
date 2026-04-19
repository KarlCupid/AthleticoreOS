/**
 * calculateOverload.ts
 *
 * Progressive overload engine for strength training prescription.
 *
 * Functions:
 *   1. estimateE1RM            — Epley-based estimated 1-rep max with RPE adjustment
 *   2. suggestOverload         — prescribes next-session weight/reps based on progression model
 *   3. detectPR                — checks a lift against existing PR records
 *   4. shouldDeload            — determines if a deload week is warranted
 *   5. selectProgressionModel  — selects an appropriate progression model for the athlete
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 * The caller is responsible for reading/writing to Supabase via a service layer.
 */

import type {
  FitnessLevel,
  MuscleGroup,
  ProgressionModel,
  OverloadInput,
  OverloadSuggestion,
  DeloadDecisionInput,
  DeloadDecisionResult,
} from './types.ts';
import type { PRRecord, PRDetectionResult } from './types/misc.ts';

// ─── Constants ───────────────────────────────────────────────

/** Upper-body muscle groups receive smaller weight jumps. */
const UPPER_BODY_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms'];

/** Default RPE when the athlete does not report one. */
const DEFAULT_RPE = 8.5;

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Rounds a number to the nearest 0.5.
 */
function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Rounds a weight to the nearest 5 lbs.
 */
function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Determines if a muscle group is upper body.
 */
function isUpperBody(muscleGroup: MuscleGroup): boolean {
  return UPPER_BODY_GROUPS.includes(muscleGroup);
}

function weeksBetween(startDate: string | null | undefined, endDate: string | null | undefined): number | null {
  if (!startDate || !endDate) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.floor((end - start) / (7 * 24 * 60 * 60 * 1000));
}

// ─── estimateE1RM ────────────────────────────────────────────

/**
 * Estimates a 1-rep max using the Epley formula with an RPE adjustment.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - weight: number (bar weight in lbs from set log)
 *   - reps: number (reps completed)
 *   - rpe: number | null (rate of perceived exertion, nullable)
 *
 * Returns: number — estimated 1RM rounded to nearest 0.5 lbs.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function estimateE1RM(weight: number, reps: number, rpe: number | null): number {
  if (weight <= 0 || reps <= 0) return 0;

  // Epley formula: weight * (1 + reps / 30)
  const epley = weight * (1 + reps / 30);

  // RPE adjustment: scale by 1 / (1 - (10 - effectiveRPE) * 0.033)
  const effectiveRPE = rpe ?? DEFAULT_RPE;
  const rpeAdjustmentDenominator = 1 - (10 - effectiveRPE) * 0.033;

  // Protect against division by zero or negative denominator
  const rpeFactor = rpeAdjustmentDenominator > 0
    ? 1 / rpeAdjustmentDenominator
    : 1;

  return roundToHalf(epley * rpeFactor);
}

// ─── suggestOverload ─────────────────────────────────────────

/**
 * Prescribes the next session's weight, reps, and RPE based on the athlete's
 * progression model, history, readiness, and deload status.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - input: OverloadInput (assembled by the workout builder or S&C screen)
 *
 * Returns: OverloadSuggestion
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function suggestOverload(input: OverloadInput): OverloadSuggestion {
  const {
    exerciseId,
    exerciseName,
    history,
    progressionModel,
    isDeloadWeek,
    readinessState,
    targetRPE,
    targetReps,
    muscleGroup,
    sessionDate,
    cycleStartDate,
  } = input;

  // ── Confidence from history depth ──
  const confidence: 'high' | 'medium' | 'low' =
    history.length >= 6 ? 'high' :
      history.length >= 3 ? 'medium' :
        'low';

  // ── No history — conservative start ──
  if (history.length === 0) {
    return {
      exerciseId,
      exerciseName,
      suggestedWeight: 0,
      suggestedReps: targetReps,
      suggestedRPE: Math.min(targetRPE, 6),
      lastSessionWeight: 0,
      lastSessionReps: 0,
      lastSessionRPE: null,
      progressionModel,
      confidence: 'low',
      reasoning: 'No history \u2014 start conservatively and build up',
      isDeloadSet: false,
    };
  }

  // ── Pull last session data ──
  const lastSession = history[history.length - 1];
  const lastWeight = lastSession.bestSetWeight;
  const lastReps = lastSession.bestSetReps;
  const lastRPE = lastSession.bestSetRPE;

  let suggestedWeight = lastWeight;
  let suggestedReps = targetReps;
  let suggestedRPE = targetRPE;
  let reasoning = '';

  // ── Progression model logic ──
  switch (progressionModel) {
    case 'linear': {
      // Linear: if last RPE was at or below target, bump weight
      const effectiveLastRPE = lastRPE ?? DEFAULT_RPE;
      if (effectiveLastRPE <= targetRPE) {
        const increment = isUpperBody(muscleGroup) ? 5 : 10;
        suggestedWeight = lastWeight + increment;
        reasoning = `Linear progression: RPE was ${effectiveLastRPE} (target ${targetRPE}), adding ${increment} lbs`;
      } else if (effectiveLastRPE > targetRPE + 1) {
        // RPE exceeded target by more than 1 — hold weight
        suggestedWeight = lastWeight;
        reasoning = `RPE was ${effectiveLastRPE} (>${targetRPE + 1}), holding weight until RPE improves`;
      } else {
        // RPE slightly above target (within 1) — hold weight
        suggestedWeight = lastWeight;
        reasoning = `RPE was ${effectiveLastRPE} (slightly above target ${targetRPE}), holding weight`;
      }
      suggestedReps = targetReps;
      break;
    }

    case 'wave': {
      // Wave / Undulating: cycle through heavy, moderate, light
      const wavePosition = weeksBetween(cycleStartDate ?? history[0]?.date ?? null, sessionDate ?? null) ?? (history.length % 3);
      switch (wavePosition) {
        case 0: // Heavy
          suggestedWeight = roundTo5(lastWeight * 1.10);
          suggestedReps = Math.max(1, targetReps - 2);
          reasoning = `Wave cycle: HEAVY day \u2014 +10% weight, ${suggestedReps} reps`;
          break;
        case 1: // Moderate
          suggestedWeight = lastWeight;
          suggestedReps = targetReps;
          reasoning = `Wave cycle: MODERATE day \u2014 same weight, ${suggestedReps} reps`;
          break;
        case 2: // Light
          suggestedWeight = roundTo5(lastWeight * 0.90);
          suggestedReps = targetReps + 3;
          reasoning = `Wave cycle: LIGHT day \u2014 -10% weight, ${suggestedReps} reps`;
          break;
      }
      break;
    }

    case 'block': {
      // Block: 3-week mesocycles
      const blockPosition = weeksBetween(cycleStartDate ?? history[0]?.date ?? null, sessionDate ?? null) ?? (history.length % 3);
      switch (blockPosition) {
        case 0: // Accumulation
          suggestedWeight = lastWeight;
          suggestedReps = targetReps + 2;
          reasoning = `Block periodization: ACCUMULATION \u2014 moderate weight, high volume (+2 reps)`;
          break;
        case 1: // Transmutation
          suggestedWeight = (lastRPE ?? DEFAULT_RPE) > targetRPE + 1 ? lastWeight : roundTo5(lastWeight * 1.05);
          suggestedReps = Math.max(1, targetReps - 1);
          reasoning = (lastRPE ?? DEFAULT_RPE) > targetRPE + 1
            ? `Block periodization: TRANSMUTATION \u2014 last session overshot target RPE, holding weight`
            : `Block periodization: TRANSMUTATION \u2014 +5% weight, moderate volume`;
          break;
        case 2: // Realization
          suggestedWeight = (lastRPE ?? DEFAULT_RPE) > targetRPE + 1 ? lastWeight : roundTo5(lastWeight * 1.10);
          suggestedReps = Math.max(1, targetReps - 3);
          reasoning = (lastRPE ?? DEFAULT_RPE) > targetRPE + 1
            ? `Block periodization: REALIZATION \u2014 last session overshot target RPE, holding weight`
            : `Block periodization: REALIZATION \u2014 +10% weight, low volume, peak intensity`;
          break;
      }
      break;
    }
  }

  // ── Deload override ──
  let isDeloadSet = false;
  if (isDeloadWeek) {
    const lastEstimated1RM = lastSession.estimated1RM > 0
      ? lastSession.estimated1RM
      : estimateE1RM(lastWeight, Math.max(1, lastReps), lastRPE);
    suggestedWeight = roundTo5(lastEstimated1RM * 0.675);
    suggestedReps = targetReps + 2;
    suggestedRPE = Math.min(suggestedRPE, 5);
    reasoning = `DELOAD WEEK \u2014 67.5% of estimated 1RM, +2 reps, RPE capped at 5`;
    isDeloadSet = true;
  }

  // ── Readiness adjustment (applied after model, including deload) ──
  if (readinessState === 'Caution') {
    suggestedWeight = roundTo5(suggestedWeight * 0.95);
    reasoning += '. Readiness: Caution \u2014 reduced 5%';
  } else if (readinessState === 'Depleted') {
    suggestedWeight = roundTo5(suggestedWeight * 0.85);
    reasoning += '. Readiness: Depleted \u2014 reduced 15%';
  }

  // Ensure weight never goes below 0
  suggestedWeight = Math.max(0, suggestedWeight);

  return {
    exerciseId,
    exerciseName,
    suggestedWeight,
    suggestedReps,
    suggestedRPE,
    lastSessionWeight: lastWeight,
    lastSessionReps: lastReps,
    lastSessionRPE: lastRPE,
    progressionModel,
    confidence,
    reasoning,
    isDeloadSet,
  };
}

// ─── detectPR ────────────────────────────────────────────────

/**
 * Checks a completed lift against existing PR records to detect new personal
 * records for weight, reps, or estimated 1RM.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - exerciseId: string
 *   - exerciseName: string
 *   - weight: number (weight lifted)
 *   - reps: number (reps completed)
 *   - rpe: number | null
 *   - existingPRs: PRRecord[] (from pr_records table for this exercise)
 *
 * Returns: PRDetectionResult
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function detectPR(
  _exerciseId: string,
  exerciseName: string,
  weight: number,
  reps: number,
  rpe: number | null,
  existingPRs: PRRecord[],
): PRDetectionResult {
  const noPR: PRDetectionResult = {
    isNewPR: false,
    prType: null,
    previousBest: null,
    newValue: null,
    exerciseName,
  };

  if (weight <= 0 || reps <= 0) return noPR;

  // ── Check weight PR ──
  const weightPRs = existingPRs.filter(pr => pr.prType === 'weight');
  const maxWeightPR = weightPRs.length > 0
    ? Math.max(...weightPRs.map(pr => pr.value))
    : 0;

  if (weight > maxWeightPR && maxWeightPR >= 0) {
    return {
      isNewPR: true,
      prType: 'weight',
      previousBest: maxWeightPR > 0 ? maxWeightPR : null,
      newValue: weight,
      exerciseName,
    };
  }

  // ── Check reps PR at same or higher weight ──
  const repsPRs = existingPRs.filter(
    pr => pr.prType === 'reps' && pr.weightAtPR !== null && pr.weightAtPR >= weight
  );
  const maxRepsPR = repsPRs.length > 0
    ? Math.max(...repsPRs.map(pr => pr.value))
    : 0;

  if (reps > maxRepsPR && maxRepsPR >= 0) {
    // Also check raw reps PRs without weight filter
    const allRepsPRs = existingPRs.filter(pr => pr.prType === 'reps');
    const allMaxReps = allRepsPRs.length > 0
      ? Math.max(...allRepsPRs.filter(pr => pr.weightAtPR !== null && pr.weightAtPR >= weight).map(pr => pr.value))
      : 0;

    if (reps > allMaxReps) {
      return {
        isNewPR: true,
        prType: 'reps',
        previousBest: allMaxReps > 0 ? allMaxReps : null,
        newValue: reps,
        exerciseName,
      };
    }
  }

  // ── Check estimated 1RM PR ──
  const currentE1RM = estimateE1RM(weight, reps, rpe);
  const e1rmPRs = existingPRs.filter(pr => pr.prType === 'estimated_1rm');
  const maxE1RM = e1rmPRs.length > 0
    ? Math.max(...e1rmPRs.map(pr => pr.value))
    : 0;

  if (currentE1RM > maxE1RM && maxE1RM >= 0) {
    return {
      isNewPR: true,
      prType: 'estimated_1rm',
      previousBest: maxE1RM > 0 ? maxE1RM : null,
      newValue: currentE1RM,
      exerciseName,
    };
  }

  return noPR;
}

// ─── shouldDeload ────────────────────────────────────────────

/**
 * Evaluates multiple fatigue signals to determine if the athlete needs
 * a deload week. Returns the first triggered reason.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - input: DeloadDecisionInput (assembled by the weekly planner)
 *
 * Returns: DeloadDecisionResult
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function shouldDeload(input: DeloadDecisionInput): DeloadDecisionResult {
  const {
    weeksSinceLastDeload,
    autoDeloadIntervalWeeks,
    acwr,
    recentSessionRPEs,
    consecutiveCautionDays,
  } = input;

  const noDeload: DeloadDecisionResult = {
    shouldDeload: false,
    reason: 'No deload triggers detected. Continue training as programmed.',
    suggestedDurationWeeks: 0,
  };

  // Duration: 2 weeks if ACWR is dangerously high, 1 week otherwise
  const baseDuration = acwr > 1.5 ? 2 : 1;

  // ── Trigger 1: Scheduled deload ──
  if (weeksSinceLastDeload >= autoDeloadIntervalWeeks) {
    return {
      shouldDeload: true,
      reason: `Scheduled deload: ${weeksSinceLastDeload} weeks since last deload (interval: every ${autoDeloadIntervalWeeks} weeks)`,
      suggestedDurationWeeks: baseDuration,
    };
  }

  // ── Trigger 2: ACWR elevated ──
  if (acwr >= 1.4) {
    return {
      shouldDeload: true,
      reason: `Elevated ACWR: ${acwr.toFixed(2)} (threshold: 1.40). Training load is outpacing recovery.`,
      suggestedDurationWeeks: baseDuration,
    };
  }

  // ── Trigger 3: Chronic fatigue (high avg RPE over recent sessions) ──
  if (recentSessionRPEs.length >= 4) {
    const avgRPE = recentSessionRPEs.reduce(
      (sum: number, r: number) => sum + r,
      0
    ) / recentSessionRPEs.length;
    if (avgRPE >= 8.5) {
      return {
        shouldDeload: true,
        reason: `Chronic fatigue: average session RPE is ${avgRPE.toFixed(1)} over ${recentSessionRPEs.length} sessions (threshold: 8.5)`,
        suggestedDurationWeeks: baseDuration,
      };
    }
  }

  // ── Trigger 4: Consecutive caution/depleted days ──
  if (consecutiveCautionDays >= 5) {
    return {
      shouldDeload: true,
      reason: `${consecutiveCautionDays} consecutive days in Caution/Depleted readiness. Your body needs recovery.`,
      suggestedDurationWeeks: baseDuration,
    };
  }

  return noDeload;
}

// ─── selectProgressionModel ──────────────────────────────────

/**
 * Selects the most appropriate progression model based on the athlete's
 * fitness level and training history depth.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - fitnessLevel: FitnessLevel (from fitness_profiles)
 *   - historyLength: number (count of ExerciseHistoryEntry records for this exercise)
 *
 * Returns: ProgressionModel
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function selectProgressionModel(
  fitnessLevel: FitnessLevel,
  historyLength: number,
): ProgressionModel {
  // Beginners or insufficient history: linear is safest
  if (fitnessLevel === 'beginner' || historyLength < 8) {
    return 'linear';
  }

  // Intermediate athletes: wave / undulating periodization
  if (fitnessLevel === 'intermediate') {
    return 'wave';
  }

  // Advanced and elite: block periodization
  return 'block';
}
