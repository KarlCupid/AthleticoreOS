import type {
    ExerciseHistoryEntry,
    ExerciseLibraryRow,
    ExerciseRole,
    ExerciseSetPrescription,
    FitnessLevel,
    GenerateWorkoutInputV2,
    LoadingStrategy,
    MuscleGroup,
    PerformanceGoalType,
    PerformanceRiskState,
    PrescribedExerciseV2,
    ProgressionAnchor,
    ReadinessState,
    SectionExercisePrescription,
    TrainingBlockContext,
    WorkoutFocus,
    WorkoutSectionTemplate,
    WorkoutSessionSection,
} from './types/training.ts';
import { suggestOverload, selectProgressionModel } from './calculateOverload.ts';
import { generateWarmupSets } from './calculateWarmup.ts';
import { findSubstituteExercise, getRestTimerDefaults } from './adaptiveWorkout.ts';

type ScoredExercise = {
    exercise: ExerciseLibraryRow;
    score: number;
    recoveryCost?: number;
};

type SectionBlueprint = {
    template: WorkoutSectionTemplate;
    title: string;
    intent: string;
    restRule: string;
    densityRule: string | null;
    role: ExerciseRole;
    loadingStrategy: LoadingStrategy;
    maxExercises: number;
    required: boolean;
};

export interface BuildSectionedWorkoutInput {
    focus: WorkoutFocus;
    scoredExercises: ScoredExercise[];
    usableExerciseLibrary: ExerciseLibraryRow[];
    readinessState: ReadinessState;
    rpeCap: number;
    performanceRisk: PerformanceRiskState;
    performanceGoalType?: PerformanceGoalType;
    blockContext: TrainingBlockContext | null;
    availableMinutes?: number;
    fitnessLevel: FitnessLevel;
    exerciseHistory?: Map<string, ExerciseHistoryEntry[]>;
    progressionModel?: GenerateWorkoutInputV2['progressionModel'];
    isDeloadWeek: boolean;
    targetExerciseCount: number;
    recoveryBudget?: number;
    trainingDate?: string;
}

export interface BuildSectionedWorkoutResult {
    sections: WorkoutSessionSection[];
    exercises: SectionExercisePrescription[];
    usedCNS: number;
    estimatedDuration: number;
    sessionGoal: string;
}

const SESSION_ARCHETYPES: Record<WorkoutFocus, SectionBlueprint[]> = {
    lower: [
        { template: 'activation', title: 'Activation', intent: 'Prep ankles, hips, and trunk before force work.', restRule: 'Move with control and keep rest short.', densityRule: '2 smooth rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'power', title: 'Power', intent: 'Express lower-body speed before fatigue accumulates.', restRule: 'Rest 75-120s between crisp efforts.', densityRule: null, role: 'explosive', loadingStrategy: 'straight_sets', maxExercises: 1, required: true },
        { template: 'main_strength', title: 'Primary Strength', intent: 'Drive the main squat or hinge anchor with autoregulated loading.', restRule: 'Rest 2-3 min between top and backoff work.', densityRule: null, role: 'anchor', loadingStrategy: 'top_set_backoff', maxExercises: 2, required: true },
        { template: 'secondary_strength', title: 'Secondary Strength', intent: 'Build unilateral force or posterior chain support without stealing from the anchor.', restRule: 'Rest 90-120s between sets.', densityRule: null, role: 'secondary', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'accessory', title: 'Accessory', intent: 'Fill hamstring, glute, or single-leg support gaps without competing with the main lifts.', restRule: '45-75s between paired movements.', densityRule: 'Pair complementary movements', role: 'accessory', loadingStrategy: 'straight_sets', maxExercises: 2, required: false },
        { template: 'durability', title: 'Durability', intent: 'Reinforce trunk, neck, and positional resilience.', restRule: '45-60s between movements.', densityRule: 'Move as a controlled quality circuit', role: 'durability', loadingStrategy: 'straight_sets', maxExercises: 3, required: true },
        { template: 'finisher', title: 'Finisher', intent: 'Touch repeatability only if the day still has room for it.', restRule: 'Keep work crisp and stop before form fades.', densityRule: 'Short alactic or glycolytic burst', role: 'finisher', loadingStrategy: 'intervals', maxExercises: 1, required: false },
        { template: 'cooldown', title: 'Cooldown', intent: 'Downshift breathing and restore range before leaving the session.', restRule: 'Continuous easy flow.', densityRule: '1-2 easy rounds', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    upper_push: [
        { template: 'activation', title: 'Activation', intent: 'Prep scapular control and trunk position for pressing.', restRule: 'Move continuously with short breaths between drills.', densityRule: '2 easy rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'power', title: 'Power', intent: 'Prime upper-body explosiveness with low-fatigue throws or plyos.', restRule: 'Rest 75-120s between efforts.', densityRule: null, role: 'explosive', loadingStrategy: 'straight_sets', maxExercises: 1, required: true },
        { template: 'main_strength', title: 'Primary Strength', intent: 'Attack the press anchor with top-set plus backoff work.', restRule: 'Rest 2-3 min between working sets.', densityRule: null, role: 'anchor', loadingStrategy: 'top_set_backoff', maxExercises: 2, required: true },
        { template: 'secondary_strength', title: 'Secondary Strength', intent: 'Support pressing strength with a secondary press or triceps-biased pattern.', restRule: 'Rest 75-120s between sets.', densityRule: null, role: 'secondary', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'accessory', title: 'Accessory', intent: 'Support pressing strength with tricep, rear delt, or rotator cuff work.', restRule: '45-75s between paired movements.', densityRule: 'Pair complementary movements', role: 'accessory', loadingStrategy: 'straight_sets', maxExercises: 2, required: false },
        { template: 'durability', title: 'Durability', intent: 'Protect the shoulder complex, scapula, and trunk for ring volume.', restRule: '45-60s between movements.', densityRule: 'Controlled quality work', role: 'durability', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'cooldown', title: 'Cooldown', intent: 'Restore breathing and shoulder position before leaving.', restRule: 'Continuous easy flow.', densityRule: '1-2 easy rounds', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    upper_pull: [
        { template: 'activation', title: 'Activation', intent: 'Prep shoulders, thoracic position, and trunk before pulling.', restRule: 'Short controlled transitions.', densityRule: '2 easy rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'power', title: 'Power', intent: 'Prime upper-body pull explosiveness with throws or dynamic pulls.', restRule: 'Rest 75-120s between efforts.', densityRule: null, role: 'explosive', loadingStrategy: 'straight_sets', maxExercises: 1, required: true },
        { template: 'main_strength', title: 'Primary Strength', intent: 'Own the main pull anchor with autoregulated loading.', restRule: 'Rest 2-3 min between working sets.', densityRule: null, role: 'anchor', loadingStrategy: 'top_set_backoff', maxExercises: 2, required: true },
        { template: 'secondary_strength', title: 'Secondary Strength', intent: 'Build upper-back support without flooding fatigue.', restRule: 'Rest 75-120s between sets.', densityRule: null, role: 'secondary', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'accessory', title: 'Accessory', intent: 'Build bicep, grip, or rear delt support without flooding back fatigue.', restRule: '45-75s between paired movements.', densityRule: 'Pair complementary movements', role: 'accessory', loadingStrategy: 'straight_sets', maxExercises: 2, required: false },
        { template: 'durability', title: 'Durability', intent: 'Layer scap, cuff, neck, and anti-rotation support.', restRule: '45-60s between movements.', densityRule: 'Controlled quality work', role: 'durability', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'cooldown', title: 'Cooldown', intent: 'Restore position and downshift the nervous system.', restRule: 'Continuous easy flow.', densityRule: '1-2 easy rounds', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    full_body: [
        { template: 'activation', title: 'Activation', intent: 'Open with coordinated prep and footwork-ready movement.', restRule: 'Short controlled transitions.', densityRule: '2 easy rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'power', title: 'Power', intent: 'Express speed and intent before the main lifts.', restRule: 'Rest 75-120s between efforts.', densityRule: null, role: 'explosive', loadingStrategy: 'straight_sets', maxExercises: 1, required: true },
        { template: 'main_strength', title: 'Lower Anchor', intent: 'Drive the lower-body anchor for the day.', restRule: 'Rest 2-3 min between working sets.', densityRule: null, role: 'anchor', loadingStrategy: 'top_set_backoff', maxExercises: 2, required: true },
        { template: 'secondary_strength', title: 'Upper Anchor', intent: 'Pair the day with a stable upper-body anchor.', restRule: 'Rest 2 min between working sets.', densityRule: null, role: 'secondary', loadingStrategy: 'top_set_backoff', maxExercises: 1, required: true },
        { template: 'accessory', title: 'Accessory Pair', intent: 'Fill the biggest support gaps without diluting the session intent.', restRule: '45-75s between paired movements.', densityRule: 'Pair complementary movements', role: 'accessory', loadingStrategy: 'straight_sets', maxExercises: 3, required: true },
        { template: 'durability', title: 'Durability', intent: 'Finish with trunk, scap, or neck support that carries into boxing work.', restRule: '45-60s between movements.', densityRule: 'Controlled quality work', role: 'durability', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'cooldown', title: 'Cooldown', intent: 'Bring the system back down before leaving.', restRule: 'Continuous easy flow.', densityRule: '1 easy round', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    conditioning: [
        { template: 'activation', title: 'Movement Prep', intent: 'Raise temperature and prep rhythm before the engine work starts.', restRule: 'Keep moving and breathe through transitions.', densityRule: '2 prep rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'main_strength', title: 'System Main Set', intent: 'Hit the targeted energy system with exact interval structure.', restRule: 'Respect every work-rest ratio exactly.', densityRule: 'Intervals are the session', role: 'anchor', loadingStrategy: 'intervals', maxExercises: 1, required: true },
        { template: 'accessory', title: 'Support Work', intent: 'Support tissue capacity and trunk control without adding junk fatigue.', restRule: '45-60s between pieces.', densityRule: 'Steady quality work', role: 'accessory', loadingStrategy: 'density_block', maxExercises: 2, required: true },
        { template: 'cooldown', title: 'Cooldown', intent: 'Drop arousal and recover out of the session.', restRule: 'Continuous easy flow.', densityRule: '5 easy minutes', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    recovery: [
        { template: 'activation', title: 'Restore', intent: 'Restore movement quality and blood flow without stressing the system.', restRule: 'No hard efforts today.', densityRule: 'Easy nasal-breathing flow', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'cooldown', title: 'Breathe Down', intent: 'Leave fresher than you started.', restRule: 'Continuous easy flow.', densityRule: '5 easy minutes', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
    sport_specific: [
        { template: 'activation', title: 'Activation', intent: 'Prep rhythm, footwork, and trunk control before fast work.', restRule: 'Keep transitions short.', densityRule: '2 prep rounds', role: 'prep', loadingStrategy: 'recovery_flow', maxExercises: 2, required: true },
        { template: 'power', title: 'Explosive Prep', intent: 'Hit restrained boxing-transfer power without turning this into skill practice.', restRule: 'Rest 75-120s between efforts.', densityRule: null, role: 'explosive', loadingStrategy: 'straight_sets', maxExercises: 1, required: true },
        { template: 'main_strength', title: 'Main Support', intent: 'Support the ring with a low-volume, high-quality force block.', restRule: 'Rest 2 min between sets.', densityRule: null, role: 'anchor', loadingStrategy: 'top_set_backoff', maxExercises: 2, required: true },
        { template: 'secondary_strength', title: 'Secondary Support', intent: 'Reinforce upper-back, hip, or anti-rotation patterns that carry directly into the ring.', restRule: 'Rest 75-120s between sets.', densityRule: null, role: 'secondary', loadingStrategy: 'straight_sets', maxExercises: 2, required: true },
        { template: 'accessory', title: 'Accessory', intent: 'Target grip, neck, or rotator cuff without accumulating excess fatigue before sparring.', restRule: '45-75s between paired movements.', densityRule: 'Pair complementary movements', role: 'accessory', loadingStrategy: 'straight_sets', maxExercises: 2, required: false },
        { template: 'durability', title: 'Durability', intent: 'Protect neck, trunk, and shoulders around boxing load.', restRule: '45-60s between movements.', densityRule: 'Controlled quality work', role: 'durability', loadingStrategy: 'straight_sets', maxExercises: 3, required: true },
        { template: 'cooldown', title: 'Cooldown', intent: 'Downshift before the next boxing demand.', restRule: 'Continuous easy flow.', densityRule: '1 easy round', role: 'recovery', loadingStrategy: 'recovery_flow', maxExercises: 1, required: true },
    ],
};

const TEMPLATE_TRIM_ORDER: WorkoutSectionTemplate[] = [
    'finisher',
    'accessory',
    'durability',
    'power',
    'secondary_strength',
];

const SECTION_BUILD_PRIORITY: WorkoutSectionTemplate[] = [
    'activation',
    'main_strength',
    'secondary_strength',
    'power',
    'accessory',
    'durability',
    'finisher',
    'cooldown',
];

function isSupportTemplate(template: WorkoutSectionTemplate): boolean {
    return template === 'activation' || template === 'cooldown';
}

function templateCountsTowardExerciseCap(template: WorkoutSectionTemplate): boolean {
    return !isSupportTemplate(template);
}

function templateConsumesBudget(template: WorkoutSectionTemplate): boolean {
    return !isSupportTemplate(template);
}

function parseIsoDateToUtc(value: string): number | null {
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isNaN(parsed) ? null : parsed;
}

function getDaysSinceLastUse(history: ExerciseHistoryEntry[] | undefined, trainingDate?: string): number | null {
    if (!history || history.length === 0 || !trainingDate) return null;
    const trainingUtc = parseIsoDateToUtc(trainingDate);
    const lastUtc = parseIsoDateToUtc(history[0].date);
    if (trainingUtc == null || lastUtc == null) return null;
    return Math.max(0, Math.floor((trainingUtc - lastUtc) / 86400000));
}

function hashString(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function estimateAdditionalSetBudgetCost(exercise: ExerciseLibraryRow): number {
    return Math.max(1, Math.round(exercise.cns_load / 2));
}

function clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function focusLabel(focus: WorkoutFocus): string {
    return focus.replace(/_/g, ' ');
}

function usesBoxingTransfer(exercise: ExerciseLibraryRow): boolean {
    const name = exercise.name.toLowerCase();
    return exercise.sport_tags.includes('boxing')
        || name.includes('rotation')
        || name.includes('rotational')
        || name.includes('throw')
        || name.includes('slam')
        || name.includes('lunge')
        || name.includes('split')
        || name.includes('anti-rotation')
        || name.includes('neck')
        || name.includes('footwork');
}

function matchesFocusPrimary(exercise: ExerciseLibraryRow, focus: WorkoutFocus): boolean {
    switch (focus) {
        case 'upper_push':
            return ['chest', 'shoulders', 'arms'].includes(exercise.muscle_group);
        case 'upper_pull':
            return ['back', 'arms'].includes(exercise.muscle_group);
        case 'lower':
            return ['quads', 'hamstrings', 'glutes', 'calves'].includes(exercise.muscle_group);
        case 'full_body':
            return ['quads', 'hamstrings', 'glutes', 'back', 'chest', 'shoulders'].includes(exercise.muscle_group);
        case 'sport_specific':
            return exercise.sport_tags.includes('boxing') || ['core', 'shoulders', 'neck'].includes(exercise.muscle_group);
        case 'conditioning':
            return exercise.type === 'conditioning' || exercise.type === 'sport_specific';
        case 'recovery':
            return exercise.type === 'mobility' || exercise.type === 'active_recovery';
        default:
            return true;
    }
}

function matchesSectionTemplate(
    exercise: ExerciseLibraryRow,
    focus: WorkoutFocus,
    template: WorkoutSectionTemplate,
): boolean {
    switch (template) {
        case 'activation':
            return exercise.type === 'mobility'
                || exercise.type === 'active_recovery'
                || (exercise.type === 'power' && exercise.cns_load <= 4)
                || (exercise.type === 'sport_specific' && exercise.cns_load <= 4);
        case 'power':
            return exercise.type === 'power'
                || (exercise.type === 'sport_specific' && usesBoxingTransfer(exercise))
                || (exercise.type === 'conditioning' && exercise.cns_load <= 4);
        case 'main_strength':
            if (focus === 'conditioning') {
                return exercise.type === 'conditioning' || exercise.type === 'sport_specific';
            }
            return exercise.type === 'heavy_lift'
                || (focus === 'sport_specific' && exercise.type === 'power');
        case 'secondary_strength':
            return exercise.type === 'heavy_lift'
                || (focus === 'conditioning' && exercise.type === 'conditioning');
        case 'accessory':
            return exercise.type === 'heavy_lift'
                || exercise.type === 'conditioning'
                || exercise.type === 'sport_specific';
        case 'durability':
            return ['core', 'neck', 'shoulders', 'back'].includes(exercise.muscle_group)
                || exercise.type === 'mobility'
                || exercise.type === 'active_recovery';
        case 'finisher':
            return exercise.type === 'conditioning' || exercise.type === 'sport_specific';
        case 'cooldown':
            return exercise.type === 'mobility' || exercise.type === 'active_recovery';
        default:
            return true;
    }
}

function getSectionSpecificScore(
    exercise: ExerciseLibraryRow,
    baseScore: number,
    focus: WorkoutFocus,
    template: WorkoutSectionTemplate,
): number {
    let score = baseScore;

    if (matchesFocusPrimary(exercise, focus)) score += 10;
    if (usesBoxingTransfer(exercise)) score += 6;

    switch (template) {
        case 'activation':
            if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 25;
            if (exercise.type === 'heavy_lift') score -= 50;
            break;
        case 'power':
            if (exercise.type === 'power') score += 25;
            if (exercise.cns_load >= 8) score -= 20;
            break;
        case 'main_strength':
            if (focus === 'conditioning') {
                if (exercise.type === 'conditioning') score += 30;
                if (exercise.type === 'sport_specific') score += 12;
                if (exercise.type === 'heavy_lift') score -= 20;
            } else {
                if (exercise.type === 'heavy_lift') score += 28;
                if (!matchesFocusPrimary(exercise, focus) && focus !== 'full_body') score -= 12;
                if (exercise.cns_load <= 3) score -= 10;
            }
            break;
        case 'secondary_strength':
            if (exercise.type === 'heavy_lift') score += 18;
            if (exercise.cns_load >= 9) score -= 12;
            break;
        case 'accessory':
            if (exercise.cns_load <= 6) score += 12;
            if (['core', 'shoulders', 'arms', 'glutes', 'calves'].includes(exercise.muscle_group)) score += 8;
            break;
        case 'durability':
            if (['core', 'neck', 'shoulders'].includes(exercise.muscle_group)) score += 18;
            if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 12;
            break;
        case 'finisher':
            if (exercise.type === 'conditioning') score += 22;
            if (exercise.cns_load >= 8) score -= 15;
            break;
        case 'cooldown':
            if (exercise.type === 'mobility' || exercise.type === 'active_recovery') score += 20;
            if (exercise.type === 'heavy_lift') score -= 60;
            break;
    }

    return score;
}

function parseCoachingCues(cues: string | undefined, fallback: string): string[] {
    const parts = (cues ?? '')
        .split(/[.;,]/)
        .map(part => part.trim())
        .filter(Boolean);

    return parts.length > 0 ? parts.slice(0, 2) : [fallback];
}

function resolveFatigueCost(cnsLoad: number): 'low' | 'moderate' | 'high' {
    if (cnsLoad <= 3) return 'low';
    if (cnsLoad <= 6) return 'moderate';
    return 'high';
}

function buildProgressionAnchor(
    focus: WorkoutFocus,
    template: WorkoutSectionTemplate,
    exercise: ExerciseLibraryRow,
): ProgressionAnchor | null {
    if (template !== 'main_strength' && !(focus === 'full_body' && template === 'secondary_strength')) {
        if (template !== 'durability') return null;
        return {
            key: focus + ':durability:' + exercise.muscle_group,
            label: 'Durability rotation',
            stableAcrossBlock: false,
            rotationCadence: 'weekly',
            rationale: 'Durability pieces rotate more often to keep tissues fresh and cover support gaps.',
        };
    }

    return {
        key: focus + ':' + template + ':' + exercise.muscle_group,
        label: capitalize(focusLabel(focus)) + ' anchor',
        stableAcrossBlock: true,
        rotationCadence: 'block',
        rationale: 'Main lift patterns stay stable across the block so progression can compound cleanly.',
    };
}

function buildSubstitutions(
    exercise: ExerciseLibraryRow,
    usableExerciseLibrary: ExerciseLibraryRow[],
    template: WorkoutSectionTemplate,
): SectionExercisePrescription['substitutions'] {
    const substitutions = usableExerciseLibrary
        .filter(candidate => candidate.id !== exercise.id)
        .map(candidate => {
            const preservesPattern = candidate.muscle_group === exercise.muscle_group;
            const preservesStimulus = candidate.type === exercise.type
                || (template === 'durability' && ['mobility', 'active_recovery', 'heavy_lift'].includes(candidate.type))
                || (template === 'finisher' && ['conditioning', 'sport_specific'].includes(candidate.type));
            const rankScore =
                (preservesPattern ? 30 : 0) +
                (preservesStimulus ? 30 : 0) +
                (candidate.equipment === exercise.equipment ? 10 : 0) -
                Math.abs(candidate.cns_load - exercise.cns_load) * 4;

            return {
                exerciseId: candidate.id,
                exerciseName: candidate.name,
                rationale: preservesPattern && preservesStimulus
                    ? 'Closest match for movement pattern and stimulus.'
                    : preservesPattern
                        ? 'Keeps the same pattern with a slightly different training effect.'
                        : 'Backup option if the preferred pattern is unavailable.',
                rank: rankScore,
                preservesPattern,
                preservesStimulus,
                fatigueDelta: candidate.cns_load - exercise.cns_load,
            };
        })
        .filter(candidate => candidate.preservesPattern || candidate.preservesStimulus)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 3);

    if (substitutions.length > 0) {
        return substitutions;
    }

    const fallback = findSubstituteExercise(exercise, usableExerciseLibrary);
    if (!fallback) return [];

    return [{
        exerciseId: fallback.id,
        exerciseName: fallback.name,
        rationale: 'Lower-fatigue fallback if the preferred lift is not available.',
        rank: 1,
        preservesPattern: fallback.muscle_group === exercise.muscle_group,
        preservesStimulus: fallback.type === exercise.type,
        fatigueDelta: fallback.cns_load - exercise.cns_load,
    }];
}

function buildSetPrescription(
    template: WorkoutSectionTemplate,
    focus: WorkoutFocus,
    exercise: ExerciseLibraryRow,
    rpeCap: number,
    readinessState: ReadinessState,
    blockContext: TrainingBlockContext | null,
    availableMinutes: number | undefined,
): {
    targetSets: number;
    targetReps: number;
    targetRPE: number;
    restSeconds: number;
    loadingStrategy: LoadingStrategy;
    setScheme: string;
    loadingNotes: string;
    setPrescription: ExerciseSetPrescription[];
} {
    const defaultRest = getRestTimerDefaults()[exercise.type]?.defaultSeconds ?? 90;

    if (template === 'activation') {
        const sets = 2;
        const reps = exercise.type === 'power' ? 4 : 6;
        return {
            targetSets: sets,
            targetReps: reps,
            targetRPE: Math.min(4, rpeCap),
            restSeconds: 30,
            loadingStrategy: 'recovery_flow',
            setScheme: sets + ' x ' + reps + ' smooth reps',
            loadingNotes: 'Use this to prep positions, rhythm, and range without fatigue.',
            setPrescription: [{ label: 'Prep', sets, reps, targetRPE: Math.min(4, rpeCap), restSeconds: 30 }],
        };
    }

    if (template === 'power') {
        const sets = readinessState === 'Prime' ? 4 : 3;
        const reps = 3;
        const restSeconds = clampNumber(defaultRest - 30, 75, 150);
        return {
            targetSets: sets,
            targetReps: reps,
            targetRPE: Math.min(6, rpeCap),
            restSeconds,
            loadingStrategy: 'straight_sets',
            setScheme: sets + ' x ' + reps + ' explosive reps',
            loadingNotes: 'Every rep should stay fast. Shut the set down the moment velocity drops.',
            setPrescription: [{ label: 'Explosive work', sets, reps, targetRPE: Math.min(6, rpeCap), restSeconds }],
        };
    }

    if (template === 'main_strength' && focus === 'conditioning') {
        const rounds = availableMinutes && availableMinutes <= 35 ? 6 : 8;
        const workSeconds = blockContext?.phase === 'realize' ? 20 : 30;
        const restSeconds = blockContext?.phase === 'accumulate' ? 45 : 60;
        return {
            targetSets: rounds,
            targetReps: 1,
            targetRPE: Math.min(8, rpeCap),
            restSeconds,
            loadingStrategy: 'intervals',
            setScheme: rounds + ' x ' + workSeconds + 's work / ' + restSeconds + 's rest',
            loadingNotes: 'Stay on the prescribed work-rest rhythm. The goal is repeatable quality, not a death march.',
            setPrescription: [{ label: 'Main set', sets: rounds, reps: workSeconds + 's', targetRPE: Math.min(8, rpeCap), restSeconds }],
        };
    }

    if (template === 'main_strength' || (template === 'secondary_strength' && focus === 'full_body')) {
        const topSetReps = blockContext?.phase === 'realize' ? 3 : blockContext?.phase === 'intensify' ? 4 : 5;
        const topSetRPE = clampNumber(Math.min(rpeCap, blockContext?.phase === 'pivot' ? 6 : 8), 5, 8);
        const backoffSets = blockContext?.phase === 'accumulate' ? 4 : 3;
        const backoffReps = topSetReps + 2;
        const backoffRPE = Math.max(5, topSetRPE - 1);
        const restSeconds = clampNumber(defaultRest, 120, 210);
        return {
            targetSets: 1 + backoffSets,
            targetReps: backoffReps,
            targetRPE: backoffRPE,
            restSeconds,
            loadingStrategy: 'top_set_backoff',
            setScheme: '1 x ' + topSetReps + ' @ RPE ' + topSetRPE + ', then ' + backoffSets + ' x ' + backoffReps + ' @ RPE ' + backoffRPE,
            loadingNotes: 'Build to one high-quality top set, then strip 6-10% and complete the backoff work.',
            setPrescription: [
                { label: 'Top set', sets: 1, reps: topSetReps, targetRPE: topSetRPE, restSeconds },
                { label: 'Backoff', sets: backoffSets, reps: backoffReps, targetRPE: backoffRPE, restSeconds: Math.max(90, restSeconds - 30), intensityNote: 'Drop 6-10% from the top set load' },
            ],
        };
    }

    if (template === 'secondary_strength') {
        const sets = blockContext?.phase === 'pivot' ? 3 : 4;
        const reps = focus === 'lower' ? 6 : 8;
        const restSeconds = clampNumber(defaultRest - 30, 75, 120);
        return {
            targetSets: sets,
            targetReps: reps,
            targetRPE: Math.min(7, rpeCap),
            restSeconds,
            loadingStrategy: 'straight_sets',
            setScheme: sets + ' x ' + reps + ' @ RPE ' + Math.min(7, rpeCap),
            loadingNotes: 'Leave one to three clean reps in reserve and protect movement quality.',
            setPrescription: [{ label: 'Work sets', sets, reps, targetRPE: Math.min(7, rpeCap), restSeconds }],
        };
    }

    if (template === 'accessory' || template === 'durability') {
        const sets = template === 'durability' ? 3 : 4;
        const reps = template === 'durability' ? 10 : 8;
        const restSeconds = template === 'durability' ? 45 : 60;
        const loadingStrategy = template === 'accessory' && focus === 'conditioning' ? 'density_block' : 'straight_sets';
        return {
            targetSets: sets,
            targetReps: reps,
            targetRPE: Math.min(template === 'durability' ? 6 : 7, rpeCap),
            restSeconds,
            loadingStrategy,
            setScheme: sets + ' x ' + reps,
            loadingNotes: template === 'durability'
                ? 'Build tissue capacity and positional control. Nothing here should spike fatigue.'
                : 'Accumulate quality support volume without letting it compete with the main work.',
            setPrescription: [{ label: template === 'durability' ? 'Durability work' : 'Accessory work', sets, reps, targetRPE: Math.min(template === 'durability' ? 6 : 7, rpeCap), restSeconds }],
        };
    }

    if (template === 'finisher') {
        const rounds = availableMinutes && availableMinutes <= 45 ? 4 : 6;
        return {
            targetSets: rounds,
            targetReps: 1,
            targetRPE: Math.min(8, rpeCap),
            restSeconds: 40,
            loadingStrategy: 'intervals',
            setScheme: rounds + ' x 20s on / 40s off',
            loadingNotes: 'Use this only as a clean touch of repeatability. End it before mechanics slip.',
            setPrescription: [{ label: 'Finisher', sets: rounds, reps: '20s work', targetRPE: Math.min(8, rpeCap), restSeconds: 40 }],
        };
    }

    return {
        targetSets: 2,
        targetReps: 1,
        targetRPE: 3,
        restSeconds: 15,
        loadingStrategy: 'recovery_flow',
        setScheme: '2 x 60s easy flow',
        loadingNotes: 'Bring heart rate down and finish the session feeling better than when you walked in.',
        setPrescription: [{ label: 'Cooldown', sets: 2, reps: '60s', targetRPE: 3, restSeconds: 15 }],
    };
}

function estimateExerciseTime(exercise: PrescribedExerciseV2): number {
    const restDefaults = getRestTimerDefaults();
    if (exercise.setPrescription && exercise.setPrescription.length > 0) {
        return exercise.setPrescription.reduce(
            (total, entry) => total + (entry.sets * (0.75 + entry.restSeconds / 60)),
            0,
        ) + ((exercise.warmupSets?.length ?? 0) * 1.25);
    }

    const restSeconds = exercise.restSeconds ?? restDefaults[exercise.exercise.type]?.defaultSeconds ?? 90;
    return ((exercise.warmupSets?.length ?? 0) * 1.25) + (exercise.targetSets * (1 + restSeconds / 60));
}

function estimateSectionTime(section: WorkoutSessionSection): number {
    const raw = section.exercises.reduce((sum, exercise) => sum + estimateExerciseTime(exercise), 0);
    return Math.max(section.timeCap, Math.round(raw));
}

function estimateWorkoutDuration(sections: WorkoutSessionSection[]): number {
    const raw = sections.reduce((sum, section) => sum + estimateSectionTime(section), 0);
    // Discount for superset pairs: paired exercises share rest time, saving ~1.5 min per pair
    const supersetPairs = sections.flatMap(s => s.exercises)
        .filter(e => e.supersetGroup != null).length / 2;
    return Math.max(15, Math.round(raw - supersetPairs * 1.5));
}

function resolveSessionArchetype(
    focus: WorkoutFocus,
    risk: PerformanceRiskState,
): SectionBlueprint[] {
    if (risk.level === 'red') return SESSION_ARCHETYPES.recovery;

    const base = SESSION_ARCHETYPES[focus] ?? SESSION_ARCHETYPES.full_body;
    const blockedStimuli = risk.constraintSet?.blockedStimuli ?? [];
    return base.filter(section => {
        if (risk.level === 'orange' && (section.template === 'power' || section.template === 'finisher')) return false;
        if (risk.level === 'yellow' && section.template === 'finisher') return false;
        if (section.template === 'power' && (blockedStimuli.includes('max_velocity') || blockedStimuli.includes('plyometric'))) return false;
        if (section.template === 'finisher' && (blockedStimuli.includes('glycolytic_conditioning') || blockedStimuli.includes('tempo_conditioning'))) return false;
        if (focus === 'sport_specific' && section.template === 'power' && blockedStimuli.includes('hard_sparring')) return false;
        return true;
    });
}

function selectSectionExercises(
    scoredExercises: ScoredExercise[],
    focus: WorkoutFocus,
    template: WorkoutSectionTemplate,
    maxExercises: number,
    usedExerciseIds: Set<string>,
    recoveryBudgetRemaining: number,
    exerciseHistory: Map<string, ExerciseHistoryEntry[]> | undefined,
    trainingDate: string | undefined,
    seedKey: string,
): ScoredExercise[] {
    const candidates = scoredExercises
        .filter(({ exercise }) => !usedExerciseIds.has(exercise.id))
        .filter(({ recoveryCost }) => !templateConsumesBudget(template) || (recoveryCost ?? 0) <= recoveryBudgetRemaining)
        .filter(({ exercise }) => matchesSectionTemplate(exercise, focus, template))
        .map(({ exercise, score, recoveryCost }) => {
            const history = exerciseHistory?.get(exercise.id);
            const daysSinceLastUse = getDaysSinceLastUse(history, trainingDate);
            const uses14d = (history ?? [])
                .map((entry) => trainingDate ? getDaysSinceLastUse([entry], trainingDate) : null)
                .filter((value): value is number => value != null && value <= 13)
                .length;
            return {
                exercise,
                score: getSectionSpecificScore(exercise, score, focus, template),
                recoveryCost,
                daysSinceLastUse,
                uses14d,
                seededRank: hashString(`${seedKey}:${exercise.id}`),
            };
        })
        .sort((a, b) => {
            if (Math.abs(b.score - a.score) > 5) return b.score - a.score;
            if (a.seededRank !== b.seededRank) return a.seededRank - b.seededRank;
            if (b.score !== a.score) return b.score - a.score;
            return (a.recoveryCost ?? 0) - (b.recoveryCost ?? 0);
        });

    if (template !== 'main_strength' && template !== 'activation' && template !== 'cooldown') {
        const filtered = candidates.filter((candidate) => {
            if (candidate.uses14d < 3) return true;
            const alternative = candidates.find((other) =>
                other.exercise.id !== candidate.exercise.id
                && (other.exercise.muscle_group === candidate.exercise.muscle_group || other.exercise.type === candidate.exercise.type)
                && other.score >= candidate.score - 10,
            );
            return alternative == null;
        });
        if (filtered.length > 0) {
            return filtered.slice(0, maxExercises).map(({ exercise, score, recoveryCost }) => ({ exercise, score, recoveryCost }));
        }
    }

    if (template === 'main_strength') {
        const anchor = candidates.find((candidate) => candidate.daysSinceLastUse != null && candidate.daysSinceLastUse <= 6);
        const challenger = anchor
            ? candidates.find((candidate) =>
                candidate.exercise.id !== anchor.exercise.id
                && (candidate.daysSinceLastUse == null || candidate.daysSinceLastUse > 6)
                && candidate.score >= anchor.score + 10,
            )
            : null;
        if (anchor && !challenger) {
            const reordered = [anchor, ...candidates.filter((candidate) => candidate.exercise.id !== anchor.exercise.id)];
            return reordered.slice(0, maxExercises).map(({ exercise, score, recoveryCost }) => ({ exercise, score, recoveryCost }));
        }
    }

    return candidates.slice(0, maxExercises).map(({ exercise, score, recoveryCost }) => ({ exercise, score, recoveryCost }));
}

function applySupersetsToExercises(exercises: SectionExercisePrescription[]): void {
    const pushGroups: MuscleGroup[] = ['chest', 'shoulders'];
    const pullGroups: MuscleGroup[] = ['back'];
    let groupId = 1;

    for (let index = 0; index < exercises.length - 1; index += 1) {
        const current = exercises[index];
        const next = exercises[index + 1];
        const currentPush = pushGroups.includes(current.exercise.muscle_group);
        const nextPull = pullGroups.includes(next.exercise.muscle_group);
        const currentPull = pullGroups.includes(current.exercise.muscle_group);
        const nextPush = pushGroups.includes(next.exercise.muscle_group);

        if ((currentPush && nextPull) || (currentPull && nextPush)) {
            current.supersetGroup = groupId;
            next.supersetGroup = groupId;
            groupId += 1;
            index += 1;
        }
    }
}

function flattenSections(sections: WorkoutSessionSection[]): SectionExercisePrescription[] {
    const flattened = sections.flatMap(section =>
        section.exercises.map(exercise => ({
            ...exercise,
            sectionId: section.id,
            sectionTemplate: section.template,
            sectionIntent: section.intent,
        })),
    );

    applySupersetsToExercises(flattened);
    return flattened;
}

function trimSectionsToTime(sections: WorkoutSessionSection[], availableMinutes: number): WorkoutSessionSection[] {
    if (availableMinutes <= 0) return sections;

    let trimmed = sections.map(section => ({ ...section, exercises: [...section.exercises] }));
    const getTotal = () => estimateWorkoutDuration(trimmed);
    if (getTotal() <= availableMinutes) return trimmed;

    for (const template of TEMPLATE_TRIM_ORDER) {
        if (getTotal() <= availableMinutes) break;
        trimmed = trimmed.filter(section => section.template !== template);
    }

    while (getTotal() > availableMinutes) {
        const adjustable = trimmed.find(section =>
            ['secondary_strength', 'accessory', 'durability', 'power', 'finisher'].includes(section.template)
            && section.exercises.length > 0,
        );
        if (!adjustable) break;

        if (adjustable.exercises.length > 1) {
            adjustable.exercises = adjustable.exercises.slice(0, adjustable.exercises.length - 1);
            continue;
        }

        const exercise = adjustable.exercises[0];
        if (exercise.targetSets > 2) {
            exercise.targetSets -= 1;
            exercise.setScheme = exercise.targetSets + ' x ' + exercise.targetReps + ' @ RPE ' + exercise.targetRPE;
            if (exercise.setPrescription && exercise.setPrescription.length > 0) {
                const lastIndex = exercise.setPrescription.length - 1;
                exercise.setPrescription = exercise.setPrescription.map((entry, index) =>
                    index === lastIndex ? { ...entry, sets: Math.max(1, entry.sets - 1) } : entry,
                );
            }
        } else {
            trimmed = trimmed.filter(section => section.id !== adjustable.id);
        }
    }

    return trimmed.filter(section => section.exercises.length > 0);
}

function getExerciseCountTowardCap(sections: WorkoutSessionSection[]): number {
    return sections.reduce((sum, section) =>
        sum + (templateCountsTowardExerciseCap(section.template) ? section.exercises.length : 0), 0);
}

function getUsedCNS(sections: WorkoutSessionSection[]): number {
    return sections.reduce((sum, section) =>
        sum + (templateConsumesBudget(section.template)
            ? section.exercises.reduce((sectionSum, exercise) => sectionSum + exercise.exercise.cns_load, 0)
            : 0), 0);
}

function addSetsToExercise(exercise: SectionExercisePrescription, extraSets: number): void {
    if (extraSets <= 0) return;

    exercise.targetSets += extraSets;

    if (exercise.sectionTemplate === 'main_strength' && exercise.setPrescription && exercise.setPrescription.length > 1) {
        const backoffIndex = exercise.setPrescription.length - 1;
        exercise.setPrescription = exercise.setPrescription.map((entry, index) =>
            index === backoffIndex ? { ...entry, sets: entry.sets + extraSets } : entry,
        );
        const topSet = exercise.setPrescription[0];
        const backoff = exercise.setPrescription[backoffIndex];
        exercise.setScheme = `${topSet.sets} x ${topSet.reps} @ RPE ${topSet.targetRPE}, then ${backoff.sets} x ${backoff.reps} @ RPE ${backoff.targetRPE}`;
        return;
    }

    if (exercise.setPrescription && exercise.setPrescription.length > 0) {
        exercise.setPrescription = exercise.setPrescription.map((entry, index) =>
            index === 0 ? { ...entry, sets: entry.sets + extraSets } : entry,
        );
    }

    exercise.setScheme = `${exercise.targetSets} x ${exercise.targetReps} @ RPE ${exercise.targetRPE}`;
}

function getAdditionalSetCap(exercise: SectionExercisePrescription): number {
    if (exercise.sectionTemplate === 'main_strength') return 2;
    if (exercise.sectionTemplate === 'secondary_strength' || exercise.sectionTemplate === 'accessory' || exercise.sectionTemplate === 'durability') return 1;
    return 0;
}

function getAdditionalSetTimeCost(exercise: SectionExercisePrescription): number {
    if (exercise.sectionTemplate === 'main_strength') return 3;
    if (exercise.sectionTemplate === 'secondary_strength') return 2;
    if (exercise.sectionTemplate === 'accessory') return 1.5;
    if (exercise.sectionTemplate === 'durability') return 1.25;
    return 0;
}

function scaleExerciseVolume(
    sections: WorkoutSessionSection[],
    remainingBudget: number,
    availableMinutes?: number,
): void {
    let budgetLeft = remainingBudget;
    let minutesLeft = availableMinutes != null
        ? Math.max(0, availableMinutes - estimateWorkoutDuration(sections))
        : Number.POSITIVE_INFINITY;

    const orderedTemplates: WorkoutSectionTemplate[] = ['main_strength', 'secondary_strength', 'accessory', 'durability'];
    for (const template of orderedTemplates) {
        const templateExercises = sections
            .filter((section) => section.template === template)
            .flatMap((section) => section.exercises);

        for (const exercise of templateExercises) {
            let remainingAdds = getAdditionalSetCap(exercise);
            const setBudgetCost = estimateAdditionalSetBudgetCost(exercise.exercise);
            const setTimeCost = getAdditionalSetTimeCost(exercise);

            while (remainingAdds > 0 && budgetLeft >= setBudgetCost && minutesLeft >= setTimeCost) {
                addSetsToExercise(exercise, 1);
                budgetLeft -= setBudgetCost;
                minutesLeft -= setTimeCost;
                remainingAdds -= 1;
            }
        }
    }
}

function buildSessionGoal(
    focus: WorkoutFocus,
    performanceGoalType: PerformanceGoalType | undefined,
    blockContext: TrainingBlockContext | null,
): string {
    const goal = (performanceGoalType ?? 'conditioning').replace(/_/g, ' ');

    if (focus === 'conditioning') {
        return 'Build ' + goal + ' repeatability through a system-specific conditioning session.';
    }
    if (focus === 'recovery') {
        return 'Restore movement quality, blood flow, and readiness for the next high-value session.';
    }
    if (blockContext?.phase === 'realize') {
        return 'Express ' + goal + ' with sharp ' + focusLabel(focus) + ' work while protecting freshness.';
    }
    return 'Develop ' + goal + ' with a coached ' + focusLabel(focus) + ' session built around stable anchors and selective support work.';
}

function buildSectionExercise(input: {
    exercise: ExerciseLibraryRow;
    score: number;
    focus: WorkoutFocus;
    template: WorkoutSectionTemplate;
    role: ExerciseRole;
    rpeCap: number;
    readinessState: ReadinessState;
    blockContext: TrainingBlockContext | null;
    availableMinutes?: number;
    fitnessLevel: FitnessLevel;
    exerciseHistory?: Map<string, ExerciseHistoryEntry[]>;
    progressionModel?: GenerateWorkoutInputV2['progressionModel'];
    isDeloadWeek: boolean;
    usableExerciseLibrary: ExerciseLibraryRow[];
    muscleGroupsSeen: Set<MuscleGroup>;
}): SectionExercisePrescription {
    const {
        exercise,
        score,
        focus,
        template,
        role,
        rpeCap,
        readinessState,
        blockContext,
        availableMinutes,
        fitnessLevel,
        exerciseHistory,
        progressionModel,
        isDeloadWeek,
        usableExerciseLibrary,
        muscleGroupsSeen,
    } = input;

    const loading = buildSetPrescription(template, focus, exercise, rpeCap, readinessState, blockContext, availableMinutes);
    const history = exerciseHistory?.get(exercise.id);
    let overloadSuggestion = undefined;
    let suggestedWeight = undefined;
    let weightSuggestionReasoning = undefined;

    if (history && history.length > 0) {
        const model = progressionModel ?? selectProgressionModel(fitnessLevel, history.length);
        overloadSuggestion = suggestOverload({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            history,
            fitnessLevel,
            progressionModel: model,
            isDeloadWeek,
            readinessState,
            targetRPE: loading.targetRPE,
            targetReps: loading.targetReps,
            muscleGroup: exercise.muscle_group,
        });
        suggestedWeight = overloadSuggestion.suggestedWeight;
        weightSuggestionReasoning = overloadSuggestion.reasoning;
    }

    const warmup = generateWarmupSets({
        workingWeight: suggestedWeight ?? 0,
        exerciseType: exercise.type,
        equipment: exercise.equipment,
        isFirstExerciseForMuscle: !muscleGroupsSeen.has(exercise.muscle_group),
        fitnessLevel,
    });
    muscleGroupsSeen.add(exercise.muscle_group);

    return {
        exercise,
        preferredExercise: exercise,
        targetSets: loading.targetSets,
        targetReps: loading.targetReps,
        targetRPE: loading.targetRPE,
        supersetGroup: null,
        score,
        suggestedWeight,
        weightSuggestionReasoning,
        warmupSets: warmup.sets,
        restSeconds: loading.restSeconds,
        formCues: exercise.cues || undefined,
        isSubstitute: false,
        overloadSuggestion,
        role,
        loadingStrategy: loading.loadingStrategy,
        progressionAnchor: buildProgressionAnchor(focus, template, exercise),
        substitutions: buildSubstitutions(exercise, usableExerciseLibrary, template),
        coachingCues: parseCoachingCues(
            exercise.cues,
            template === 'power' ? 'Stay crisp and fast.' : template === 'durability' ? 'Own position and tempo.' : 'Move with control and intent.',
        ),
        fatigueCost: resolveFatigueCost(exercise.cns_load),
        setScheme: loading.setScheme,
        loadingNotes: loading.loadingNotes,
        setPrescription: loading.setPrescription,
        sectionId: '',
        sectionTemplate: template,
        sectionIntent: '',
    };
}

export function buildSectionedWorkoutSession(input: BuildSectionedWorkoutInput): BuildSectionedWorkoutResult {
    const {
        focus,
        scoredExercises,
        usableExerciseLibrary,
        readinessState,
        rpeCap,
        performanceRisk,
        performanceGoalType,
        blockContext,
        availableMinutes,
        fitnessLevel,
        exerciseHistory,
        progressionModel,
        isDeloadWeek,
        targetExerciseCount,
        recoveryBudget,
        trainingDate,
    } = input;

    const usedExerciseIds = new Set<string>();
    const muscleGroupsSeen = new Set<MuscleGroup>();
    let recoveryBudgetRemaining = recoveryBudget ?? Number.POSITIVE_INFINITY;

    const archetype = resolveSessionArchetype(focus, performanceRisk);
    const blueprintByTemplate = new Map(archetype.map((blueprint) => [blueprint.template, blueprint]));
    const orderedBlueprints = [
        ...SECTION_BUILD_PRIORITY.map((template) => blueprintByTemplate.get(template)).filter((value): value is SectionBlueprint => value != null),
        ...archetype.filter((blueprint) => !SECTION_BUILD_PRIORITY.includes(blueprint.template)),
    ];
    const requiresSecondaryFloor = blueprintByTemplate.has('secondary_strength') && focus !== 'recovery';
    let exerciseSlotsRemaining = targetExerciseCount;
    let hasMainStrength = false;
    let hasSecondaryStrength = !requiresSecondaryFloor;
    let sectionIndex = 0;

    let sections: WorkoutSessionSection[] = [];
    for (const blueprint of orderedBlueprints) {
        if (templateCountsTowardExerciseCap(blueprint.template) && exerciseSlotsRemaining <= 0) {
            continue;
        }

        if (blueprint.template === 'power') {
            const hasExplosiveWindow = performanceRisk.level !== 'orange' && performanceRisk.level !== 'red';
            const minimumsFunded = hasMainStrength && hasSecondaryStrength;
            const hasTime = availableMinutes == null || estimateWorkoutDuration(sections) + 8 <= availableMinutes;
            if (!hasExplosiveWindow || !minimumsFunded || !hasTime) {
                continue;
            }
        }

        const reservedSlots = blueprint.template === 'main_strength' && requiresSecondaryFloor && !hasSecondaryStrength
            ? 1
            : 0;
        const availableExerciseSlots = templateCountsTowardExerciseCap(blueprint.template)
            ? Math.max(blueprint.template === 'main_strength' ? 1 : 0, exerciseSlotsRemaining - reservedSlots)
            : blueprint.maxExercises;
        const maxExercises = templateCountsTowardExerciseCap(blueprint.template)
            ? Math.min(blueprint.maxExercises, availableExerciseSlots)
            : blueprint.maxExercises;

        if (maxExercises <= 0 && templateCountsTowardExerciseCap(blueprint.template)) {
            continue;
        }

        const seedKey = `${trainingDate ?? 'no-date'}:${focus}:${blueprint.template}:${blockContext?.phase ?? 'none'}`;
        const chosen = selectSectionExercises(
            scoredExercises,
            focus,
            blueprint.template,
            maxExercises,
            usedExerciseIds,
            recoveryBudgetRemaining,
            exerciseHistory,
            trainingDate,
            seedKey,
        );

        const minimumRequired = blueprint.template === 'main_strength'
            ? 1
            : blueprint.template === 'secondary_strength' && requiresSecondaryFloor
                ? 1
                : 0;

        if (chosen.length < minimumRequired) {
            continue;
        }

        const exercises = chosen.map(({ exercise, score, recoveryCost }) => {
            usedExerciseIds.add(exercise.id);
            if (templateConsumesBudget(blueprint.template)) {
                recoveryBudgetRemaining -= recoveryCost ?? 0;
            }
            return buildSectionExercise({
                exercise,
                score,
                focus,
                template: blueprint.template,
                role: blueprint.role,
                rpeCap,
                readinessState,
                blockContext,
                availableMinutes,
                fitnessLevel,
                exerciseHistory,
                progressionModel,
                isDeloadWeek,
                usableExerciseLibrary,
                muscleGroupsSeen,
            });
        });

        if (exercises.length === 0) {
            continue;
        }

        if (blueprint.template === 'main_strength') hasMainStrength = true;
        if (blueprint.template === 'secondary_strength') hasSecondaryStrength = true;
        if (templateCountsTowardExerciseCap(blueprint.template)) {
            exerciseSlotsRemaining -= exercises.length;
        }

        sectionIndex += 1;
        sections.push({
            id: blueprint.template + '-' + sectionIndex,
            template: blueprint.template,
            title: blueprint.title,
            intent: blueprint.intent,
            timeCap: blueprint.template === 'main_strength'
                ? 18
                : blueprint.template === 'secondary_strength'
                    ? 14
                    : blueprint.template === 'accessory' || blueprint.template === 'durability'
                        ? 10
                        : blueprint.template === 'finisher'
                            ? 8
                            : blueprint.template === 'power'
                                ? 8
                                : 6,
            restRule: blueprint.restRule,
            densityRule: blueprint.densityRule,
            exercises: exercises.map(exercise => ({
                ...exercise,
                sectionId: `${blueprint.template}-${sectionIndex}`,
                sectionTemplate: blueprint.template,
                sectionIntent: blueprint.intent,
            })),
            decisionTrace: [
                `template:${blueprint.template}`,
                `focus:${focus}`,
                `loading:${blueprint.loadingStrategy}`,
                ...exercises.slice(0, 2).map(exercise => `picked:${exercise.exercise.name}`),
            ],
            finisherReason: blueprint.template === 'finisher'
                ? 'Included because risk state, time budget, and block context all allow a short conditioning touch.'
                : null,
        });
    }

    if (availableMinutes) {
        sections = trimSectionsToTime(sections, availableMinutes);
    }

    const remainingBudget = Math.max(0, (recoveryBudget ?? Number.POSITIVE_INFINITY) - getUsedCNS(sections));
    scaleExerciseVolume(sections, remainingBudget, availableMinutes);

    let exercises = flattenSections(sections);
    if (getExerciseCountTowardCap(sections) > targetExerciseCount) {
        const countedExercises = exercises.filter((exercise) => templateCountsTowardExerciseCap(exercise.sectionTemplate ?? 'main_strength'));
        const allowedIds = new Set(countedExercises.slice(0, targetExerciseCount).map((exercise) => exercise.exercise.id));
        const supportIds = new Set(exercises
            .filter((exercise) => !templateCountsTowardExerciseCap(exercise.sectionTemplate ?? 'main_strength'))
            .map((exercise) => exercise.exercise.id));
        sections = sections
            .map(section => ({
                ...section,
                exercises: section.exercises.filter(exercise =>
                    supportIds.has(exercise.exercise.id) || allowedIds.has(exercise.exercise.id)),
            }))
            .filter(section => section.exercises.length > 0);
        exercises = flattenSections(sections);
    }

    return {
        sections,
        exercises,
        usedCNS: getUsedCNS(sections),
        estimatedDuration: estimateWorkoutDuration(sections),
        sessionGoal: buildSessionGoal(focus, performanceGoalType, blockContext),
    };
}
