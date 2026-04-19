import type {
    ActivityType,
    DailyAdaptationInput,
    DailyAdaptationResult,
    Phase,
    DailyAdaptationSwap,
    ReadinessState,
    ScheduleGenerationInput,
    ScheduledActivityRow,
    WeekPlanEntry,
    SmartWeekPlanInput,
    SmartWeekPlanResult,
    WeeklyComplianceReport,
    WeeklyPlanEntryRow,
    MissedDayRescheduleInput,
    MissedDayRescheduleResult,
    WorkoutFocus,
    PrescribedExercise,
    PlanSlot,
    CampPhase,
    RecurringActivityRow,
    GenerateBlockPlanInput,
    BlockPlanResult,
    WeeklyTrainingMixPlan,
    WeeklySessionTarget,
    DailyTrainingPlacement,
    CarryForwardAdjustment,
    TrainingSessionFamily,
    ExerciseHistoryEntry,
    MuscleGroup,
    SessionModulePlan,
    WorkoutDoseBucket,
} from './types.ts';
import { getFitnessModifiers } from './calculateFitness.ts';
import { getWeeklyRoadWorkPlan } from './calculateRoadWork.ts';
import { getWeeklyConditioningPlan } from './calculateConditioning.ts';
import { determineCampPhase, getCampTrainingModifiers, toCampEnginePhase } from './calculateCamp.ts';
import { getDailyCutIntensityCap } from './calculateWeightCut.ts';
import { shouldDeload } from './calculateOverload.ts';
import { generateWorkoutV2 } from './calculateSC.ts';
import { assessPerformanceRisk, getGoalBasedFocusRotation, resolveTrainingBlockContext } from './performancePlanner.ts';
import { deriveReadinessProfile, deriveStimulusConstraintSet } from './readiness/profile.ts';
import { classifyGuidedSessionType } from './sessionOwnership.ts';
import { todayLocalDate } from '../utils/date.ts';

import {
  ACWR_DANGER,
  addDays,
  buildDayLoadMap,
  dateFromISO,
  daysBetween,
  findCandidateDays,
  getAcwrPlanningThresholds,
  getSessionLoad,
  suggestAlternative,
  validateDayLoad,
} from './schedule/loadAndValidation.ts';
import { detectOvertrainingRisk } from './schedule/safety.ts';

export { getRecoveryWindow, suggestAlternative, validateDayLoad } from './schedule/loadAndValidation.ts';
export { adjustNutritionForDay, detectOvertrainingRisk } from './schedule/safety.ts';
// generateWeekPlan ----------------------------------------------------------

function isBoxingActivityType(activityType: string): boolean {
    return activityType === 'boxing_practice' || activityType === 'sparring';
}

function scaleBoxingIntensity(intensity: number, input: { isOnActiveCut: boolean; daysOut: number | null }): number {
    return Math.max(2, Math.round(intensity * getBoxingIntensityScalar(input)));
}

export function getBoxingIntensityScalar(input: { isOnActiveCut: boolean; daysOut: number | null }): number {
    const { isOnActiveCut, daysOut } = input;
    if (isOnActiveCut || (daysOut !== null && daysOut <= 7)) return 0.6;
    return 1;
}

function createFallbackReadinessProfile(input: {
    readinessState: ReadinessState;
    acwr: number;
    phase: Phase;
    daysOut: number | null;
    isOnActiveCut: boolean;
    trainingIntensityCap?: number | null;
    hasHardSparringScheduled?: boolean;
    hasTechnicalSessionScheduled?: boolean;
}): ReturnType<typeof deriveReadinessProfile> {
    const {
        readinessState,
        acwr,
        phase,
        daysOut,
        isOnActiveCut,
        trainingIntensityCap = null,
        hasHardSparringScheduled = false,
        hasTechnicalSessionScheduled = false,
    } = input;
    const readinessSeed = readinessState === 'Prime' ? 4.4 : readinessState === 'Caution' ? 3.2 : 2.2;
    const sleepSeed = readinessState === 'Prime' ? 4.2 : readinessState === 'Caution' ? 3.1 : 2.3;
    const sorenessSeed = readinessState === 'Prime' ? 2.2 : readinessState === 'Caution' ? 3.2 : 4.2;
    const stressSeed = readinessState === 'Prime' ? 2.1 : readinessState === 'Caution' ? 3.1 : 4.1;

    return deriveReadinessProfile({
        sleepQuality: sleepSeed,
        subjectiveReadiness: readinessSeed,
        confidenceLevel: readinessSeed,
        stressLevel: stressSeed,
        sorenessLevel: sorenessSeed,
        acwrRatio: acwr,
        weightCutIntensityCap: trainingIntensityCap,
        goalMode: phase.startsWith('camp-') || phase === 'fight-camp' ? 'fight_camp' : 'build_phase',
        phase,
        daysOut,
        isOnActiveCut,
        hasHardSparringScheduled,
        hasTechnicalSessionScheduled,
        readinessHistory: [readinessSeed, readinessSeed, readinessSeed],
    });
}

function cloneRecentMuscleVolume(
    recentMuscleVolume: Record<MuscleGroup, number>,
): Record<MuscleGroup, number> {
    return { ...recentMuscleVolume };
}

function cloneExerciseHistory(
    exerciseHistory?: Map<string, ExerciseHistoryEntry[]>,
): Map<string, ExerciseHistoryEntry[]> {
    return new Map(
        Array.from(exerciseHistory?.entries() ?? []).map(([exerciseId, history]) => [exerciseId, [...history]]),
    );
}

function getDaysBetweenPlanDates(previousDate: string | null, nextDate: string): number {
    if (!previousDate) return 0;
    const previousUtc = Date.parse(`${previousDate}T00:00:00Z`);
    const nextUtc = Date.parse(`${nextDate}T00:00:00Z`);
    if (Number.isNaN(previousUtc) || Number.isNaN(nextUtc) || nextUtc <= previousUtc) {
        return 0;
    }
    return Math.round((nextUtc - previousUtc) / (24 * 60 * 60 * 1000));
}

function decayPlanningMuscleVolume(
    recentMuscleVolume: Record<MuscleGroup, number>,
    daysElapsed: number,
): void {
    for (let day = 0; day < daysElapsed; day += 1) {
        for (const muscleGroup of Object.keys(recentMuscleVolume) as MuscleGroup[]) {
            recentMuscleVolume[muscleGroup] = Math.max(0, recentMuscleVolume[muscleGroup] * 0.8);
        }
    }
}

export function updateRollingPlanContextFromPrescription(input: {
    prescription: WeeklyPlanEntryRow['prescription_snapshot'];
    trainingDate: string;
    recentExerciseIds: string[];
    recentMuscleVolume: Record<MuscleGroup, number>;
    exerciseHistory: Map<string, ExerciseHistoryEntry[]>;
}): void {
    const { prescription, trainingDate, recentExerciseIds, recentMuscleVolume, exerciseHistory } = input;
    if (!prescription?.exercises?.length) return;

    const countedExercises = prescription.exercises.filter((exercise) =>
        exercise.sectionTemplate !== 'activation' && exercise.sectionTemplate !== 'cooldown',
    );

    for (const exercise of countedExercises) {
        recentExerciseIds.unshift(exercise.exercise.id);
        recentMuscleVolume[exercise.exercise.muscle_group] = (recentMuscleVolume[exercise.exercise.muscle_group] ?? 0) + exercise.targetSets;

        const history = exerciseHistory.get(exercise.exercise.id) ?? [];
        history.unshift({
            date: trainingDate,
            bestSetWeight: 0,
            bestSetReps: exercise.targetReps,
            bestSetRPE: exercise.targetRPE,
            totalVolume: exercise.targetSets * exercise.targetReps,
            workingSets: exercise.targetSets,
            estimated1RM: 0,
        });
        exerciseHistory.set(exercise.exercise.id, history);
    }

    recentExerciseIds.splice(20);
}

type CampTemplateBucket = 'strength' | 'conditioning' | 'recovery';

interface CampMicrocycleTemplateToken {
    focus: WorkoutFocus;
    required: boolean;
    phase: CampPhase;
    priority: number;
    bucket: CampTemplateBucket;
    fallbackFocus?: WorkoutFocus;
    fallbackBucket?: CampTemplateBucket;
}

type CampMicrocycleTemplate = CampMicrocycleTemplateToken[];

function isStrengthFocus(focus: WorkoutFocus): boolean {
    return focus === 'lower'
        || focus === 'upper_push'
        || focus === 'upper_pull'
        || focus === 'full_body';
}

function resolveRecurringAnchorsForDay(
    recurringActivities: RecurringActivityRow[],
    dayOfWeek: number,
    entryDate: string,
): RecurringActivityRow[] {
    return recurringActivities.filter((activity) => {
        if (!activity.is_active) return false;
        if (activity.recurrence.frequency === 'daily') return true;
        if (activity.recurrence.frequency === 'weekly') {
            return activity.recurrence.days_of_week?.includes(dayOfWeek) ?? false;
        }
        return activity.recurrence.day_of_month === dateFromISO(entryDate).getDate();
    });
}

function getCampStrengthFocusSequence(input: {
    performanceGoalType: SmartWeekPlanInput['performanceGoalType'];
    blockContext: ReturnType<typeof resolveTrainingBlockContext>;
    isDeloadWeek: boolean;
}): WorkoutFocus[] {
    const { performanceGoalType = 'conditioning', blockContext, isDeloadWeek } = input;
    const rotation = getGoalBasedFocusRotation({
        performanceGoalType,
        scDayCount: 4,
        isDeloadWeek,
        blockContext,
    });
    const fallbackByGoal: Record<NonNullable<SmartWeekPlanInput['performanceGoalType']>, WorkoutFocus[]> = {
        strength: ['lower', 'upper_push', 'upper_pull', 'full_body'],
        conditioning: ['lower', 'upper_pull', 'full_body', 'upper_push'],
        boxing_skill: ['lower', 'upper_pull', 'upper_push', 'full_body'],
        weight_class_prep: ['full_body', 'upper_pull', 'lower', 'upper_push'],
    };
    const ordered = [...rotation, ...fallbackByGoal[performanceGoalType]];
    const seen = new Set<WorkoutFocus>();
    const result: WorkoutFocus[] = [];

    for (const focus of ordered) {
        if (!isStrengthFocus(focus) || seen.has(focus)) continue;
        seen.add(focus);
        result.push(focus);
    }

    return result.length > 0
        ? result
        : ['full_body', 'lower', 'upper_push', 'upper_pull'];
}

export function buildCampMicrocycleTemplate(input: {
    campPhase: CampPhase;
    performanceGoalType: SmartWeekPlanInput['performanceGoalType'];
    blockContext: ReturnType<typeof resolveTrainingBlockContext>;
    isDeloadWeek: boolean;
    capacity: number;
    sparringDayCount: number;
    campModifiers: ReturnType<typeof getCampTrainingModifiers> | null;
}): CampMicrocycleTemplate {
    const {
        campPhase,
        performanceGoalType,
        blockContext,
        isDeloadWeek,
        capacity,
        sparringDayCount,
        campModifiers,
    } = input;
    const remainingCapacity = Math.max(0, capacity - sparringDayCount);
    if (remainingCapacity <= 0) return [];

    const strengthFocuses = getCampStrengthFocusSequence({
        performanceGoalType,
        blockContext,
        isDeloadWeek,
    });
    const makeToken = (
        focus: WorkoutFocus,
        bucket: CampTemplateBucket,
        required: boolean,
        priority: number,
        fallbackFocus?: WorkoutFocus,
        fallbackBucket?: CampTemplateBucket,
    ): CampMicrocycleTemplateToken => ({
        focus,
        required,
        phase: campPhase,
        priority,
        bucket,
        fallbackFocus,
        fallbackBucket,
    });

    const rawTemplate: CampMicrocycleTemplate = (() => {
        if (campPhase === 'base') {
            return [
                makeToken(strengthFocuses[0] ?? 'lower', 'strength', true, 0),
                makeToken(strengthFocuses[1] ?? 'upper_push', 'strength', true, 1),
                makeToken('conditioning', 'conditioning', true, 2),
                makeToken('full_body', 'strength', false, 3, 'recovery', 'recovery'),
            ];
        }

        if (campPhase === 'build') {
            return [
                makeToken(strengthFocuses[0] ?? 'full_body', 'strength', true, 0),
                makeToken(strengthFocuses[1] ?? 'upper_pull', 'strength', true, 1),
                makeToken('conditioning', 'conditioning', true, 2),
                makeToken('recovery', 'recovery', false, 3),
            ];
        }

        if (campPhase === 'peak') {
            return [
                makeToken(strengthFocuses[0] ?? 'full_body', 'strength', true, 0),
                makeToken('conditioning', 'conditioning', true, 1),
                makeToken('recovery', 'recovery', false, 2),
            ];
        }

        return [
            makeToken('recovery', 'recovery', true, 0),
            makeToken('recovery', 'recovery', false, 1),
        ];
    })();

    const rawStrengthCount = rawTemplate.filter((token) => token.bucket === 'strength').length;
    const rawConditioningCount = rawTemplate.filter((token) => token.bucket === 'conditioning').length;
    const strengthCeiling = campPhase === 'taper'
        ? 0
        : Math.min(
            rawStrengthCount,
            Math.max(1, campModifiers?.scSessionsPerWeek ?? rawStrengthCount),
        );
    const conditioningCeiling = Math.min(
        rawConditioningCount,
        campModifiers?.conditioningSessionsPerWeek ?? rawConditioningCount,
    );
    const bucketCounts: Record<CampTemplateBucket, number> = {
        strength: 0,
        conditioning: 0,
        recovery: 0,
    };
    const resolved: CampMicrocycleTemplate = [];

    for (const token of rawTemplate) {
        if (resolved.length >= remainingCapacity) break;

        let candidate = token;
        if (candidate.bucket === 'strength' && bucketCounts.strength >= strengthCeiling) {
            if (candidate.fallbackFocus && candidate.fallbackBucket) {
                candidate = {
                    ...candidate,
                    focus: candidate.fallbackFocus,
                    bucket: candidate.fallbackBucket,
                    fallbackFocus: undefined,
                    fallbackBucket: undefined,
                };
            } else {
                continue;
            }
        }

        if (candidate.bucket === 'conditioning' && bucketCounts.conditioning >= conditioningCeiling) {
            continue;
        }

        bucketCounts[candidate.bucket] += 1;
        resolved.push(candidate);
    }

    return resolved;
}

interface GuidedSessionBlueprint {
    family: TrainingSessionFamily;
    focus: WorkoutFocus;
    progressionIntent: string;
    sessionModules: SessionModulePlan[];
    preferredDurationMin: number;
}

function mapDoseBucketToFamily(bucket: WorkoutDoseBucket): TrainingSessionFamily {
    if (bucket === 'conditioning') return 'conditioning';
    if (bucket === 'durability') return 'durability_core';
    if (bucket === 'recovery') return 'recovery';
    return 'strength';
}

function isComboBlueprint(blueprint: GuidedSessionBlueprint): boolean {
    return blueprint.sessionModules.length > 1;
}

export function getFamilyForFocus(focus: WorkoutFocus): TrainingSessionFamily {
    if (focus === 'conditioning') return 'conditioning';
    if (focus === 'recovery') return 'recovery';
    if (focus === 'sport_specific') return 'boxing_skill';
    return 'strength';
}

function getProgressionIntent(input: {
    family: TrainingSessionFamily;
    focus: WorkoutFocus;
    campPhase: CampPhase | null;
    performanceGoalType: SmartWeekPlanInput['performanceGoalType'];
}): string {
    const { family, focus, campPhase, performanceGoalType } = input;
    if (family === 'conditioning') {
        return campPhase === 'peak'
            ? 'Keep the engine sharp without stealing freshness from skill work.'
            : 'Build transferable conditioning that still supports ring performance.';
    }
    if (family === 'durability_core') {
        return 'Reinforce trunk, neck, shoulders, and positional durability.';
    }
    if (family === 'recovery') {
        return 'Restore movement quality and keep fatigue from accumulating across the week.';
    }
    if (family === 'boxing_skill') {
        return 'Support timing, rhythm, and ring-specific sharpness.';
    }
    const goalLabel = String(performanceGoalType ?? 'conditioning').replace(/_/g, ' ');
    return `Push ${goalLabel} forward through ${focus.replace(/_/g, ' ')} work.`;
}

function buildGuidedSessionBlueprints(input: {
    guidedCapacity: number;
    campPhase: CampPhase | null;
    performanceGoalType: SmartWeekPlanInput['performanceGoalType'];
    blockContext: ReturnType<typeof resolveTrainingBlockContext>;
    isDeloadWeek: boolean;
    sparringDayCount: number;
    campModifiers: ReturnType<typeof getCampTrainingModifiers> | null;
}): GuidedSessionBlueprint[] {
    const {
        guidedCapacity,
        campPhase,
        performanceGoalType = 'conditioning',
        blockContext,
        isDeloadWeek,
        sparringDayCount,
        campModifiers,
    } = input;
    void sparringDayCount;
    void campModifiers;

    if (guidedCapacity <= 0) return [];

    const strengthFocuses = getCampStrengthFocusSequence({
        performanceGoalType,
        blockContext,
        isDeloadWeek,
    });
    const pushBlueprint = (
        list: GuidedSessionBlueprint[],
        family: TrainingSessionFamily,
        focus: WorkoutFocus,
        preferredDurationMin: number,
        sessionModules?: SessionModulePlan[],
    ) => {
        list.push({
            family,
            focus,
            preferredDurationMin,
            sessionModules: sessionModules ?? [{
                bucket: family === 'conditioning'
                    ? 'conditioning'
                    : family === 'durability_core'
                        ? 'durability'
                        : family === 'recovery'
                            ? 'recovery'
                            : 'strength',
                focus,
                durationMin: preferredDurationMin,
                preserveOnYellow: true,
            }],
            progressionIntent: getProgressionIntent({
                family,
                focus,
                campPhase,
                performanceGoalType,
            }),
        });
    };

    const blueprints: GuidedSessionBlueprint[] = [];

    if (isDeloadWeek || campPhase === 'taper') {
        pushBlueprint(blueprints, 'recovery', 'recovery', 35);
        if (guidedCapacity >= 2) pushBlueprint(blueprints, 'recovery', 'recovery', 30);
        return blueprints.slice(0, guidedCapacity);
    }

    if (campPhase === 'peak') {
        pushBlueprint(blueprints, 'strength', strengthFocuses[0] ?? 'full_body', 70);
        if (guidedCapacity >= 2) pushBlueprint(blueprints, 'conditioning', 'conditioning', 40);
        if (guidedCapacity >= 3) pushBlueprint(blueprints, 'durability_core', 'full_body', 35);
        return blueprints.slice(0, guidedCapacity);
    }

    if (guidedCapacity >= 5) {
        pushBlueprint(blueprints, 'strength', strengthFocuses[0] ?? 'lower', 80);
        pushBlueprint(blueprints, 'conditioning', 'conditioning', 45);
        pushBlueprint(blueprints, 'strength', strengthFocuses[1] ?? 'upper_pull', 78);
        pushBlueprint(blueprints, 'durability_core', 'full_body', 35);
        pushBlueprint(blueprints, 'conditioning', 'conditioning', 42);
        return blueprints.slice(0, guidedCapacity);
    }

    if (guidedCapacity === 4) {
        pushBlueprint(
            blueprints,
            'strength',
            strengthFocuses[0] ?? 'full_body',
            92,
            [
                { bucket: 'strength', focus: strengthFocuses[0] ?? 'full_body', durationMin: 68, preserveOnYellow: true },
                { bucket: 'conditioning', focus: 'conditioning', durationMin: 18, preserveOnYellow: true },
            ],
        );
        pushBlueprint(blueprints, 'strength', strengthFocuses[1] ?? 'upper_pull', 75);
        pushBlueprint(blueprints, 'conditioning', 'conditioning', 42);
        pushBlueprint(blueprints, 'durability_core', 'full_body', 35);
        return blueprints;
    }

    if (guidedCapacity === 3) {
        pushBlueprint(
            blueprints,
            'strength',
            strengthFocuses[0] ?? 'full_body',
            90,
            [
                { bucket: 'strength', focus: strengthFocuses[0] ?? 'full_body', durationMin: 68, preserveOnYellow: true },
                { bucket: 'conditioning', focus: 'conditioning', durationMin: 18, preserveOnYellow: true },
            ],
        );
        pushBlueprint(blueprints, 'strength', strengthFocuses[1] ?? 'upper_pull', 70);
        pushBlueprint(blueprints, 'conditioning', 'conditioning', 40);
        return blueprints;
    }

    if (guidedCapacity === 2) {
        pushBlueprint(
            blueprints,
            'strength',
            strengthFocuses[0] ?? 'full_body',
            88,
            [
                { bucket: 'strength', focus: strengthFocuses[0] ?? 'full_body', durationMin: 66, preserveOnYellow: true },
                { bucket: 'conditioning', focus: 'conditioning', durationMin: 18, preserveOnYellow: true },
            ],
        );
        pushBlueprint(blueprints, 'durability_core', 'full_body', 30);
        return blueprints;
    }

    pushBlueprint(blueprints, 'strength', strengthFocuses[0] ?? 'full_body', 85);
    return blueprints;
}

function pickBlueprintForDay(
    queue: GuidedSessionBlueprint[],
    input: { hasCombatAnchor: boolean; isSparringDay: boolean },
): GuidedSessionBlueprint | null {
    if (queue.length === 0) return null;

    const ranked = [...queue].sort((left, right) => {
        const rank = (blueprint: GuidedSessionBlueprint): number => {
            if (input.isSparringDay) {
                if (blueprint.family === 'durability_core') return 0;
                if (blueprint.family === 'recovery') return 1;
                if (blueprint.family === 'conditioning') return 2;
                return isComboBlueprint(blueprint) ? 5 : 4;
            }
            if (input.hasCombatAnchor) {
                if (blueprint.family === 'conditioning') return 0;
                if (blueprint.family === 'durability_core') return 1;
                if (blueprint.family === 'strength' && !isComboBlueprint(blueprint)) return 2;
                if (blueprint.family === 'recovery') return 3;
                return isComboBlueprint(blueprint) ? 4 : 5;
            }
            if (isComboBlueprint(blueprint)) return 0;
            if (blueprint.family === 'strength') return 1;
            if (blueprint.family === 'conditioning') return 2;
            if (blueprint.family === 'durability_core') return 3;
            return 4;
        };

        const leftRank = rank(left);
        const rightRank = rank(right);
        if (leftRank !== rightRank) return leftRank - rightRank;
        return right.preferredDurationMin - left.preferredDurationMin;
    });

    return ranked[0] ?? null;
}

function consumeBlueprint(
    queue: GuidedSessionBlueprint[],
    blueprint: GuidedSessionBlueprint,
): void {
    const index = queue.findIndex((item) =>
        item.family === blueprint.family
        && item.focus === blueprint.focus
        && item.progressionIntent === blueprint.progressionIntent,
    );

    if (index >= 0) {
        queue.splice(index, 1);
    }
}

function familyForRecurringActivity(activity: RecurringActivityRow): TrainingSessionFamily {
    switch (activity.activity_type) {
        case 'sparring':
            return 'sparring';
        case 'boxing_practice':
            return 'boxing_skill';
        case 'conditioning':
        case 'road_work':
        case 'running':
            return 'conditioning';
        case 'active_recovery':
            return 'recovery';
        case 'rest':
            return 'rest';
        case 'sc':
            return 'strength';
        default:
            return 'boxing_skill';
    }
}

function buildSessionTargets(input: {
    weekStartDate: string;
    blueprints: GuidedSessionBlueprint[];
    placements: DailyTrainingPlacement[];
}): WeeklySessionTarget[] {
    const families: TrainingSessionFamily[] = ['sparring', 'boxing_skill', 'conditioning', 'strength', 'durability_core', 'recovery', 'rest'];
    const blueprintCounts = new Map<TrainingSessionFamily, number>();
    const placementCounts = new Map<TrainingSessionFamily, number>();
    const realizedCounts = new Map<TrainingSessionFamily, number>();
    const substitutionCounts = new Map<TrainingSessionFamily, number>();

    for (const blueprint of input.blueprints) {
        for (const module of blueprint.sessionModules) {
            const family = mapDoseBucketToFamily(module.bucket);
            blueprintCounts.set(family, (blueprintCounts.get(family) ?? 0) + 1);
        }
        blueprintCounts.set(blueprint.family, Math.max(blueprintCounts.get(blueprint.family) ?? 0, 1));
    }

    for (const placement of input.placements) {
        placementCounts.set(placement.sessionFamily, (placementCounts.get(placement.sessionFamily) ?? 0) + 1);
        for (const bucket of placement.realizedDoseBuckets ?? []) {
            const family = mapDoseBucketToFamily(bucket);
            realizedCounts.set(family, (realizedCounts.get(family) ?? 0) + 1);
        }
        for (const credit of placement.doseCredits ?? []) {
            if (!credit.preservedBySubstitution) continue;
            const family = mapDoseBucketToFamily(credit.bucket);
            substitutionCounts.set(family, (substitutionCounts.get(family) ?? 0) + 1);
        }
    }

    const occupiedDays = new Set(input.placements.map((placement) => placement.date));
    const restTarget = Math.max(0, 7 - occupiedDays.size);

    return families.map((family) => {
        const fixedFamily = family === 'sparring' || family === 'boxing_skill';
        const target = family === 'rest'
            ? restTarget
            : fixedFamily
                ? (placementCounts.get(family) ?? 0)
                : (blueprintCounts.get(family) ?? 0);
        const realized = fixedFamily ? (placementCounts.get(family) ?? 0) : (realizedCounts.get(family) ?? 0);
        const scheduled = fixedFamily ? (placementCounts.get(family) ?? 0) : realized;
        const min = fixedFamily
            ? target
            : target === 0
                ? 0
                : Math.max(1, target - 1);
        const max = fixedFamily
            ? target
            : Math.max(target, target + (family === 'recovery' || family === 'rest' ? 1 : 0));

        return {
            family,
            min,
            target,
            max,
            scheduled,
            completed: 0,
            floor: min,
            realized,
            debt: Math.max(0, target - realized),
            metBySubstitution: substitutionCounts.get(family) ?? 0,
            missReason: target > 0 && realized < min
                ? 'Realized dose stayed below the weekly floor.'
                : null,
        };
    });
}

function buildWeekIntent(input: {
    campPhase: CampPhase | null;
    performanceGoalType: SmartWeekPlanInput['performanceGoalType'];
    isDeloadWeek: boolean;
    activeCutPlan: SmartWeekPlanInput['activeCutPlan'];
}): string {
    if (input.isDeloadWeek) {
        return 'Deload and re-accumulate freshness while keeping one or two key qualities online.';
    }

    const goalLabel = String(input.performanceGoalType ?? 'conditioning').replace(/_/g, ' ');
    if (input.campPhase) {
        return input.activeCutPlan
            ? `Fight-camp ${input.campPhase} week. Bias ${goalLabel} while respecting the active cut and preserving ring freshness.`
            : `Fight-camp ${input.campPhase} week. Bias ${goalLabel} while balancing ring work, engine work, and recovery.`;
    }

    return `Build-phase week. Bias ${goalLabel} without letting any one session family disappear from the mix.`;
}

function resolveGuidedDuration(input: {
    blueprint: GuidedSessionBlueprint;
    isDeloadWeek: boolean;
    isSparringDay: boolean;
    hasCombatAnchor: boolean;
    performanceRisk: ReturnType<typeof assessPerformanceRisk>;
    blockContext: ReturnType<typeof resolveTrainingBlockContext>;
}): number {
    const { blueprint, isDeloadWeek, isSparringDay, hasCombatAnchor, performanceRisk, blockContext } = input;
    let duration = blueprint.preferredDurationMin;

    if (isDeloadWeek) {
        duration = Math.min(duration, 40);
    } else if (isSparringDay) {
        duration = Math.min(duration, 30);
    } else if (hasCombatAnchor) {
        duration = Math.min(duration, isComboBlueprint(blueprint) ? 55 : 40);
    }

    if (performanceRisk.level === 'yellow') {
        duration = Math.min(duration, hasCombatAnchor ? 40 : duration);
    } else if (performanceRisk.level === 'orange') {
        duration = Math.min(duration, 30);
    }

    return Math.max(20, Math.round(duration * blockContext.volumeMultiplier * performanceRisk.volumeMultiplier));
}

function stripSecondaryModulesForYellow(
    modules: SessionModulePlan[],
    input: { hasCombatAnchor: boolean; performanceRisk: ReturnType<typeof assessPerformanceRisk> },
): SessionModulePlan[] {
    if (!input.hasCombatAnchor || input.performanceRisk.level !== 'yellow') return modules;
    return modules.slice(0, 1).map((module) => ({
        ...module,
        durationMin: module.bucket === 'conditioning'
            ? Math.min(module.durationMin ?? 35, 35)
            : Math.min(module.durationMin ?? 40, 40),
    }));
}

/**
 * Given the user's recurring template, readiness, ACWR, phase, fitness level,
 * camp config, and weekly targets - produces a full weekly schedule including
 * S&C, road work, conditioning, and recovery sessions placed around the user's
 * existing commitments.
 *
 * NEVER moves or removes user-scheduled activities.
 * At most provides engine recommendations for adjustment.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateWeekPlan(
    input: ScheduleGenerationInput,
): WeekPlanEntry[] {
    const {
        readinessState,
        phase,
        acwr,
        recurringActivities,
        existingActivities,
        weeklyTargets,
        sleepTrendAvg,
        weekStartDate,
        fitnessLevel = 'intermediate',
        campConfig = null,
        age = null,
    } = input;

    const result: WeekPlanEntry[] = [];

    // ── Step 1: Populate template activities as hard constraints ──
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = addDays(weekStartDate, dayOffset);
        const localDayOfWeek = dateFromISO(date).getDay();
        const dayTemplates = recurringActivities.filter(t =>
            t.is_active &&
            t.recurrence.frequency === 'weekly' &&
            t.recurrence.days_of_week?.includes(localDayOfWeek)
        );

        const cutCap = getDailyCutIntensityCap(input.activeCutPlan, date);
        const daysOut = input.activeCutPlan
            ? Math.max(0, daysBetween(date, input.activeCutPlan.weigh_in_date))
            : input.campConfig
                ? Math.max(0, daysBetween(date, input.campConfig.fightDate))
                : null;

        for (const tmpl of dayTemplates) {
            const exists = existingActivities.some(
                a => a.date === date && a.activity_type === tmpl.activity_type &&
                    a.start_time === tmpl.start_time
            );
            if (!exists) {
                let finalIntensity = tmpl.expected_intensity;
                let engRec = 'Template activity';

                if (isBoxingActivityType(tmpl.activity_type)) {
                    const taperedIntensity = scaleBoxingIntensity(finalIntensity, {
                        isOnActiveCut: input.activeCutPlan != null,
                        daysOut,
                    });
                    if (taperedIntensity !== finalIntensity) {
                        finalIntensity = taperedIntensity;
                        engRec = 'Boxing taper active - intensity reduced 40% to preserve freshness.';
                    }
                }

                if (cutCap != null && finalIntensity > cutCap) {
                    finalIntensity = cutCap;
                    engRec = `⚠️ Intensity capped at ${cutCap} due to strict weight cut protocol limits.`;
                }

                result.push({
                    date,
                    activity_type: tmpl.activity_type,
                    start_time: tmpl.start_time,
                    estimated_duration_min: tmpl.estimated_duration_min,
                    expected_intensity: finalIntensity,
                    source: 'template',
                    engine_recommendation: engRec,
                });
            }
        }
    }

    // Combined view of all committed activities (template + already-saved)
    const allCommitted = [...existingActivities, ...result];

    // ── Resolve effective phase (camp-aware) ──
    const effectivePhase: Phase = (() => {
        if (campConfig) {
            const campPhase = determineCampPhase(campConfig, weekStartDate);
            if (campPhase) return toCampEnginePhase(campPhase);
        }
        return phase;
    })();

    // ── Camp modifiers (if in camp) ──
    const campModifiers = (() => {
        if (campConfig) {
            const campPhase = determineCampPhase(campConfig, weekStartDate);
            if (campPhase) {
                return getCampTrainingModifiers(campPhase, fitnessLevel, campConfig.hasConcurrentCut);
            }
        }
        return null;
    })();

    // ── Fitness modifiers ──
    const fitnessModifiers = getFitnessModifiers(fitnessLevel, effectivePhase);
    const acwrThresholds = getAcwrPlanningThresholds(
    fitnessLevel,
    effectivePhase,
    input.activeCutPlan != null,
);

    // Determine base S&C intensity
    let baseScIntensity = 7;
    if (readinessState === 'Depleted' || acwr > acwrThresholds.redline) {
        baseScIntensity = 4;
    } else if (readinessState === 'Caution' || acwr > acwrThresholds.caution) {
        baseScIntensity = 5;
    } else if (sleepTrendAvg > 0 && sleepTrendAvg < 3.0) {
        baseScIntensity = 5;
    }
    // Apply camp intensity cap
    if (campModifiers) {
        baseScIntensity = Math.min(baseScIntensity, campModifiers.intensityCap);
    }
    // Apply fitness level intensity cap
    baseScIntensity = Math.min(baseScIntensity, fitnessModifiers.intensityCap);

    // ── Step 2: Fill S&C sessions ──
    const scTarget = campModifiers
        ? campModifiers.scSessionsPerWeek
        : weeklyTargets.sc_sessions;
    const scCount = allCommitted.filter(a => a.activity_type === 'sc').length;
    const scNeeded = Math.max(0, Math.round(scTarget * fitnessModifiers.volumeMultiplier) - scCount);

    if (scNeeded > 0) {
        const dayLoads = buildDayLoadMap(allCommitted);
        const scCandidates = findCandidateDays(
            weekStartDate, allCommitted, dayLoads,
            (dayActs) => !dayActs.some(a => a.activity_type === 'sparring') &&
                !dayActs.some(a => a.activity_type === 'sc') &&
                (dayLoads.get(dayActs[0]?.date ?? '') ?? 0) < 600,
            600,
        );

        for (let i = 0; i < Math.min(scNeeded, scCandidates.length); i++) {
            const date = scCandidates[i];
            const prevDate = addDays(date, -1);

            // Apply weight cut intensity cap derived from date
            const cutCap = getDailyCutIntensityCap(input.activeCutPlan, date);
            const scIntensity = cutCap != null ? Math.min(baseScIntensity, cutCap) : baseScIntensity;

            const hadSparringYesterday = allCommitted.some(
                a => a.date === prevDate && a.activity_type === 'sparring' && a.expected_intensity >= 7
            );
            if (hadSparringYesterday) continue;

            const reasons: string[] = [];
            if (readinessState !== 'Prime') reasons.push(`readiness is ${readinessState}`);
            if (acwr > acwrThresholds.caution) reasons.push(`ACWR at ${acwr.toFixed(2)}`);
            if (sleepTrendAvg > 0 && sleepTrendAvg < 3.0) reasons.push(`sleep low`);
            if (cutCap != null && cutCap < baseScIntensity) reasons.push(`weight cut phase limits intensity`);

            const recommendation = reasons.length > 0
                ? `S&C at RPE ${scIntensity} (reduced — ${reasons.join(', ')}). Adaptation improves when load matches recovery.`
                : `S&C placed here — lowest existing load, adequate recovery from surrounding sessions.`;

            result.push({
                date,
                activity_type: 'sc',
                start_time: null,
                estimated_duration_min: scIntensity >= 7 ? 60 : 45,
                expected_intensity: scIntensity,
                source: 'engine',
                engine_recommendation: recommendation,
                recommendation_reason: recommendation,
            });
        }
    }

    // ── Step 3: Fill road work sessions ──
    const allAfterSC = [...allCommitted, ...result.filter(r => r.source === 'engine')];
    const roadWorkTarget = campModifiers
        ? campModifiers.roadWorkSessionsPerWeek
        : weeklyTargets.road_work_sessions;
    const roadWorkCount = allAfterSC.filter(a => a.activity_type === 'road_work' || a.activity_type === 'running').length;
    const roadWorkNeeded = Math.max(
        0,
        Math.round(roadWorkTarget * fitnessModifiers.roadWorkDistanceMultiplier) - roadWorkCount
    );

    if (roadWorkNeeded > 0) {
        const roadWorkPlan = getWeeklyRoadWorkPlan({
            weekStartDate,
            prescriptionsNeeded: roadWorkNeeded,
            recurringActivities,
            existingActivities: allAfterSC as ScheduledActivityRow[],
            fitnessLevel,
            phase: effectivePhase,
            readinessState,
            acwr,
            age,
            campConfig,
            activeCutPlan: input.activeCutPlan ?? null,
        });

        for (const { date, prescription } of roadWorkPlan) {
            result.push({
                date,
                activity_type: 'road_work',
                start_time: null,
                estimated_duration_min: prescription.totalDurationMin,
                expected_intensity: prescription.cnsBudget,
                source: 'engine',
                engine_recommendation: prescription.message,
                road_work_prescription: prescription,
                recommendation_reason: prescription.progressionNote,
            });
        }
    }

    // ── Step 4: Fill conditioning sessions ──
    const allAfterRW = [...allAfterSC, ...result.filter(r => r.activity_type === 'road_work')];
    const condTarget = campModifiers
        ? campModifiers.conditioningSessionsPerWeek
        : weeklyTargets.conditioning_sessions;
    const condCount = allAfterRW.filter(a => a.activity_type === 'conditioning').length;
    const condNeeded = Math.max(
        0,
        Math.round(condTarget * fitnessModifiers.conditioningRoundsMultiplier) - condCount
    );

    if (condNeeded > 0) {
        const condPlan = getWeeklyConditioningPlan({
            weekStartDate,
            prescriptionsNeeded: condNeeded,
            recurringActivities,
            existingActivities: allAfterRW as ScheduledActivityRow[],
            fitnessLevel,
            phase: effectivePhase,
            readinessState,
            acwr,
            campConfig,
            activeCutPlan: input.activeCutPlan ?? null,
        });

        for (const { date, prescription } of condPlan) {
            result.push({
                date,
                activity_type: 'conditioning',
                start_time: null,
                estimated_duration_min: prescription.totalDurationMin,
                expected_intensity: prescription.cnsBudget,
                source: 'engine',
                engine_recommendation: prescription.message,
                conditioning_prescription: prescription,
                recommendation_reason: `${prescription.type} — ${prescription.intensityLabel} intensity`,
            });
        }
    }

    // ── Step 5: Ensure minimum recovery days ──
    const allAfterCond = [
        ...allAfterRW,
        ...result.filter(r => r.activity_type === 'conditioning'),
    ];
    const recoveryTarget = campModifiers
        ? campModifiers.mandatoryRestDaysPerWeek
        : Math.max(weeklyTargets.recovery_sessions, fitnessModifiers.recoveryDayFrequency);

    const recoveryCount = allAfterCond.filter(
        a => a.activity_type === 'active_recovery' || a.activity_type === 'rest'
    ).length;
    const recoveryNeeded = Math.max(0, recoveryTarget - recoveryCount);

    if (recoveryNeeded > 0) {
        // Find completely empty days
        const emptyDays: string[] = [];
        for (let offset = 0; offset < 7; offset++) {
            const date = addDays(weekStartDate, offset);
            const hasAnything = allAfterCond.some(a => a.date === date);
            if (!hasAnything) emptyDays.push(date);
        }

        for (let i = 0; i < Math.min(recoveryNeeded, emptyDays.length); i++) {
            const date = emptyDays[i];
            result.push({
                date,
                activity_type: 'active_recovery',
                start_time: null,
                estimated_duration_min: 30,
                expected_intensity: 2,
                source: 'engine',
                engine_recommendation: 'Active recovery — mobility, foam rolling, or light walk. This day is essential for adaptation; the work you did earlier in the week consolidates during recovery.',
                recommendation_reason: 'Scheduled recovery to meet minimum recovery target for your fitness level and phase.',
            });
        }
    }

    // ── Step 6: Validate Day Loads (Bug 6 Auto-Correction) ──
    for (let offset = 0; offset < 7; offset++) {
        const date = addDays(weekStartDate, offset);
        const dayActivities = [
            ...allCommitted.filter(a => a.date === date),
            ...result.filter(a => a.date === date)
        ];

        if (dayActivities.length === 0) continue;

        let validation = validateDayLoad(dayActivities as any);
        let passes = 0;

        while (!validation.safe && passes < 3) {
            passes++;
            // Find a heavy session to downgrade (prioritize engine S&C/Cond, then template)
            const candidates = result.filter(a => a.date === date && ['engine', 'template'].includes(a.source || ''));
            if (candidates.length === 0) break;

            candidates.sort((a, b) => {
                if (a.source === 'engine' && b.source !== 'engine') return -1;
                if (b.source === 'engine' && a.source !== 'engine') return 1;
                return b.expected_intensity - a.expected_intensity;
            });

            const toDowngrade = candidates[0];

            if (toDowngrade.expected_intensity <= 4) {
                // Too low to downgrade further, try to completely swap to recovery if not already
                if (toDowngrade.activity_type !== 'active_recovery') {
                    toDowngrade.activity_type = 'active_recovery';
                    toDowngrade.expected_intensity = 2;
                    toDowngrade.engine_recommendation = `⚠️ Auto-corrected from original schedule to 'recovery' to protect CNS.`;
                } else {
                    break; // Nothing more we can do
                }
            } else {
                toDowngrade.expected_intensity -= 2;
                toDowngrade.engine_recommendation = `⚠️ Intensity artificially reduced by 2 RPE to protect your day load from exceeding safe thresholds. ` + (toDowngrade.engine_recommendation || '');
            }

            // Re-validate
            validation = validateDayLoad(dayActivities as any);
        }
    }

    // ── Step 7: Final overtraining check (Bug 5 Auto-Correction) ──
    const finalWeek = [
        ...allCommitted,
        ...result,
    ].map(a => ({
        date: a.date ?? weekStartDate,
        activity_type: a.activity_type,
        expected_intensity: a.expected_intensity,
        estimated_duration_min: a.estimated_duration_min,
    }));

    const warnings = detectOvertrainingRisk(
        finalWeek,
        acwr,
        sleepTrendAvg,
        input.activeCutPlan != null, // Has an active weight cut
        { fitnessLevel, phase: effectivePhase },
    );

    if (warnings.length > 0) {
        // Auto-correct: downgrade 1-2 engine sessions later in the week
        // Find the hardest engine sessions
        const hardEngineSessions = result
            .filter(a => a.source === 'engine' && a.expected_intensity >= 6)
            .sort((a, b) => b.expected_intensity - a.expected_intensity);

        const downgradesCount = warnings.some(w => w.severity === 'danger') ? 2 : 1;

        for (let i = 0; i < Math.min(downgradesCount, hardEngineSessions.length); i++) {
            const entry = hardEngineSessions[i];
            entry.expected_intensity -= 2;
            entry.engine_recommendation = `⚠️ Overtraining risk detected across the week. Intensity reduced by 2 RPE to protect CNS recovery. ` + (entry.engine_recommendation ?? '');
            if (entry.expected_intensity < 2) entry.expected_intensity = 2;
        }
    }

    // ── Step 8: Final strict weight cut cap enforcement ──
    const finalCleaned: WeekPlanEntry[] = [];
    for (const act of result) {
        const cutCap = getDailyCutIntensityCap(input.activeCutPlan, act.date);
        if (cutCap != null && act.expected_intensity > cutCap) {
            if (act.source === 'engine') {
                if (cutCap <= 2 && act.activity_type !== 'active_recovery') {
                    act.activity_type = 'active_recovery';
                    act.expected_intensity = 2;
                    act.engine_recommendation = `⚠️ Swapped to active recovery to comply with strict weight cut limits. ` + (act.engine_recommendation || '');
                } else {
                    act.expected_intensity = cutCap;
                    act.engine_recommendation = `⚠️ Intensity reduced to ${cutCap} due to active weight cut protocols. ` + (act.engine_recommendation || '');
                }
            }
        }
        finalCleaned.push(act);
    }

    return finalCleaned;
}

// ─── adaptDailySchedule ────────────────────────────────────────

/**
 * Re-evaluates today's schedule based on what actually happened yesterday,
 * current readiness, and ACWR. Called when the dashboard mounts.
 *
 * Only returns SWAP recommendations — never removes user-scheduled activities.
 * The user decides whether to accept a swap.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function adaptDailySchedule(
    input: DailyAdaptationInput,
): DailyAdaptationResult {
    const {
        todayActivities,
        yesterdayActivities,
        readinessState,
        acwr,
        sleepLastNight,
        fitnessLevel,
        phase,
        trainingIntensityCap,
    } = input;
    const daysOut = input.campConfig
        ? Math.max(0, daysBetween(input.today, input.campConfig.fightDate))
        : null;
    const readinessProfile = createFallbackReadinessProfile({
        readinessState,
        acwr,
        phase,
        daysOut,
        isOnActiveCut: trainingIntensityCap != null,
        trainingIntensityCap,
        hasHardSparringScheduled: todayActivities.some((activity) => activity.activity_type === 'sparring'),
        hasTechnicalSessionScheduled: todayActivities.some((activity) => activity.activity_type === 'boxing_practice'),
    });
    const constraintSet = deriveStimulusConstraintSet(readinessProfile, {
        phase,
        goalMode: phase.startsWith('camp-') || phase === 'fight-camp' ? 'fight_camp' : 'build_phase',
        daysOut,
        trainingIntensityCap,
        isSparringDay: todayActivities.some((activity) => activity.activity_type === 'sparring'),
        hasTechnicalSession: todayActivities.some((activity) => activity.activity_type === 'boxing_practice'),
    });

    const swaps: DailyAdaptationSwap[] = [];
    const adjustedActivities: ScheduledActivityRow[] = [...todayActivities] as ScheduledActivityRow[];

    // ACWR status
    const acwrThresholds = getAcwrPlanningThresholds(
        fitnessLevel,
        phase,
        trainingIntensityCap != null,
    );
    const acwrStatus: DailyAdaptationResult['acwrStatus'] =
        acwr >= acwrThresholds.redline ? 'redline' :
            acwr >= acwrThresholds.caution ? 'caution' :
                'safe';

    // ── Overarching coaching message ──
    let overarchingMessage = '';
    if (readinessState === 'Prime' && acwrStatus === 'safe' && sleepLastNight >= 4) {
        overarchingMessage = 'You are fully recovered and ready to perform. Push your intensity today.';
    } else if (readinessState === 'Depleted' || acwrStatus === 'redline') {
        overarchingMessage = 'Your body is under significant stress. Today is about damage control — protect your long-term capacity.';
    } else if (readinessState === 'Caution' || acwrStatus === 'caution') {
        overarchingMessage = 'Readiness is moderate. Complete your sessions but listen to your body and pull back on intensity if needed.';
    } else if (sleepLastNight < 3) {
        overarchingMessage = 'Poor sleep last night. Reduce intensity by 1-2 RPE across all sessions to protect recovery.';
    } else {
        overarchingMessage = 'Good day to train. Stay present and dial in your form.';
    }

    // ── Readiness message ──
    const readinessMessage =
        readinessState === 'Prime' ? 'Peak readiness. All systems go.' :
            readinessState === 'Caution' ? 'Moderate readiness. Adjust intensity as needed.' :
                'Low readiness. Protect recovery today.';

    // ── Check if yesterday had a skipped high-intensity session ──
    const skippedHigh = yesterdayActivities.filter(
        a => a.status === 'skipped' && a.expected_intensity >= 7
    );

    // If yesterday had a skipped high-intensity session AND today has something lighter,
    // suggest moving yesterday's session to today (only if load permits)
    if (skippedHigh.length > 0) {
        const todayLoad = todayActivities.reduce(
            (sum, a) => sum + (a.estimated_duration_min * a.expected_intensity), 0
        );
        if (todayLoad < 400 && readinessState !== 'Depleted') {
            overarchingMessage = `You missed ${skippedHigh.length} high-intensity session(s) yesterday. ` +
                `Today has capacity — consider making it up if you feel recovered.`;
        }
    }

    // ── Evaluate each of today's activities ──
    for (const activity of todayActivities) {
        const suggestion = suggestAlternative(
            activity,
            readinessState,
            trainingIntensityCap,
            constraintSet,
        );

        if (suggestion.shouldSwap) {
            swaps.push({
                originalActivityId: activity.id ?? null,
                originalType: activity.activity_type as ActivityType,
                newType: suggestion.alternative,
                newIntensity: trainingIntensityCap ?? (readinessState === 'Depleted' ? 3 : 5),
                reason: suggestion.message,
            });
        }
    }

    return {
        swaps,
        overarchingMessage,
        adjustedActivities,
        acwrStatus,
        readinessMessage,
    };
}


// ─── calculateWeeklyCompliance ─────────────────────────────────

/**
 * Compare planned vs. actual activities for the week.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function calculateWeeklyCompliance(
    planned: Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min'>[],
    actual: Pick<ScheduledActivityRow, 'activity_type' | 'status' | 'actual_rpe' | 'actual_duration_min' | 'expected_intensity' | 'estimated_duration_min'>[],
    streak: number,
): WeeklyComplianceReport {
    const count = (arr: typeof planned, type: string) =>
        arr.filter(a => a.activity_type === type || (type === 'boxing' && (a.activity_type === 'boxing_practice' || a.activity_type === 'sparring'))).length;

    const actualCompleted = actual.filter(a => a.status === 'completed');

    const buildStat = (type: string) => {
        const p = count(planned, type);
        const a = count(actualCompleted, type);
        return { planned: p, actual: a, pct: p > 0 ? Math.round((a / p) * 100) : a > 0 ? 100 : 0 };
    };

    const sc = buildStat('sc');
    const boxing = buildStat('boxing');
    const running = buildStat('running');
    const conditioning = buildStat('conditioning');
    const recovery = buildStat('active_recovery');

    const totalLoadPlanned = planned.reduce(
        (s, a) => s + getSessionLoad(a.estimated_duration_min, a.expected_intensity), 0,
    );
    const totalLoadActual = actualCompleted.reduce(
        (s, a) => s + getSessionLoad(a.actual_duration_min ?? a.estimated_duration_min, a.actual_rpe ?? a.expected_intensity), 0,
    );

    const totalPlanned = planned.length;
    const totalDone = actualCompleted.length;
    const overallPct = totalPlanned > 0
        ? Math.round((totalDone / totalPlanned) * 100)
        : totalDone > 0 ? 100 : 0;

    let message: string;
    if (overallPct >= 90) {
        message = 'Outstanding week. You hit nearly every session — consistency like this compounds into serious long-term adaptation.';
    } else if (overallPct >= 70) {
        message = 'Solid week. Most sessions completed. A few misses won\'t derail progress — consistency over perfection.';
    } else if (overallPct >= 50) {
        message = 'Moderate compliance. Life happens — try to prioritize the highest-impact sessions (S&C and sport-specific) when time is limited.';
    } else {
        message = 'Tough week. Low compliance can stall adaptation if repeated. Review your template — it may be too ambitious for your current schedule.';
    }

    return {
        sc, boxing, running, conditioning, recovery,
        totalLoadPlanned, totalLoadActual, overallPct, streak, message,
    };
}

// ─── getTrainingStreak ─────────────────────────────────────────

/**
 * Calculate consecutive days with at least one logged activity.
 *
 * @ANTI-WIRING:
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getTrainingStreak(
    activityDates: string[],
): number {
    if (activityDates.length === 0) return 0;

    // Deduplicate and sort descending
    const unique = [...new Set(activityDates)].sort((a, b) => b.localeCompare(a));

    // Today's date
    const today = todayLocalDate();

    // Streak must include today or yesterday to be "active"
    if (unique[0] !== today && unique[0] !== addDays(today, -1)) {
        return 0;
    }

    let streak = 1;
    for (let i = 0; i < unique.length - 1; i++) {
        const diff = daysBetween(unique[i], unique[i + 1]);
        if (diff === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// ─── Smart Week Plan Focus Rotations ────────────────────────────

type TimeRange = {
    start: number;
    end: number;
};

type GuidedPlacement = 'before' | 'after' | null;

const MIN_GUIDED_DURATION_MIN = 20;

function parseTimeToMinutes(time: string | null | undefined): number | null {
    if (!time) return null;
    const parts = time.split(':').map(Number);
    if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return null;
    return (parts[0] * 60) + parts[1];
}

function mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
    if (ranges.length === 0) return [];

    const sorted = [...ranges]
        .filter((range) => range.end > range.start)
        .sort((a, b) => a.start - b.start);

    const merged: TimeRange[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = merged[merged.length - 1];
        if (current.start <= previous.end) {
            previous.end = Math.max(previous.end, current.end);
            continue;
        }
        merged.push({ ...current });
    }

    return merged;
}

function subtractTimeRanges(windowRange: TimeRange, blockedRanges: TimeRange[]): TimeRange[] {
    let remaining: TimeRange[] = [{ ...windowRange }];

    for (const blocked of blockedRanges) {
        const next: TimeRange[] = [];
        for (const segment of remaining) {
            if (blocked.end <= segment.start || blocked.start >= segment.end) {
                next.push(segment);
                continue;
            }
            if (blocked.start > segment.start) {
                next.push({ start: segment.start, end: blocked.start });
            }
            if (blocked.end < segment.end) {
                next.push({ start: blocked.end, end: segment.end });
            }
        }
        remaining = next;
        if (remaining.length === 0) break;
    }

    return remaining.filter((segment) => segment.end > segment.start);
}

function buildWindowRanges(dayWindows: SmartWeekPlanInput['config']['availability_windows'], dayOfWeek: number): TimeRange[] {
    return dayWindows
        .filter((window) => window.dayOfWeek === dayOfWeek)
        .map((window) => {
            const start = parseTimeToMinutes(window.startTime);
            const end = parseTimeToMinutes(window.endTime);
            if (start == null || end == null) return null;
            return {
                start,
                end,
            };
        })
        .filter((range): range is TimeRange => range != null && range.end > range.start);
}

function buildBlockedRanges(activities: RecurringActivityRow[]): TimeRange[] {
    const blocked = activities
        .map((activity) => {
            const start = parseTimeToMinutes(activity.start_time);
            if (start == null || activity.estimated_duration_min <= 0) return null;
            return {
                start,
                end: start + activity.estimated_duration_min,
            };
        })
        .filter((range): range is TimeRange => range != null && range.end > range.start);

    return mergeTimeRanges(blocked);
}

export function resolveGuidedAvailability(input: {
    dayWindows: SmartWeekPlanInput['config']['availability_windows'];
    dayOfWeek: number;
    recurringAnchors: RecurringActivityRow[];
    primaryCombatAnchorStart: number | null;
    primaryCombatAnchorEnd: number | null;
}): { maxMinutes: number; placement: GuidedPlacement } {
    const windowRanges = buildWindowRanges(input.dayWindows, input.dayOfWeek);
    if (windowRanges.length === 0) {
        return { maxMinutes: 0, placement: null };
    }

    const blockedRanges = buildBlockedRanges(input.recurringAnchors);
    const freeSegments = windowRanges.flatMap((windowRange) => subtractTimeRanges(windowRange, blockedRanges));

    if (freeSegments.length === 0) {
        return { maxMinutes: 0, placement: null };
    }

    const rankedSegments = freeSegments
        .map((segment) => {
            let placement: GuidedPlacement = null;
            if (input.primaryCombatAnchorStart != null && input.primaryCombatAnchorEnd != null) {
                if (segment.end <= input.primaryCombatAnchorStart) {
                    placement = 'before';
                } else if (segment.start >= input.primaryCombatAnchorEnd) {
                    placement = 'after';
                }
            }

            const proximityRank = placement === 'before' || placement === 'after' ? 0 : 1;
            return {
                minutes: segment.end - segment.start,
                placement,
                proximityRank,
            };
        })
        .sort((a, b) => {
            if (a.proximityRank !== b.proximityRank) return a.proximityRank - b.proximityRank;
            return b.minutes - a.minutes;
        });

    return {
        maxMinutes: rankedSegments[0]?.minutes ?? 0,
        placement: rankedSegments[0]?.placement ?? null,
    };
}

// ─── generateSmartWeekPlan ──────────────────────────────────────

/**
 * Generates an intelligent weekly S&C plan based on available days,
 * time constraints, camp phase, readiness, and deload needs.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - config: WeeklyPlanConfigRow (from weekly_plan_config table)
 *   - readinessState: ReadinessState (from readiness engine)
 *   - phase: Phase (current training phase)
 *   - acwr: number (Acute:Chronic Workload Ratio)
 *   - fitnessLevel: FitnessLevel (from athlete_profiles)
 *   - exerciseLibrary: ExerciseLibraryRow[] (full library)
 *   - recentMuscleVolume: Record<MuscleGroup, number> (recent volume data)
 *   - campConfig: CampConfig | null (active camp)
 *   - activeCutPlan: WeightCutPlanRow | null (active weight cut)
 *   - weeksSinceLastDeload: number
 *   - gymProfile: GymProfileRow | null
 *   - weekStartDate: string (Monday ISO date)
 *
 * Returns: SmartWeekPlanResult
 *   - entries: WeeklyPlanEntryRow[] (the week's scheduled sessions)
 *   - isDeloadWeek: boolean
 *   - deloadReason: string | null
 *   - weeklyFocusSplit: Partial<Record<WorkoutFocus, number>>
 *   - message: string
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateSmartWeekPlan(input: SmartWeekPlanInput): SmartWeekPlanResult {
    const {
        config,
        readinessState,
        phase,
        acwr,
        fitnessLevel,
        performanceGoalType = 'conditioning',
        exerciseLibrary,
        exerciseHistory,
        recentExerciseIds,
        recentMuscleVolume,
        campConfig,
        activeCutPlan,
        gymProfile,
        weeksSinceLastDeload,
        weekStartDate,
        recurringActivities = [],
    } = input;

    // ── 1. Determine if this is a deload week ──
    const deloadCheck = shouldDeload({
        weeksSinceLastDeload,
        autoDeloadIntervalWeeks: config.auto_deload_interval_weeks,
        acwr,
        recentSessionRPEs: [], // caller should provide but empty is safe
        readinessState,
        consecutiveCautionDays: 0, // Not tracked at the weekly planning level, safely default to 0
    });

    // Camp taper forces deload regardless
    let isDeloadWeek = deloadCheck.shouldDeload;
    let deloadReason = deloadCheck.reason;

    if (campConfig) {
        const campPhase = determineCampPhase(campConfig, weekStartDate);
        if (campPhase === 'taper') {
            isDeloadWeek = true;
            deloadReason = 'Camp taper phase — forced deload to sharpen for fight.';
        }
    }

    // ── 2. Resolve camp context ──
    let campPhase: CampPhase | null = null;
    let campModifiers: ReturnType<typeof getCampTrainingModifiers> | null = null;
    if (campConfig) {
        campPhase = determineCampPhase(campConfig, weekStartDate);
        if (campPhase) {
            campModifiers = getCampTrainingModifiers(campPhase, fitnessLevel, campConfig.hasConcurrentCut);
        }
    }

    // ── 3. Determine guided-session capacity ──
    const availableDays = config.available_days; // 0=Sun..6=Sat
    const guidedCapacity = isDeloadWeek
        ? Math.min(availableDays.length, 3) // deload: max 3 sessions
        : availableDays.length;
    const blockContext = resolveTrainingBlockContext({
        performanceGoalType,
        campPhase,
        weeksSinceLastDeload,
        isDeloadWeek,
    });

    // Sort available days to place them chronologically starting from weekStartDate
    const weekStartDay = dateFromISO(weekStartDate).getDay();

    const sortedDays = [...availableDays].sort((a, b) => {
        let aOffset = a - weekStartDay;
        if (aOffset < 0) aOffset += 7;
        let bOffset = b - weekStartDay;
        if (bOffset < 0) bOffset += 7;
        return aOffset - bOffset;
    });

    const actualSparringDaysThisWeek = sortedDays.filter((dayOfWeek) => {
        let offset = dayOfWeek - weekStartDay;
        if (offset < 0) offset += 7;
        const entryDate = addDays(weekStartDate, offset);
        const recurringAnchors = resolveRecurringAnchorsForDay(recurringActivities, dayOfWeek, entryDate);
        return recurringAnchors.some((activity) => activity.activity_type === 'sparring');
    }).length;

    // ── 4. Build focus rotation or camp template ──
    const plannedBlueprints = buildGuidedSessionBlueprints({
        guidedCapacity,
        campPhase,
        performanceGoalType,
        blockContext,
        isDeloadWeek,
        sparringDayCount: actualSparringDaysThisWeek,
        campModifiers,
    });
    const remainingBlueprints = [...plannedBlueprints];

    // ── 5. Map days to entries ──
    const entries: WeeklyPlanEntryRow[] = [];
    const weeklyFocusSplit: Partial<Record<WorkoutFocus, number>> = {};
    const dailyPlacements: DailyTrainingPlacement[] = [];
    const carryForwardAdjustments: CarryForwardAdjustment[] = [];
    const rollingRecentExerciseIds = [...(recentExerciseIds ?? [])];
    const rollingRecentMuscleVolume = cloneRecentMuscleVolume(recentMuscleVolume);
    const rollingExerciseHistory = cloneExerciseHistory(exerciseHistory);
    let lastPlanningDate: string | null = null;

    for (let i = 0; i < sortedDays.length; i++) {

        const dayOfWeek = sortedDays[i];
        // Calculate offset from week start
        let offset = dayOfWeek - weekStartDay;
        if (offset < 0) offset += 7;
        const entryDate = addDays(weekStartDate, offset);
        decayPlanningMuscleVolume(rollingRecentMuscleVolume, getDaysBetweenPlanDates(lastPlanningDate, entryDate));
        lastPlanningDate = entryDate;
        const daysOut = activeCutPlan
            ? Math.max(0, daysBetween(entryDate, activeCutPlan.weigh_in_date))
            : campConfig
                ? Math.max(0, daysBetween(entryDate, campConfig.fightDate))
                : null;
        const boxingScalar = getBoxingIntensityScalar({
            isOnActiveCut: activeCutPlan != null,
            daysOut,
        });

        const recurringAnchors = resolveRecurringAnchorsForDay(recurringActivities, dayOfWeek, entryDate);
        const scaledRecurringAnchors = recurringAnchors.map((activity) =>
            isBoxingActivityType(activity.activity_type)
                ? {
                    ...activity,
                    expected_intensity: scaleBoxingIntensity(activity.expected_intensity, {
                        isOnActiveCut: activeCutPlan != null,
                        daysOut,
                    }),
                }
                : activity,
        );
        const hasSparringAnchor = scaledRecurringAnchors.some((activity) => activity.activity_type === 'sparring');
        const hasCombatAnchor = scaledRecurringAnchors.some((activity) =>
            activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice',
        );
        const primaryCombatAnchor = scaledRecurringAnchors
            .filter((activity) => activity.activity_type === 'sparring' || activity.activity_type === 'boxing_practice')
            .sort((a, b) => {
                const rank = (activityType: string) => activityType === 'sparring' ? 0 : 1;
                const rankDelta = rank(a.activity_type) - rank(b.activity_type);
                if (rankDelta !== 0) return rankDelta;
                return (b.expected_intensity ?? 0) - (a.expected_intensity ?? 0);
            })[0] ?? null;
        const hasHighAnchor = scaledRecurringAnchors.some((activity) => activity.expected_intensity >= 7);

        // Only treat as a sparring day if there is an actual sparring anchor on this day.
        // The camp-estimation fallback (i < sparringDaysThisWeek) was mis-marking non-sparring
        // S&C days as sparring days and collapsing their focus to sport_specific.
        const isSparringDay = hasSparringAnchor;
        const blueprint = pickBlueprintForDay(remainingBlueprints, {
            hasCombatAnchor,
            isSparringDay,
        });

        const pushCombatEntry = (slot: PlanSlot, note: string | null, dayOrder: number) => {
            if (!primaryCombatAnchor) return;
            entries.push({
                id: `${weekStartDate}-${dayOfWeek}-combat`,
                user_id: config.user_id,
                week_start_date: weekStartDate,
                day_of_week: dayOfWeek,
                date: entryDate,
                slot,
                day_order: dayOrder,
                session_type: primaryCombatAnchor.activity_type,
                focus: null,
                session_family: familyForRecurringActivity(primaryCombatAnchor),
                placement_source: 'locked',
                progression_intent: getProgressionIntent({
                    family: familyForRecurringActivity(primaryCombatAnchor),
                    focus: primaryCombatAnchor.activity_type === 'sparring' ? 'sport_specific' : 'recovery',
                    campPhase,
                    performanceGoalType,
                }),
                carry_forward_reason: null,
                estimated_duration_min: primaryCombatAnchor.estimated_duration_min,
                target_intensity: primaryCombatAnchor.expected_intensity,
                status: 'planned',
                rescheduled_to: null,
                workout_log_id: null,
                prescription_snapshot: null,
                engine_notes: note,
                is_deload: isDeloadWeek,
                created_at: new Date().toISOString(),
            });
            dailyPlacements.push({
                date: entryDate,
                day_of_week: dayOfWeek,
                slot,
                dayOrder,
                sessionFamily: familyForRecurringActivity(primaryCombatAnchor),
                sessionType: primaryCombatAnchor.activity_type,
                focus: null,
                durationMin: primaryCombatAnchor.estimated_duration_min,
                targetIntensity: primaryCombatAnchor.expected_intensity,
                source: 'locked',
                locked: true,
                progressionIntent: null,
                notes: note,
                sessionModules: null,
                doseCredits: [],
                realizedDoseBuckets: [],
                recurringActivityId: primaryCombatAnchor.id,
            });
        };

        if (!blueprint) {
            if (primaryCombatAnchor) {
                pushCombatEntry('single', 'Fixed combat session.', 1);
            }
            continue;
        }

        // Reserve sport_specific only for days with an actual sparring anchor.
        // Boxing practice days follow the normal periodised rotation so athletes
        // still get lower / upper_push / upper_pull / full_body sessions.
        let focus = isSparringDay
            ? 'sport_specific' as WorkoutFocus
            : blueprint.focus;
        let sessionModules = blueprint.sessionModules;

        // Determine intensity
        let targetIntensity: number;
        if (isDeloadWeek) {
            targetIntensity = 5;
        } else if (isSparringDay) {
            targetIntensity = 4;
        } else if (readinessState === 'Depleted') {
            targetIntensity = 5;
        } else if (readinessState === 'Caution') {
            targetIntensity = 6;
        } else {
            targetIntensity = 7;
        }
        if (isSparringDay) {
            targetIntensity = Math.min(targetIntensity, hasHighAnchor ? 5 : 6);
        }
        if (focus === 'conditioning' && performanceGoalType === 'conditioning' && readinessState === 'Prime' && !isDeloadWeek) {
            targetIntensity += 1;
        }
        if ((focus === 'lower' || focus === 'full_body') && performanceGoalType === 'strength' && readinessState === 'Prime' && !isDeloadWeek) {
            targetIntensity += 1;
        }
        if (blueprint.family === 'durability_core') {
            targetIntensity = Math.min(targetIntensity, 6);
        }
        targetIntensity += blockContext.intensityOffset;
        targetIntensity = Math.max(3, Math.min(9, targetIntensity));

        if (activeCutPlan) {
            const cutCap = getDailyCutIntensityCap(activeCutPlan, entryDate);
            if (cutCap != null && targetIntensity > cutCap) {
                targetIntensity = cutCap;
            }
        }

        const notes: string[] = [];
        if (boxingScalar < 1 && hasCombatAnchor) notes.push('Boxing taper active - combat intensity reduced 40%.');
        if (isDeloadWeek) notes.push('Deload week - reduced volume and intensity.');
        if (isSparringDay) notes.push('Sparring day - activation-only S&C.');
        if (hasCombatAnchor) {
            notes.push('Fixed combat anchor on the day - guided work is paired against the same training day without AM/PM slot locking.');
        }
        if (readinessState !== 'Prime') notes.push(`Readiness: ${readinessState}.`);

        notes.push(`Goal bias: ${performanceGoalType.replace(/_/g, ' ')}.`);
        notes.push(`Block: ${blockContext.phase}. ${blockContext.note}`);
        notes.push(`Weekly intent: ${blueprint.progressionIntent}`);

        const trainingIntensityCap = activeCutPlan
            ? getDailyCutIntensityCap(activeCutPlan, entryDate)
            : null;
        const readinessProfile = createFallbackReadinessProfile({
            readinessState,
            acwr,
            phase,
            daysOut,
            isOnActiveCut: activeCutPlan != null,
            trainingIntensityCap,
            hasHardSparringScheduled: hasSparringAnchor,
            hasTechnicalSessionScheduled: scaledRecurringAnchors.some((activity) => activity.activity_type === 'boxing_practice'),
        });
        const constraintSet = deriveStimulusConstraintSet(readinessProfile, {
            phase,
            goalMode: activeCutPlan != null || campConfig != null ? 'fight_camp' : 'build_phase',
            daysOut,
            isSparringDay,
            hasTechnicalSession: scaledRecurringAnchors.some((activity) => activity.activity_type === 'boxing_practice'),
            isDeloadWeek,
            trainingIntensityCap,
        });
        const performanceRisk = assessPerformanceRisk({
            readinessState,
            readinessProfile,
            constraintSet,
            acwr,
            isDeloadWeek,
            trainingIntensityCap,
            isSparringDay,
            campPhase,
            goalMode: activeCutPlan != null || campConfig != null ? 'fight_camp' : 'build_phase',
            daysOut,
            hasTechnicalSession: scaledRecurringAnchors.some((activity) => activity.activity_type === 'boxing_practice'),
        });
        const activeCutAllowsGuidedStack = !activeCutPlan || (
            readinessState === 'Prime'
            && acwr < 1.2
            && constraintSet.blockedStimuli.length === 0
        );

        if (hasCombatAnchor && activeCutPlan && !activeCutAllowsGuidedStack) {
            carryForwardAdjustments.push({
                family: blueprint.family,
                fromDate: entryDate,
                suggestedDate: null,
                reason: 'Active cut did not allow an additional engine-created stack on this day.',
                status: 'moved',
            });
            pushCombatEntry('single', 'Guided work skipped - active cut does not allow an additional engine-created stack unless readiness, ACWR, and stimulus constraints are fully green.', 1);
            continue;
        }

        if (hasCombatAnchor && performanceRisk.level === 'yellow') {
            sessionModules = stripSecondaryModulesForYellow(sessionModules, {
                hasCombatAnchor,
                performanceRisk,
            });
            focus = isSparringDay
                ? 'sport_specific' as WorkoutFocus
                : (sessionModules[0]?.focus ?? focus);
            const preservedBucket = sessionModules[0]?.bucket ?? 'conditioning';
            notes.push(
                preservedBucket === 'conditioning'
                    ? 'Combat anchor + yellow risk - conditioning was preserved through a lower-cost engine block instead of a recovery swap.'
                    : 'Combat anchor + yellow risk - the secondary module was stripped and the physical touch was preserved at low cost.',
            );
        } else if (hasCombatAnchor && (performanceRisk.level === 'orange' || performanceRisk.level === 'red')) {
            carryForwardAdjustments.push({
                family: blueprint.family,
                fromDate: entryDate,
                suggestedDate: null,
                reason: `Combat anchor plus ${performanceRisk.level} risk forced the guided session to defer.`,
                status: 'moved',
            });
            pushCombatEntry('single', `Guided work skipped - combat anchor plus ${performanceRisk.level} risk is being defused upstream.`, 1);
            continue;
        }

        let duration = resolveGuidedDuration({
            blueprint: {
                ...blueprint,
                sessionModules,
            },
            isDeloadWeek,
            isSparringDay,
            hasCombatAnchor,
            performanceRisk,
            blockContext,
        });

        targetIntensity = Math.min(targetIntensity, performanceRisk.intensityCap);
        if (hasCombatAnchor && performanceRisk.level === 'yellow') {
            targetIntensity = Math.min(targetIntensity, 4);
            duration = Math.min(duration, 40);
        }
        if (performanceRisk.level !== 'green') {
            notes.push(`Risk: ${performanceRisk.level}. ${performanceRisk.reasons.join('; ')}.`);
        }
        const hypotheticalSessionType = classifyGuidedSessionType({ focus });
        const dayLoadValidation: any = !isSparringDay && duration >= MIN_GUIDED_DURATION_MIN
            ? validateDayLoad([
                ...scaledRecurringAnchors.map((activity) => ({
                    activity_type: activity.activity_type,
                    expected_intensity: activity.expected_intensity,
                    estimated_duration_min: activity.estimated_duration_min,
                })),
                {
                    activity_type: hypotheticalSessionType,
                    expected_intensity: targetIntensity,
                    estimated_duration_min: duration,
                },
            ] as any)
            : null;

        if (duration < MIN_GUIDED_DURATION_MIN || (dayLoadValidation && !dayLoadValidation.safe)) {
            carryForwardAdjustments.push({
                family: blueprint.family,
                fromDate: entryDate,
                suggestedDate: null,
                reason: duration < MIN_GUIDED_DURATION_MIN
                    ? 'Resolved guided block fell below the minimum viable dose after constraints were applied.'
                    : `Combined day load would have been unsafe (${dayLoadValidation.message}).`,
                status: 'moved',
            });
            if (primaryCombatAnchor) {
                const reason = duration < MIN_GUIDED_DURATION_MIN
                    ? 'Guided work skipped - resolved block fell below the minimum viable dose after constraints were applied.'
                    : `Guided work skipped - combined day load would be unsafe (${dayLoadValidation.message}).`;
                pushCombatEntry('single', reason, 1);
            }
            continue;
        }

        const prescriptionSnapshot = exerciseLibrary.length > 0
            ? generateWorkoutV2({
                readinessState,
                readinessProfile,
                constraintSet,
                phase,
                acwr,
                exerciseLibrary,
                recentExerciseIds: rollingRecentExerciseIds,
                recentMuscleVolume: rollingRecentMuscleVolume,
                focus,
                trainingIntensityCap,
                trainingDate: entryDate,
                fitnessLevel,
                availableMinutes: duration,
                gymEquipment: gymProfile?.equipment ?? [],
                exerciseHistory: rollingExerciseHistory,
                isDeloadWeek,
                weeklyPlanFocus: focus,
                isSparringDay,
                performanceGoalType,
                performanceRisk,
                blockContext,
                sessionFamily: blueprint.family,
                sessionModules,
            })
            : null;
        const sessionType = classifyGuidedSessionType({
            focus,
            prescription: prescriptionSnapshot,
        });
        const guidedSlot: PlanSlot = primaryCombatAnchor ? 'am' : 'single';
        const realizedDoseBuckets = Array.from(new Set(
            (prescriptionSnapshot?.doseCredits ?? [])
                .filter((credit) => credit.credit > 0)
                .map((credit) => credit.bucket),
        ));

        entries.push({
            id: `${weekStartDate}-${dayOfWeek}-guided-${blueprint.family}-${i}`,
            user_id: config.user_id,
            week_start_date: weekStartDate,
            day_of_week: dayOfWeek,
            date: entryDate,
            slot: guidedSlot,
            day_order: 0,
            session_type: sessionType,
            focus,
            session_family: blueprint.family,
            placement_source: 'generated',
            progression_intent: blueprint.progressionIntent,
            carry_forward_reason: null,
            estimated_duration_min: duration,
            target_intensity: targetIntensity,
            status: 'planned',
            rescheduled_to: null,
            workout_log_id: null,
            prescription_snapshot: prescriptionSnapshot,
            engine_notes: notes.join(' ') || null,
            is_deload: isDeloadWeek,
            created_at: new Date().toISOString(),
        });

        dailyPlacements.push({
            date: entryDate,
            day_of_week: dayOfWeek,
            slot: guidedSlot,
            dayOrder: 0,
            sessionFamily: blueprint.family,
            sessionType,
            focus,
            durationMin: duration,
            targetIntensity,
            source: 'generated',
            locked: false,
            progressionIntent: blueprint.progressionIntent,
            notes: notes.join(' ') || null,
            sessionModules,
            doseCredits: prescriptionSnapshot?.doseCredits ?? [],
            realizedDoseBuckets,
            recurringActivityId: null,
        });

        weeklyFocusSplit[focus] = (weeklyFocusSplit[focus] ?? 0) + 1;
        consumeBlueprint(remainingBlueprints, blueprint);
        updateRollingPlanContextFromPrescription({
            prescription: prescriptionSnapshot,
            trainingDate: entryDate,
            recentExerciseIds: rollingRecentExerciseIds,
            recentMuscleVolume: rollingRecentMuscleVolume,
            exerciseHistory: rollingExerciseHistory,
        });

        if (primaryCombatAnchor) {
            pushCombatEntry('pm', 'Fixed combat session.', 1);
            continue;
        }

    }

    // ── 6. Build summary message ──
    for (const deferredBlueprint of remainingBlueprints) {
        carryForwardAdjustments.push({
            family: deferredBlueprint.family,
            fromDate: null,
            suggestedDate: null,
            reason: 'No safe placement remained in the current week after constraints were applied.',
            status: 'deferred',
        });
    }

    const weeklyMixPlan: WeeklyTrainingMixPlan = {
        weekStartDate,
        weekIntent: buildWeekIntent({
            campPhase,
            performanceGoalType,
            isDeloadWeek,
            activeCutPlan,
        }),
        sessionTargets: buildSessionTargets({
            weekStartDate,
            blueprints: plannedBlueprints,
            placements: dailyPlacements,
        }),
        dailyPlacements,
        carryForwardAdjustments,
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const guidedEntries = entries.filter((entry) => entry.focus != null);
    const scheduledDayNames = guidedEntries
        .map((entry) => dayNames[entry.day_of_week])
        .join(', ');

    let message: string;
    if (isDeloadWeek) {
        message = `Recovery week: ${guidedEntries.length} guided session${guidedEntries.length === 1 ? '' : 's'} (${scheduledDayNames}). ${deloadReason}`;
    } else if (campPhase) {
        message = `Camp ${campPhase} phase: ${guidedEntries.length} guided session${guidedEntries.length === 1 ? '' : 's'} (${scheduledDayNames}).`;
        if (actualSparringDaysThisWeek > 0) {
            message += ` ${actualSparringDaysThisWeek} sparring day(s) with activation-only S&C.`;
        }
    } else {
        message = `${guidedEntries.length}-day guided split (${scheduledDayNames}).`;
    }

    for (const entry of entries) {
        if (entry.slot !== 'pm' || !isBoxingActivityType(entry.session_type)) continue;
        const entryDaysOut = activeCutPlan
            ? Math.max(0, daysBetween(entry.date, activeCutPlan.weigh_in_date))
            : null;
        const taperActive = getBoxingIntensityScalar({
            isOnActiveCut: activeCutPlan != null,
            daysOut: entryDaysOut,
        }) < 1;

        if (taperActive) {
            entry.engine_notes = 'Boxing taper active - PM session intensity reduced 40%.';
        } else if (isDeloadWeek) {
            entry.engine_notes = 'Deload - light PM session.';
        } else if (entry.engine_notes == null) {
            entry.engine_notes = 'PM session.';
        }
    }

    return {
        entries,
        isDeloadWeek,
        deloadReason,
        weeklyFocusSplit,
        weeklyMixPlan,
        message,
    };
}

// ─── handleMissedDay ────────────────────────────────────────────

/**
 * When a planned training day is missed, redistributes the top-priority
 * exercises from that day to remaining days in the week, respecting
 * recovery windows and time constraints.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - missedEntry: WeeklyPlanEntryRow (the day that was missed)
 *   - remainingEntries: WeeklyPlanEntryRow[] (days still available this week)
 *   - readinessState: ReadinessState
 *   - acwr: number
 *
 * Returns: MissedDayRescheduleResult
 *   - updatedEntries: WeeklyPlanEntryRow[] (modified remaining entries)
 *   - redistributedExercises: PrescribedExercise[] (exercises that were redistributed)
 *   - message: string
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function handleMissedDay(input: MissedDayRescheduleInput): MissedDayRescheduleResult {
    const { missedEntry, remainingEntries, readinessState, acwr } = input;

    // If no prescription snapshot, nothing to redistribute
    if (!missedEntry.prescription_snapshot || !missedEntry.prescription_snapshot.exercises) {
        return {
            updatedEntries: remainingEntries,
            redistributedExercises: [],
            message: 'No exercises to redistribute — missed day had no prescription.',
        };
    }

    // Sort exercises by score (highest priority first), take top 5
    const missedExercises = [...missedEntry.prescription_snapshot.exercises]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    if (missedExercises.length === 0) {
        return {
            updatedEntries: remainingEntries,
            redistributedExercises: [],
            message: 'No exercises to redistribute.',
        };
    }

    // Find candidate days: still planned, not today, with capacity
    const candidates = remainingEntries
        .filter(e =>
            e.status === 'planned' &&
            e.date > missedEntry.date &&
            !e.is_deload,
        )
        .sort((a, b) => {
            // Prefer days with lower existing load (estimated by duration * intensity)
            const loadA = a.estimated_duration_min * (a.target_intensity ?? 5);
            const loadB = b.estimated_duration_min * (b.target_intensity ?? 5);
            return loadA - loadB;
        });

    if (candidates.length === 0) {
        return {
            updatedEntries: remainingEntries,
            redistributedExercises: [],
            message: 'No remaining days available to reschedule missed exercises.',
        };
    }

    // Check if readiness/ACWR allows redistribution
    if (readinessState === 'Depleted' || acwr > ACWR_DANGER) {
        return {
            updatedEntries: remainingEntries,
            redistributedExercises: [],
            message: 'Readiness too low or ACWR too high to redistribute missed exercises. Focus on recovery.',
        };
    }

    const updatedEntries = remainingEntries.map(e => ({ ...e }));
    const redistributed: PrescribedExercise[] = [];

    const deferredExercises: PrescribedExercise[] = [];

    // Distribute exercises across the lightest available safe days
    for (let i = 0; i < missedExercises.length; i++) {
        const exercise = missedExercises[i];
        let placed = false;

        for (const targetEntry of candidates) {
            const simulatedEntries = updatedEntries.map(e => ({ ...e }));
            const simulatedTarget = simulatedEntries.find(e => e.id === targetEntry.id);
            if (!simulatedTarget) continue;

            simulatedTarget.estimated_duration_min += 10;
            const sameDayEntries = simulatedEntries
                .filter(e => e.date === simulatedTarget.date && e.status !== 'skipped')
                .map(e => ({
                    activity_type: e.session_type as any,
                    expected_intensity: e.target_intensity ?? 5,
                    estimated_duration_min: e.estimated_duration_min,
                }));
            const validation = validateDayLoad(sameDayEntries as any);
            if (!validation.safe) {
                continue;
            }

            const entryToUpdate = updatedEntries.find(e => e.id === targetEntry.id);
            if (!entryToUpdate) continue;

            entryToUpdate.estimated_duration_min += 10;
            entryToUpdate.engine_notes = [
                entryToUpdate.engine_notes ?? '',
                `Added ${exercise.exercise.name} from missed ${missedEntry.focus ?? 'workout'} day.`,
            ].filter(Boolean).join(' ');

            if (entryToUpdate.prescription_snapshot) {
                entryToUpdate.prescription_snapshot = {
                    ...entryToUpdate.prescription_snapshot,
                    exercises: [
                        ...entryToUpdate.prescription_snapshot.exercises,
                        { ...exercise, targetSets: Math.max(1, exercise.targetSets - 1) },
                    ],
                };
            }

            redistributed.push(exercise);
            placed = true;
            break;
        }

        if (!placed) {
            deferredExercises.push(exercise);
        }
    }

    const exerciseNames = redistributed.map(e => e.exercise.name).join(', ');
    const deferredNames = deferredExercises.map(e => e.exercise.name).join(', ');
    const message = redistributed.length > 0 && deferredExercises.length === 0
        ? `Redistributed ${redistributed.length} exercise(s) (${exerciseNames}) from missed ${missedEntry.focus ?? 'workout'} day to remaining sessions.`
        : redistributed.length > 0
            ? `Redistributed ${redistributed.length} exercise(s) (${exerciseNames}). ${deferredExercises.length} exercise(s) (${deferredNames}) were deferred because adding them would violate recipient-day load safety; reschedule them next week instead of forcing them in.`
            : 'Could not safely redistribute the missed exercises without violating recipient-day load limits. Reschedule them next week instead of forcing them into this microcycle.';

    return {
        updatedEntries,
        redistributedExercises: redistributed,
        message,
    };
}

export function generateBlockPlan(input: GenerateBlockPlanInput): BlockPlanResult {
    const weeks = Array.from({ length: Math.max(0, input.weeks) }, (_, index) => {
        const weekStartDate = addDays(input.startDate, index * 7);
        const weekPlan = generateSmartWeekPlan({
            ...input,
            weekStartDate,
        });

        return {
            weekStartDate,
            isDeloadWeek: weekPlan.isDeloadWeek,
            deloadReason: weekPlan.deloadReason,
            weeklyMixPlan: weekPlan.weeklyMixPlan,
        };
    });

    return { weeks };
}





















