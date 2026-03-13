import type {
  CoachingFocus,
  DailyCoachActionStep,
  DailyCoachDebrief,
  DailyCoachDebriefInput,
  DailyReadinessBand,
  MacroAdherenceStatus,
  PrimaryLimiter,
} from './types';

const PRIMARY_LIMITERS: PrimaryLimiter[] = [
  'sleep',
  'stress',
  'soreness',
  'nutrition',
  'hydration',
  'time',
  'none',
];

const NUTRITION_BARRIERS = ['appetite', 'timing', 'cravings', 'prep', 'social', 'none'] as const;
const COACHING_FOCUS = ['recovery', 'execution', 'consistency', 'nutrition'] as const;

type EducationEntry = {
  id: string;
  title: string;
  teaching: string;
  application: string;
};

const EDUCATION_LIBRARY: Record<PrimaryLimiter, EducationEntry[]> = {
  sleep: [
    {
      id: 'sleep_debt_reset',
      title: 'Sleep Debt Reset',
      teaching: 'One short sleep night reduces motor control and makes hard sessions feel harder.',
      application: 'Keep today at controlled intensity and add a 25-minute earlier shutdown tonight.',
    },
    {
      id: 'sleep_anchor',
      title: 'Sleep Anchor Habit',
      teaching: 'Consistent wake time stabilizes recovery signals more than occasional long sleep-ins.',
      application: 'Lock wake time within a 30-minute window and cut caffeine 8 hours before bed.',
    },
  ],
  stress: [
    {
      id: 'stress_load_split',
      title: 'Stress Load Split',
      teaching: 'Life stress and training stress stack on the same recovery system.',
      application: 'Keep quality in main sets, then trim optional volume by 15-20 percent.',
    },
    {
      id: 'stress_breathing_bracket',
      title: 'Breathing Bracket',
      teaching: 'Lowering arousal before and after training improves session quality under pressure.',
      application: 'Use 4 slow breaths before top sets and 2 minutes of nasal breathing post-session.',
    },
  ],
  soreness: [
    {
      id: 'soreness_range_quality',
      title: 'Range Before Load',
      teaching: 'Soreness limits force output most when you skip movement prep through full range.',
      application: 'Add 8-10 minutes of prep on stiff areas before your first working set.',
    },
    {
      id: 'soreness_volume_gate',
      title: 'Volume Gate',
      teaching: 'When soreness is high, keep exposure but lower total volume to protect adaptation.',
      application: 'Do planned warmups and top work, then cut last accessory set if form degrades.',
    },
  ],
  nutrition: [
    {
      id: 'nutrition_timing_window',
      title: 'Fuel Timing Window',
      teaching: 'Training quality drops when carbs and fluids are delayed too long around sessions.',
      application: 'Take a quick carb source 60-90 minutes pre-session and hydrate before warmup.',
    },
    {
      id: 'nutrition_floor_strategy',
      title: 'Minimum Fuel Floor',
      teaching: 'A consistent fuel floor protects output better than perfect macros a few days per week.',
      application: 'Hit protein target and one structured carb feeding before your hardest work today.',
    },
  ],
  hydration: [
    {
      id: 'hydration_performance_drop',
      title: 'Hydration and Output',
      teaching: 'Small hydration deficits reduce repeat sprint output and increase perceived effort.',
      application: 'Front-load fluid early day and include sodium with one bottle before training.',
    },
    {
      id: 'hydration_schedule_lock',
      title: 'Hydration Schedule Lock',
      teaching: 'Planned fluid timing beats relying on thirst during busy days.',
      application: 'Set 3 drink checkpoints before afternoon to protect session quality.',
    },
  ],
  time: [
    {
      id: 'time_priority_filter',
      title: 'Priority Filter',
      teaching: 'When time is limited, preserving high-return work keeps progression on track.',
      application: 'Complete main lift and first accessory first; optional volume only if time remains.',
    },
    {
      id: 'time_density_upgrade',
      title: 'Density Upgrade',
      teaching: 'Tighter rest management can keep quality while shortening total session length.',
      application: 'Use a visible timer and trim easy-set rest by 15-20 seconds today.',
    },
  ],
  none: [
    {
      id: 'consistency_compound',
      title: 'Consistency Compound',
      teaching: 'Daily execution quality compounds faster than occasional perfect hero days.',
      application: 'Keep planned intent, sharp technique, and finish your key recovery actions.',
    },
    {
      id: 'load_progression_rule',
      title: 'Load Progression Rule',
      teaching: 'Progression is strongest when effort and recovery stay aligned over consecutive days.',
      application: 'Push only the highest-value sets and leave one rep in reserve on supporting work.',
    },
  ],
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function isMacroAdherence(value: string): value is MacroAdherenceStatus {
  return value === 'Target Met' || value === 'Close Enough' || value === 'Missed It';
}

function isPrimaryLimiter(value: string): value is PrimaryLimiter {
  return PRIMARY_LIMITERS.includes(value as PrimaryLimiter);
}

export function validateDailyCoachDebriefInput(input: DailyCoachDebriefInput): string[] {
  const errors: string[] = [];

  const inRange = (v: number | null | undefined) => v == null || (Number.isFinite(v) && v >= 1 && v <= 5);

  if (!inRange(input.sleepQuality)) errors.push('sleepQuality must be between 1 and 5.');
  if (!inRange(input.readiness)) errors.push('readiness must be between 1 and 5.');
  if (!inRange(input.stressLevel)) errors.push('stressLevel must be between 1 and 5 when provided.');
  if (!inRange(input.sorenessLevel)) errors.push('sorenessLevel must be between 1 and 5 when provided.');
  if (!inRange(input.confidenceLevel)) errors.push('confidenceLevel must be between 1 and 5 when provided.');

  if (input.primaryLimiter && !isPrimaryLimiter(input.primaryLimiter)) {
    errors.push('primaryLimiter is invalid.');
  }
  if (input.nutritionAdherence && !isMacroAdherence(input.nutritionAdherence)) {
    errors.push('nutritionAdherence is invalid.');
  }
  if (input.nutritionBarrier && !NUTRITION_BARRIERS.includes(input.nutritionBarrier)) {
    errors.push('nutritionBarrier is invalid.');
  }
  if (input.coachingFocus && !COACHING_FOCUS.includes(input.coachingFocus)) {
    errors.push('coachingFocus is invalid.');
  }
  if (!Number.isFinite(input.trainingLoadSummary.acwrRatio) || input.trainingLoadSummary.acwrRatio < 0) {
    errors.push('trainingLoadSummary.acwrRatio must be a finite number >= 0.');
  }

  return errors;
}

function inferPrimaryLimiter(input: DailyCoachDebriefInput): PrimaryLimiter {
  if (input.primaryLimiter && input.primaryLimiter !== 'none') return input.primaryLimiter;

  if (input.sleepQuality <= 2) return 'sleep';
  if ((input.stressLevel ?? 3) >= 4) return 'stress';
  if ((input.sorenessLevel ?? 3) >= 4) return 'soreness';
  if (input.nutritionAdherence === 'Missed It') return 'nutrition';

  return 'none';
}

function resolveReadinessBand(input: DailyCoachDebriefInput): DailyReadinessBand {
  const { acwrStatus } = input.trainingLoadSummary;
  const lowSleep = input.sleepQuality <= 2;
  const lowReadiness = input.readiness <= 2;
  const highStress = (input.stressLevel ?? 3) >= 4;
  const lowConfidence = (input.confidenceLevel ?? 3) <= 2;

  if (acwrStatus === 'redline' || lowSleep || lowReadiness) return 'recover';
  if (acwrStatus === 'caution' || input.readiness === 3 || input.sleepQuality === 3 || highStress || lowConfidence) {
    return 'build';
  }
  return 'push';
}

function buildRiskFlags(input: DailyCoachDebriefInput, limiter: PrimaryLimiter): string[] {
  const flags: string[] = [];

  if (input.trainingLoadSummary.acwrStatus === 'redline') flags.push('acwr_redline');
  else if (input.trainingLoadSummary.acwrStatus === 'caution') flags.push('acwr_caution');

  if (input.sleepQuality <= 2) flags.push('low_sleep');
  if (input.readiness <= 2) flags.push('low_readiness');
  if ((input.stressLevel ?? 3) >= 4) flags.push('high_stress');
  if ((input.sorenessLevel ?? 3) >= 4) flags.push('high_soreness');
  if (input.nutritionAdherence === 'Missed It') flags.push('fuel_miss');
  if (input.context.isOnActiveCut) flags.push('active_cut');
  if (limiter === 'time') flags.push('time_constrained');

  return flags;
}

function buildHeadline(readinessBand: DailyReadinessBand): string {
  if (readinessBand === 'push') return 'High-readiness day. You can drive quality progression.';
  if (readinessBand === 'build') return 'Moderate-readiness day. Build quality without overspending recovery.';
  return 'Recovery-priority day. Protect long-term adaptation before adding load.';
}

function buildReasoning(input: DailyCoachDebriefInput, band: DailyReadinessBand, limiter: PrimaryLimiter): string {
  const phaseLabel = input.context.phase.replace(/-/g, ' ');
  const loadText = `ACWR ${input.trainingLoadSummary.acwrRatio.toFixed(2)} (${input.trainingLoadSummary.acwrStatus})`;
  const limiterText = limiter === 'none' ? 'no dominant limiter reported' : `primary limiter: ${limiter}`;
  const confidenceText = input.confidenceLevel != null ? `confidence ${input.confidenceLevel}/5` : 'confidence not logged';

  if (band === 'recover') {
    return `Signals are compressed for performance today (${loadText}, sleep ${input.sleepQuality}/5, readiness ${input.readiness}/5). In ${phaseLabel}, recovery control matters most right now (${limiterText}; ${confidenceText}).`;
  }
  if (band === 'build') {
    return `You have enough capacity to train with control (${loadText}) but not ideal margin for reckless intensity. In ${phaseLabel}, execute clean reps and protect recovery drivers (${limiterText}; ${confidenceText}).`;
  }
  return `Readiness markers support progression (${loadText}, sleep ${input.sleepQuality}/5, readiness ${input.readiness}/5). In ${phaseLabel}, this is a strong window to push high-value work while keeping technical quality high.`;
}

function buildTrainingAction(input: DailyCoachDebriefInput, band: DailyReadinessBand): DailyCoachActionStep {
  if (band === 'recover') {
    return {
      pillar: 'training',
      priority: 2,
      action: 'Cap session intensity around RPE 5-6 and trim optional volume by 20%.',
      why: 'Lowering intensity today protects adaptation when readiness and load stress are unfavorable.',
    };
  }

  if (band === 'build') {
    return {
      pillar: 'training',
      priority: 2,
      action: 'Complete planned work but keep top sets at technical quality, not grind.',
      why: 'Moderate readiness supports execution work; quality reps beat forced intensity.',
    };
  }

  return {
    pillar: 'training',
    priority: 1,
    action: 'Push your highest-value sets to planned intensity and keep support work disciplined.',
    why: 'This is a favorable readiness window for progression without unnecessary extra fatigue.',
  };
}

function buildRecoveryAction(limiter: PrimaryLimiter, band: DailyReadinessBand): DailyCoachActionStep {
  const recoveryByLimiter: Record<PrimaryLimiter, string> = {
    sleep: 'Protect tonight with an earlier shutdown and strict caffeine cutoff.',
    stress: 'Use a short downshift block (2-5 minutes breathing) before and after training.',
    soreness: 'Add targeted prep on stiff tissues before your first working set.',
    nutrition: 'Pair post-session protein and carbs within 60 minutes to speed recovery.',
    hydration: 'Front-load fluids and include sodium before the hardest effort.',
    time: 'Lock your session start time and remove low-value extras to preserve recovery bandwidth.',
    none: 'Keep your normal recovery anchors: sleep window, hydration, and cooldown.',
  };

  return {
    pillar: 'recovery',
    priority: band === 'recover' ? 1 : 2,
    action: recoveryByLimiter[limiter],
    why: 'Recovery consistency determines whether today creates adaptation or just fatigue.',
  };
}

function buildNutritionAction(input: DailyCoachDebriefInput): DailyCoachActionStep {
  if (input.nutritionAdherence === 'Missed It') {
    const barrierMap: Record<string, string> = {
      appetite: 'Use liquid calories/protein to hit minimum intake without large meals.',
      timing: 'Pre-plan two fixed fueling windows around training.',
      cravings: 'Anchor each meal with protein first, then add carbs by plan.',
      prep: 'Pick two repeatable meals and prep them once today.',
      social: 'Set a simple plate rule before events: protein first, carbs second.',
      none: 'Rebuild with one structured meal and one planned snack today.',
    };

    return {
      pillar: 'nutrition',
      priority: input.trainingLoadSummary.acwrStatus !== 'safe' ? 1 : 2,
      action: barrierMap[input.nutritionBarrier ?? 'none'],
      why: 'Fuel misses under load increase recovery debt and reduce training quality.',
    };
  }

  if (input.nutritionAdherence === 'Close Enough') {
    return {
      pillar: 'nutrition',
      priority: 3,
      action: 'Tighten one gap today: hit protein floor and hydrate early in the day.',
      why: 'Small consistency gains compound quickly when training volume is stable.',
    };
  }

  return {
    pillar: 'nutrition',
    priority: 3,
    action: 'Maintain current fueling execution and keep meal timing consistent around training.',
    why: 'Stable fueling supports predictable session output and next-day readiness.',
  };
}

function isSevere(flags: string[]): boolean {
  return flags.includes('acwr_redline') || (flags.includes('low_sleep') && flags.includes('low_readiness'));
}

function chooseEducation(
  limiter: PrimaryLimiter,
  previous: DailyCoachDebriefInput['previousDebrief'],
  flags: string[],
): EducationEntry {
  const pool = EDUCATION_LIBRARY[limiter] ?? EDUCATION_LIBRARY.none;
  const previousTopic = previous?.education_topic ?? null;
  const previousFlags = previous?.risk_flags ?? [];
  const sameLimiter = previous?.primary_limiter === limiter;
  const allowRepeat = isSevere(flags) && isSevere(previousFlags ?? []) && sameLimiter;

  if (allowRepeat) {
    return pool[0];
  }

  const alternate = pool.find((entry) => entry.id !== previousTopic);
  return alternate ?? pool[0];
}

export function generateDailyCoachDebrief(rawInput: DailyCoachDebriefInput): DailyCoachDebrief {
  const errors = validateDailyCoachDebriefInput(rawInput);
  if (errors.length > 0) {
    throw new Error(`Invalid daily coaching input: ${errors.join(' ')}`);
  }

  const input: DailyCoachDebriefInput = {
    ...rawInput,
    sleepQuality: clamp(Math.round(rawInput.sleepQuality), 1, 5),
    readiness: clamp(Math.round(rawInput.readiness), 1, 5),
    stressLevel: rawInput.stressLevel == null ? null : clamp(Math.round(rawInput.stressLevel), 1, 5),
    sorenessLevel: rawInput.sorenessLevel == null ? null : clamp(Math.round(rawInput.sorenessLevel), 1, 5),
    confidenceLevel: rawInput.confidenceLevel == null ? null : clamp(Math.round(rawInput.confidenceLevel), 1, 5),
  };

  const limiter = inferPrimaryLimiter(input);
  const band = resolveReadinessBand(input);
  const riskFlags = buildRiskFlags(input, limiter);

  const training = buildTrainingAction(input, band);
  const recovery = buildRecoveryAction(limiter, band);
  const nutrition = buildNutritionAction(input);

  const actionSteps = [training, recovery, nutrition]
    .sort((a, b) => a.priority - b.priority)
    .map((step, index) => ({ ...step, priority: (index + 1) as 1 | 2 | 3 }));

  const selectedEducation = chooseEducation(limiter, input.previousDebrief, riskFlags);

  // Respect explicit coaching focus by nudging that pillar up one slot.
  if (input.coachingFocus) {
    const focusMap: Record<CoachingFocus, DailyCoachActionStep['pillar']> = {
      recovery: 'recovery',
      execution: 'training',
      consistency: 'recovery',
      nutrition: 'nutrition',
    };
    const targetPillar = focusMap[input.coachingFocus];
    const targetIndex = actionSteps.findIndex((step) => step.pillar === targetPillar);
    if (targetIndex > 0) {
      const [step] = actionSteps.splice(targetIndex, 1);
      actionSteps.unshift(step);
      actionSteps.forEach((entry, idx) => {
        entry.priority = (idx + 1) as 1 | 2 | 3;
      });
    }
  }

  return {
    readiness_band: band,
    headline: buildHeadline(band),
    reasoning: buildReasoning(input, band, limiter),
    action_steps: actionSteps,
    education_title: selectedEducation.title,
    education_topic: selectedEducation.id,
    teaching_snippet: selectedEducation.teaching,
    today_application: selectedEducation.application,
    risk_flags: riskFlags,
    acwr_status: input.trainingLoadSummary.acwrStatus,
    generated_at: new Date().toISOString(),
    primary_limiter: limiter,
  };
}
