/**
 * calculateCamp.ts
 *
 * Fight camp periodization engine.
 * Generates camp configuration, determines current phase, and returns
 * training modifiers that feed into the schedule engine.
 *
 * Functions:
 *   1. generateCampPlan        — create a full periodized camp from fight date and start date
 *   2. determineCampPhase      — resolve which CampPhase a given date falls in
 *   3. getCampTrainingModifiers — training modifiers for a given camp phase
 *   4. getCampWeekProfile      — full profile for a given week in camp (focus, volume, intensity)
 *   5. toCampEnginePhase       — maps CampPhase to engine Phase type for downstream use
 *
 * @ANTI-WIRING:
 * All functions are pure and synchronous. No database queries. No LLM generation.
 */

import type {
    CampConfig,
    Phase,
    ReadinessState,
    WeightsInput,
    WeightsResult,
    TrainingSessionRow,
    FitnessLevel,
    RoadWorkType,
    ConditioningType,
    WorkoutFocus,
    SparringDayGuidance,
    CampSCModifier,
    ExerciseLibraryRow,
    PrescribedExercise,
} from './types.ts';
import { formatLocalDate } from '../utils/date.ts';
import { calculatePhaseAllocation } from './phases/calculatePhaseAllocation.ts';

// ─── Phase Split Ratios ────────────────────────────────────────

/**
 * How camp weeks are distributed across phases.
 * Based on established periodization science for combat sports.
 * (Source: Tudor Bompa's "Periodization" adapted for MMA/boxing)
 *
 * base: GPP — general physical preparedness, high volume, moderate intensity
 * build: SPP — specific physical preparedness, volume peaks then drops, intensity rises
 * peak: Competition prep — low volume, high intensity, sport-specific
 * taper: Pre-fight — cut load significantly, maintain feel and speed
 */
const PHASE_VOLUME_MULTIPLIERS: Record<CampPhase, number> = {
    base: 1.15,  // high volume base
    build: 1.10,  // slightly reduce volume as intensity rises
    peak: 0.85,  // significant volume cut
    taper: 0.55,  // drastic volume cut — sharpen, don't grind
};

/**
 * Max RPE for each camp phase (applied across all activity types).
 */
const PHASE_INTENSITY_CAPS: Record<CampPhase, number> = {
    base: 7,    // build base without frying the system
    build: 9,    // high intensity to match fight demands
    peak: 9,    // hold intensity, cut volume
    taper: 6,    // back off, stay sharp
};

/**
 * Mandatory sparring days per week per phase.
 */
const PHASE_SPARRING_DAYS: Record<CampPhase, number> = {
    base: 1,    // light sparring to get rounds
    build: 2,    // heavier, more technical sparring
    peak: 3,    // peak sparring frequency
    taper: 1,    // one light spar max to stay sharp
};

/**
 * Minimum mandatory rest days per week per phase.
 */
const PHASE_REST_DAYS: Record<CampPhase, number> = {
    base: 1,
    build: 1,
    peak: 1,
    taper: 2,
};

// ─── Helpers ───────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
}

function daysBetween(startStr: string, endStr: string): number {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    return Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
}

function weeksBetween(startStr: string, endStr: string): number {
    return Math.round(daysBetween(startStr, endStr) / 7);
}

// ─── generateCampPlan ─────────────────────────────────────────

/**
 * Generates a periodized fight camp config from start date and fight date.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - input: CampPlanInput
 *     - fightDate: string (from fight setup screen)
 *     - campStartDate: string (from fight setup screen)
 *     - fitnessLevel: FitnessLevel (from fitness_profiles)
 *     - hasConcurrentCut: boolean (from weight_cut_plans)
 *     - userId: string
 *
 * Returns: CampConfig
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function generateCampPlan(input: CampPlanInput): CampConfig {
    const { fightDate, campStartDate, hasConcurrentCut, userId } = input;

    const totalDays = daysBetween(campStartDate, fightDate);
    const totalWeeks = Math.max(4, Math.round(totalDays / 7)); // minimum 4-week camp

    const allocation = calculatePhaseAllocation(totalDays);
    const baseDays = allocation.gpp;
    const buildDays = allocation.spp;
    const peakDays = allocation.peak;
    const taperDays = allocation.taper;

    const baseStart = campStartDate;
    const baseEnd = addDays(baseStart, Math.max(0, baseDays - 1));

    const buildStart = addDays(baseStart, baseDays);
    const buildEnd = addDays(buildStart, Math.max(0, buildDays - 1));

    const peakStart = addDays(buildStart, buildDays);
    const peakEnd = addDays(peakStart, Math.max(0, peakDays - 1));

    const taperStart = addDays(peakStart, peakDays);
    const taperEnd = addDays(taperStart, Math.max(0, taperDays - 1));

    return {
        id: `camp-${userId}-${fightDate}`,
        user_id: userId,
        fightDate,
        campStartDate,
        totalWeeks,
        hasConcurrentCut,
        basePhaseDates: { start: baseStart, end: baseEnd },
        buildPhaseDates: { start: buildStart, end: buildEnd },
        peakPhaseDates: { start: peakStart, end: peakEnd },
        taperPhaseDates: { start: taperStart, end: taperEnd },
        status: 'active',
    };
}

// ─── determineCampPhase ───────────────────────────────────────

/**
 * Returns the CampPhase for a given date within a camp.
 * Returns null if the date is outside the camp window.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function determineCampPhase(
    config: CampConfig,
    dateStr: string,
): CampPhase | null {
    if (dateStr < config.campStartDate || dateStr > config.fightDate) {
        return null;
    }
    if (dateStr <= config.basePhaseDates.end) return 'base';
    if (dateStr <= config.buildPhaseDates.end) return 'build';
    if (dateStr <= config.peakPhaseDates.end) return 'peak';
    return 'taper';
}

// ─── getCampTrainingModifiers ─────────────────────────────────

/**
 * Returns training load modifiers for a given camp phase.
 * These are used by the schedule engine to scale session targets.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function getCampTrainingModifiers(
    campPhase: CampPhase,
    fitnessLevel: FitnessLevel,
    hasConcurrentCut: boolean,
): CampTrainingModifiers {
    // Base sessions per week by fitness level
    const baseScByLevel: Record<FitnessLevel, number> = {
        beginner: 2, intermediate: 2, advanced: 3, elite: 3,
    };
    const baseRunByLevel: Record<FitnessLevel, number> = {
        beginner: 2, intermediate: 3, advanced: 4, elite: 5,
    };
    const baseCondByLevel: Record<FitnessLevel, number> = {
        beginner: 1, intermediate: 2, advanced: 2, elite: 3,
    };

    const volMult = PHASE_VOLUME_MULTIPLIERS[campPhase];

    // Cut reduces S&C and conditioning sessions to protect recovery
    const cutReduction = hasConcurrentCut ? 0.8 : 1.0;

    return {
        volumeMultiplier: volMult,
        intensityCap: PHASE_INTENSITY_CAPS[campPhase],
        mandatoryRestDaysPerWeek: PHASE_REST_DAYS[campPhase],
        sparringDaysPerWeek: PHASE_SPARRING_DAYS[campPhase],
        roadWorkSessionsPerWeek: Math.round(baseRunByLevel[fitnessLevel] * volMult),
        conditioningSessionsPerWeek: Math.round(baseCondByLevel[fitnessLevel] * volMult * cutReduction),
        scSessionsPerWeek: Math.round(baseScByLevel[fitnessLevel] * volMult * cutReduction),
    };
}

// ─── getCampWeekProfile ───────────────────────────────────────

/**
 * Returns a full week profile for a given week in camp.
 * Includes focus types for road work, conditioning, and S&C.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function getCampWeekProfile(
    config: CampConfig,
    weekStartDate: string,
    fitnessLevel: FitnessLevel,
): CampWeekProfile | null {
    const campPhase = determineCampPhase(config, weekStartDate);
    if (campPhase === null) return null;

    const weekNumber = weeksBetween(config.campStartDate, weekStartDate) + 1;

    const roadWorkFocusByPhase: Record<CampPhase, RoadWorkType> = {
        base: 'long_slow_distance',
        build: 'tempo',
        peak: 'intervals',
        taper: 'easy_run',
    };

    const conditioningFocusByPhase: Record<CampPhase, ConditioningType> = {
        base: 'circuit',
        build: 'heavy_bag_rounds',
        peak: 'sport_specific_drill',
        taper: 'agility_drills',
    };

    const scFocusByPhase: Record<CampPhase, WorkoutFocus> = {
        base: 'upper_push',   // general strength
        build: 'lower',       // power development
        peak: 'full_body',    // maintain everything
        taper: 'recovery',    // mobilize and recover
    };

    const modifiers = getCampTrainingModifiers(campPhase, fitnessLevel, config.hasConcurrentCut);

    return {
        weekNumber,
        campPhase,
        volumeMultiplier: modifiers.volumeMultiplier,
        intensityCap: modifiers.intensityCap,
        mandatorySparringDays: modifiers.sparringDaysPerWeek,
        mandatoryRestDays: modifiers.mandatoryRestDaysPerWeek,
        roadWorkFocus: roadWorkFocusByPhase[campPhase],
        conditioningFocus: conditioningFocusByPhase[campPhase],
        scFocus: scFocusByPhase[campPhase],
    };
}

// ─── toCampEnginePhase ────────────────────────────────────────

/**
 * Maps a CampPhase to the corresponding engine Phase type.
 * Used to route prescriptions through the existing engine functions.
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function toCampEnginePhase(campPhase: CampPhase): Phase {
    const map: Record<CampPhase, Phase> = {
        base: 'camp-base',
        build: 'camp-build',
        peak: 'camp-peak',
        taper: 'camp-taper',
    };
    return map[campPhase];
}

// ─── getAutoTaperMultiplier ──────────────────────────────────

/**
 * Returns a volume multiplier for S&C based on the number of sparring
 * days this week. More sparring = less S&C to protect CNS.
 *
 * 1 spar = 1.0x (no reduction)
 * 2 spar = 0.825x
 * 3 spar = 0.65x
 * 4+ spar = 0.5x
 *
 * @ANTI-WIRING: Pure synchronous function.
 */
export function getAutoTaperMultiplier(sparringDaysPerWeek: number): number {
    if (sparringDaysPerWeek <= 1) return 1.0;
    return Math.max(0.5, 1.0 - (sparringDaysPerWeek - 1) * 0.175);
}

// ─── getCampSCModifier ──────────────────────────────────────────

/**
 * Returns S&C-specific modifiers for the current camp phase,
 * incorporating sparring frequency for auto-taper.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - campPhase: CampPhase
 *   - fitnessLevel: FitnessLevel
 *   - sparringDaysThisWeek: number
 *
 * Returns: CampSCModifier
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getCampSCModifier(
    campPhase: CampPhase,
    sparringDaysThisWeek: number,
): CampSCModifier {
    const taperMult = getAutoTaperMultiplier(sparringDaysThisWeek);
    const phaseVolume = PHASE_VOLUME_MULTIPLIERS[campPhase];
    const scVolumeMultiplier = phaseVolume * taperMult;

    // Heavy lifts only in base/build if sparring is low
    const allowHeavyLifts = (campPhase === 'base' || campPhase === 'build')
        && sparringDaysThisWeek <= 2;

    // CNS budget decreases as sparring increases and camp progresses
    const baseCNS: Record<CampPhase, number> = {
        base: 50,
        build: 40,
        peak: 30,
        taper: 20,
    };
    const maxCNSBudget = Math.round(baseCNS[campPhase] * taperMult);

    // Recommended S&C focus by phase
    const focusByPhase: Record<CampPhase, WorkoutFocus> = {
        base: 'full_body',
        build: 'upper_push',
        peak: 'sport_specific',
        taper: 'recovery',
    };

    return {
        sparringDaysThisWeek,
        scVolumeMultiplier,
        allowHeavyLifts,
        maxCNSBudget,
        recommendedFocus: focusByPhase[campPhase],
    };
}

// ─── getSparringDayGuidance ──────────────────────────────────────

/**
 * Returns pre-activation and post-recovery exercise guidance for
 * sparring days. On sparring days, S&C is restricted to activation
 * (pre) and recovery (post) work only.
 *
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - campPhase: CampPhase
 *   - fitnessLevel: FitnessLevel
 *   - library: ExerciseLibraryRow[]
 *
 * Returns: SparringDayGuidance
 *   - preActivation: PrescribedExercise[] (10-15 min mobility + bands)
 *   - postRecovery: PrescribedExercise[] (foam rolling, stretching)
 *   - scRestriction: 'activation_only'
 *   - message: string
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function getSparringDayGuidance(
    campPhase: CampPhase,
    library: ExerciseLibraryRow[],
): SparringDayGuidance {
    // Find activation exercises: mobility + band work
    const mobilityExercises = library.filter(
        ex => ex.type === 'mobility' || ex.type === 'active_recovery',
    );

    // Find band/bodyweight exercises for activation
    const activationCandidates = library.filter(
        ex => (ex.equipment === 'band' || ex.equipment === 'bodyweight')
            && ex.cns_load <= 3
            && ex.type !== 'heavy_lift'
            && ex.type !== 'power',
    );

    // Build pre-activation routine (3-4 exercises, ~10-15 min)
    const preActivation: PrescribedExercise[] = [];

    // Add 1-2 mobility exercises
    const mobilityPicks = mobilityExercises.slice(0, 2);
    for (const ex of mobilityPicks) {
        preActivation.push({
            exercise: ex,
            targetSets: 2,
            targetReps: 10,
            targetRPE: 3,
            supersetGroup: null,
            score: 80,
        });
    }

    // Add 1-2 activation exercises (band work, bodyweight)
    const activationPicks = activationCandidates
        .filter(ex => !mobilityPicks.some(m => m.id === ex.id))
        .slice(0, 2);
    for (const ex of activationPicks) {
        preActivation.push({
            exercise: ex,
            targetSets: 2,
            targetReps: 8,
            targetRPE: 4,
            supersetGroup: null,
            score: 70,
        });
    }

    // Build post-recovery routine (2-3 exercises, ~10 min)
    const postRecovery: PrescribedExercise[] = [];
    const recoveryPicks = mobilityExercises
        .filter(ex => !mobilityPicks.some(m => m.id === ex.id))
        .slice(0, 3);
    for (const ex of recoveryPicks) {
        postRecovery.push({
            exercise: ex,
            targetSets: 1,
            targetReps: 12,
            targetRPE: 2,
            supersetGroup: null,
            score: 60,
        });
    }

    // If we didn't find enough exercises, use generic guidance
    if (preActivation.length === 0 && postRecovery.length === 0) {
        return {
            preActivation: [],
            postRecovery: [],
            scRestriction: 'activation_only',
            message: `Sparring day (${campPhase} phase). No heavy S&C — perform 10 min of light mobility and band activation before sparring. Post-sparring: 10 min foam rolling and static stretching.`,
        };
    }

    const phaseMessages: Record<CampPhase, string> = {
        base: 'Base phase sparring day. Light activation to prime movement patterns. Save your energy for rounds.',
        build: 'Build phase sparring day. Activation only — intensity comes from sparring, not S&C.',
        peak: 'Peak phase sparring day. Minimal activation to stay sharp. Full recovery between sessions.',
        taper: 'Taper phase sparring day. Light mobility only. Preserve every ounce of energy for fight prep.',
    };

    return {
        preActivation,
        postRecovery,
        scRestriction: 'activation_only',
        message: phaseMessages[campPhase],
    };
}
