import type {
  ACWRResult,
  MacrocycleContext,
  ReadinessProfile,
  ScheduledActivityRow,
} from '../../engine/index.ts';
import { normalizeNutritionGoal, type getAthleteContext } from '../athleteContextService';
import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createPhaseState,
  normalizeBodyMass,
  runUnifiedPerformanceEngine,
  type UnifiedPerformanceEngineResult,
} from '../../performance-engine/index.ts';
import { buildDailyBodyMassState } from './bodyMassMapping';
import { mapLegacyPhaseToUnifiedPhase, trainingBackgroundFromFitnessLevel } from './phaseMapping';
import { protectedAnchorsFromScheduledActivities } from './protectedAnchors';
import { buildUnifiedTrackingEntries, type DailyReadinessCheckinRow } from './trackingEntries';

function acwrRatioForUnifiedEngine(acwr: ACWRResult | null): number | null {
  const ratio = acwr?.ratio;
  return typeof ratio === 'number' && Number.isFinite(ratio) ? ratio : null;
}

export function resolveUnifiedDailyPerformance(input: {
  userId: string;
  date: string;
  athleteContext: Awaited<ReturnType<typeof getAthleteContext>>;
  objectiveContext: MacrocycleContext;
  readinessProfile: ReadinessProfile;
  acwr: ACWRResult | null;
  todayCheckin?: DailyReadinessCheckinRow | null | undefined;
  scheduledActivities: ScheduledActivityRow[];
  currentWeight: number | null;
  targetWeight: number | null;
  weekStart: string;
}): UnifiedPerformanceEngineResult | null {
  const profile = input.athleteContext.profile;
  if (!profile) return null;
  const canonicalCurrentWeight = input.objectiveContext.currentWeightLbs ?? input.currentWeight ?? null;

  const phase = createPhaseState({
    current: mapLegacyPhaseToUnifiedPhase(input.objectiveContext.phase),
    activeSince: input.date,
    plannedUntil: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
    transitionReason: input.objectiveContext.goalMode === 'fight_camp' ? 'fight_confirmed' : 'build_phase_started',
  });
  const athlete = createAthleteProfile({
    athleteId: input.userId,
    userId: input.userId,
    sport: 'boxing',
    competitionLevel: profile.fight_status === 'pro' ? 'professional' : 'amateur',
    biologicalSex: profile.biological_sex ?? undefined,
    ageYears: profile.age ?? null,
    preferredBodyMassUnit: 'lb',
    trainingBackground: trainingBackgroundFromFitnessLevel(input.athleteContext.fitnessLevel),
  });
  const bodyMass = buildDailyBodyMassState({
    currentWeightLbs: canonicalCurrentWeight,
    date: input.date,
  });
  const journey = createAthleteJourneyState({
    journeyId: `${input.userId}:journey`,
    athlete,
    timelineStartDate: input.date,
    phase,
    bodyMassState: bodyMass,
    nutritionPreferences: {
      goal: normalizeNutritionGoal(profile.nutrition_goal),
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: Boolean(profile.cycle_tracking),
    },
    confidence: confidenceFromLevel('low', [
      'Daily app flow was projected into AthleteJourneyState during Phase 9 integration.',
    ]),
  });
  const targetClassMass = input.objectiveContext.targetWeightLbs != null
    ? normalizeBodyMass({
      value: input.objectiveContext.targetWeightLbs ?? input.targetWeight,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
      confidence: confidenceFromLevel('medium'),
    })
    : null;
  const hasWeightClassContext = input.objectiveContext.goalMode === 'fight_camp'
    || input.objectiveContext.weightClassState !== 'none'
    || profile.active_weight_class_plan_id != null;

  return runUnifiedPerformanceEngine({
    athlete,
    journey,
    asOfDate: input.date,
    weekStartDate: input.weekStart,
    generatedAt: new Date().toISOString(),
    phase,
    bodyMassState: bodyMass,
    trackingEntries: buildUnifiedTrackingEntries({
      userId: input.userId,
      date: input.date,
      readinessProfile: input.readinessProfile,
      currentWeightLbs: canonicalCurrentWeight,
      todayCheckin: input.todayCheckin,
    }),
    protectedAnchors: protectedAnchorsFromScheduledActivities(input.scheduledActivities),
    acuteChronicWorkloadRatio: acwrRatioForUnifiedEngine(input.acwr),
    weightClass: hasWeightClassContext
      ? {
        competitionId: input.objectiveContext.camp?.id ?? profile.active_weight_class_plan_id ?? null,
        competitionDate: input.objectiveContext.camp?.fightDate ?? profile.fight_date ?? null,
        weighInDateTime: null,
        competitionDateTime: input.objectiveContext.camp?.fightDate
          ? `${input.objectiveContext.camp.fightDate}T00:00:00.000Z`
          : profile.fight_date
            ? `${profile.fight_date}T00:00:00.000Z`
            : null,
        targetClassMass,
        desiredScaleWeight: targetClassMass,
      }
      : null,
  });
}
