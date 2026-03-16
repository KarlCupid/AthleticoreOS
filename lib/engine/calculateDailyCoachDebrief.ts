import type {
  CoachingFocus,
  DailyCoachActionStep,
  DailyCoachDebrief,
  DailyCoachDebriefInput,
  DailyReadinessBand,
  MacroAdherenceStatus,
  PrimaryLimiter,
} from './types.ts';

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
      teaching: 'Bad sleep can hurt coordination and make training feel harder.',
      application: 'Keep intensity moderate today and go to bed 25 minutes earlier tonight.',
    },
    {
      id: 'sleep_anchor',
      title: 'Sleep Anchor Habit',
      teaching: 'A steady wake time helps recovery more than sleeping in.',
      application: 'Keep wake time within 30 minutes and stop caffeine 8 hours before bed.',
    },
  ],
  stress: [
    {
      id: 'stress_load_split',
      title: 'Stress Load Split',
      teaching: 'Life stress and training stress add up.',
      application: 'Do your main work, then cut optional volume by 15-20%.',
    },
    {
      id: 'stress_breathing_bracket',
      title: 'Breathing Bracket',
      teaching: 'Calming down before and after training can improve session quality.',
      application: 'Take 4 slow breaths before top sets and 2 minutes of easy nose breathing after.',
    },
  ],
  soreness: [
    {
      id: 'soreness_range_quality',
      title: 'Range Before Load',
      teaching: 'If you are sore, skipping warm-up can lower your output.',
      application: 'Spend 8-10 minutes warming up stiff areas before your first work set.',
    },
    {
      id: 'soreness_volume_gate',
      title: 'Volume Gate',
      teaching: 'When soreness is high, keep key work and lower extra volume.',
      application: 'Do warmups and main work, then skip the last accessory set if form drops.',
    },
  ],
  nutrition: [
    {
      id: 'nutrition_timing_window',
      title: 'Fuel Timing Window',
      teaching: 'Training feels harder when carbs and fluids are delayed.',
      application: 'Have a quick carb snack 60-90 minutes before training and drink before warmup.',
    },
    {
      id: 'nutrition_floor_strategy',
      title: 'Minimum Fuel Floor',
      teaching: 'Hitting a consistent minimum intake beats occasional perfect days.',
      application: 'Hit your protein goal and include one planned carb feeding before your hardest work.',
    },
  ],
  hydration: [
    {
      id: 'hydration_performance_drop',
      title: 'Hydration and Output',
      teaching: 'Even mild dehydration can lower repeat effort and make work feel harder.',
      application: 'Drink early in the day and add sodium to one bottle before training.',
    },
    {
      id: 'hydration_schedule_lock',
      title: 'Hydration Schedule Lock',
      teaching: 'Planned drink times work better than waiting for thirst.',
      application: 'Set 3 water checkpoints before the afternoon.',
    },
  ],
  time: [
    {
      id: 'time_priority_filter',
      title: 'Priority Filter',
      teaching: 'When time is short, do the highest-value work first.',
      application: 'Finish your main lift and first accessory, then do extras only if time remains.',
    },
    {
      id: 'time_density_upgrade',
      title: 'Density Upgrade',
      teaching: 'Shorter rest on easier sets can save time and keep quality.',
      application: 'Use a timer and cut easy-set rest by 15-20 seconds today.',
    },
  ],
  none: [
    {
      id: 'consistency_compound',
      title: 'Consistency Compound',
      teaching: 'Good days in a row beat one perfect hero day.',
      application: 'Stick to the plan, keep form sharp, and finish your key recovery actions.',
    },
    {
      id: 'load_progression_rule',
      title: 'Load Progression Rule',
      teaching: 'Progress comes fastest when hard work and recovery stay in balance.',
      application: 'Push key sets and keep one rep in reserve on support work.',
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
  if (readinessBand === 'push') return 'You are in a good spot today. Train hard with good form.';
  if (readinessBand === 'build') return 'Solid day. Train with control and keep quality high.';
  return 'Recovery day. Lower stress now so you can train better tomorrow.';
}

function buildReasoning(input: DailyCoachDebriefInput, band: DailyReadinessBand, limiter: PrimaryLimiter): string {
  const phaseLabel = input.context.phase.replace(/-/g, ' ');
  const loadText = input.trainingLoadSummary.acwrStatus === 'safe'
    ? 'training load looks normal'
    : input.trainingLoadSummary.acwrStatus === 'caution'
      ? 'training load is a bit high'
      : 'training load is very high';
  const limiterText = limiter === 'none' ? 'no clear main limiter' : `main limiter: ${limiter}`;
  const confidenceText = input.confidenceLevel != null ? `confidence ${input.confidenceLevel}/5` : 'confidence not logged';

  if (band === 'recover') {
    return `Today is a lower-readiness day: ${loadText}, sleep ${input.sleepQuality}/5, readiness ${input.readiness}/5. In ${phaseLabel}, recover first (${limiterText}; ${confidenceText}).`;
  }
  if (band === 'build') {
    return `You can train today, but keep it controlled: ${loadText}. In ${phaseLabel}, keep form clean and protect recovery (${limiterText}; ${confidenceText}).`;
  }
  return `You look ready to push: ${loadText}, sleep ${input.sleepQuality}/5, readiness ${input.readiness}/5. In ${phaseLabel}, push key work and keep form sharp.`;
}

function buildTrainingAction(_input: DailyCoachDebriefInput, band: DailyReadinessBand): DailyCoachActionStep {
  if (band === 'recover') {
    return {
      pillar: 'training',
      priority: 2,
      action: 'Keep session intensity around RPE 5-6 and cut optional volume by 20%.',
      why: 'This lowers stress and helps you recover.',
    };
  }

  if (band === 'build') {
    return {
      pillar: 'training',
      priority: 2,
      action: 'Do planned work, but stop sets when form starts to drop.',
      why: 'Good reps help you improve without digging a deep fatigue hole.',
    };
  }

  return {
    pillar: 'training',
    priority: 1,
    action: 'Push your key sets to plan and keep support work clean.',
    why: 'You have good readiness today, so hard quality work makes sense.',
  };
}

function buildRecoveryAction(limiter: PrimaryLimiter, band: DailyReadinessBand): DailyCoachActionStep {
  const recoveryByLimiter: Record<PrimaryLimiter, string> = {
    sleep: 'Go to bed earlier tonight and stop caffeine 8 hours before bed.',
    stress: 'Do a short reset (2-5 minutes breathing) before and after training.',
    soreness: 'Warm up stiff areas before your first work set.',
    nutrition: 'Have protein and carbs within 60 minutes after training.',
    hydration: 'Drink fluids early and add sodium before your hardest work.',
    time: 'Set a start time and cut low-value extras.',
    none: 'Keep your basics: sleep window, hydration, and cooldown.',
  };

  return {
    pillar: 'recovery',
    priority: band === 'recover' ? 1 : 2,
    action: recoveryByLimiter[limiter],
    why: 'Recovery habits keep performance steady from day to day.',
  };
}

function buildNutritionAction(input: DailyCoachDebriefInput): DailyCoachActionStep {
  if (input.nutritionAdherence === 'Missed It') {
    const barrierMap: Record<string, string> = {
      appetite: 'Use shakes or easy foods to hit minimum calories and protein.',
      timing: 'Plan two set fueling times around training.',
      cravings: 'Start meals with protein, then add carbs.',
      prep: 'Prep two simple meals today.',
      social: 'Use a simple plate rule at events: protein first, carbs second.',
      none: 'Reset with one solid meal and one planned snack today.',
    };

    return {
      pillar: 'nutrition',
      priority: input.trainingLoadSummary.acwrStatus !== 'safe' ? 1 : 2,
      action: barrierMap[input.nutritionBarrier ?? 'none'],
      why: 'Missing fuel can hurt both recovery and training quality.',
    };
  }

  if (input.nutritionAdherence === 'Close Enough') {
    return {
      pillar: 'nutrition',
      priority: 3,
      action: 'Fix one small gap: hit protein and hydrate early.',
      why: 'Small daily wins add up fast.',
    };
  }

  return {
    pillar: 'nutrition',
    priority: 3,
    action: 'Keep the same fueling plan and consistent meal timing around training.',
    why: 'Consistent fueling keeps energy and recovery steady.',
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
