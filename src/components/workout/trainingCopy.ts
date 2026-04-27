import type { ExerciseVM } from './types';

export interface TrainingCoachCopy {
  prescription: string;
  effort: string;
  rest: string | null;
  focus: string[];
  feel: string | null;
  mistake: string | null;
}

export function formatDisplayLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatSecondsForCoach(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;

  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  if (minutes <= 0) return `${rounded}s`;
  if (remainder === 0) return `${minutes} min`;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatRestForCoach(seconds: number | null | undefined, prefix = 'Rest'): string | null {
  const formatted = formatSecondsForCoach(seconds);
  return formatted ? `${prefix} ${formatted}` : null;
}

export function formatRpeForCoach(rpe: number | null | undefined): string {
  if (rpe == null || !Number.isFinite(rpe) || rpe <= 0) {
    return 'Move with intent';
  }

  if (rpe <= 5) return `Easy (${rpe}/10)`;
  if (rpe <= 7) return `Controlled (${rpe}/10)`;
  if (rpe <= 8) return `Hard, clean reps (${rpe}/10)`;
  return `Very hard, no sloppy reps (${rpe}/10)`;
}

function cleanCue(cue: string): string {
  const trimmed = cue.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function compactSetScheme(exercise: ExerciseVM): string {
  return exercise.setScheme
    ?? `${exercise.targetSets} x ${exercise.targetReps}${exercise.targetRPE > 0 ? ` @ RPE ${exercise.targetRPE}` : ''}`;
}

function buildDefaultFocus(exercise: ExerciseVM): string[] {
  const section = exercise.sectionTemplate;
  const dose = exercise.modalityDose;

  if (dose?.sprint) return ['Explode, then stay relaxed', 'Stop if speed drops'];
  if (dose?.agility) return ['Cut clean and balanced', 'Eyes up before each change'];
  if (dose?.plyometric) return ['Jump fast, land quiet', 'Full reset between reps'];
  if (dose?.aerobic) return ['Breathe steady', 'Hold the same pace'];
  if (dose?.interval) return ['Attack the work', 'Recover on purpose'];
  if (dose?.circuit) return ['Smooth transitions', 'Keep every rep clean'];
  if (dose?.recovery || section === 'cooldown') return ['Breathe slow', 'Leave fresher than you started'];
  if (section === 'activation') return ['Move crisp', 'Wake the body up'];
  if (section === 'power') return ['Fast reps only', 'Rest before speed fades'];

  return ['Own the setup', 'Finish every rep clean'];
}

export function buildTrainingCoachCopy(exercise: ExerciseVM): TrainingCoachCopy {
  const dose = exercise.modalityDose;
  const sprintDose = dose?.sprint;
  const agilityDose = dose?.agility;
  const plyometricDose = dose?.plyometric;
  const aerobicDose = dose?.aerobic;
  const intervalDose = dose?.interval;
  const circuitDose = dose?.circuit;
  const recoveryDose = dose?.recovery;
  const timedWork = exercise.timedWork ?? exercise.setPrescription[0]?.timedWork ?? null;
  const circuit = exercise.circuitRound ?? exercise.setPrescription[0]?.circuitRound ?? null;

  let prescription = compactSetScheme(exercise);
  let effort = formatRpeForCoach(exercise.targetRPE);
  let rest = formatRestForCoach(exercise.restSeconds);
  let feel: string | null = 'Last reps hard, still clean.';
  let mistake: string | null = null;

  if (sprintDose) {
    const repDistance = sprintDose.repDistanceMeters;
    const totalReps = Math.max(1, Math.ceil(sprintDose.totalMeters / repDistance));
    prescription = `${totalReps} x ${repDistance} m`;
    effort = sprintDose.intensityPercent >= 95
      ? `Near max (${sprintDose.intensityPercent}% speed)`
      : `Fast (${sprintDose.intensityPercent}% speed)`;
    rest = formatRestForCoach(sprintDose.restSeconds, 'Walk/rest');
    feel = 'Fast and springy, not strained.';
    mistake = 'Do not turn speed work into conditioning.';
  } else if (agilityDose) {
    prescription = `${agilityDose.reps} reps - ${agilityDose.drillDistanceMeters} m, ${agilityDose.directionChanges} cuts`;
    effort = agilityDose.reactionComponent ? 'React fast, stay clean' : 'Fast feet, clean cuts';
    rest = formatRestForCoach(exercise.restSeconds);
    feel = 'Sharp feet, balanced body.';
    mistake = 'Do not chase time with sloppy footwork.';
  } else if (plyometricDose) {
    const sets = Math.max(1, exercise.targetSets);
    const contactsPerSet = Math.max(1, Math.round(plyometricDose.groundContacts / sets));
    prescription = `${sets} x ${contactsPerSet} contacts`;
    effort = 'Explosive, full reset';
    rest = formatRestForCoach(exercise.restSeconds, 'Full rest') ?? 'Full rest between sets';
    feel = 'Powerful jumps, quiet landings.';
    mistake = 'Do not let this become conditioning.';
  } else if (aerobicDose) {
    prescription = `${aerobicDose.durationMin} min steady`;
    effort = aerobicDose.pace ? `${aerobicDose.pace} - RPE ${aerobicDose.targetRPE}/10` : `RPE ${aerobicDose.targetRPE}/10 - repeatable pace`;
    rest = null;
    feel = 'Working, but in control.';
    mistake = 'Do not start faster than you can finish.';
  } else if (intervalDose) {
    prescription = `${intervalDose.rounds} rounds: ${intervalDose.workSeconds}s work / ${intervalDose.restSeconds}s rest`;
    const intensityLabels: Record<string, string> = {
      threshold: 'Strong (7/10)',
      vo2: 'Hard (8/10)',
      all_out: 'Very hard (9/10)',
      sport_round: 'Fight pace (8/10)',
    };
    effort = intensityLabels[intervalDose.targetIntensity] ?? formatDisplayLabel(intervalDose.targetIntensity);
    rest = formatRestForCoach(intervalDose.restSeconds);
    feel = 'Hard, but repeatable.';
    mistake = 'Do not waste the rest window.';
  } else if (circuitDose || circuit) {
    const rounds = circuit?.roundCount ?? circuitDose?.rounds ?? exercise.targetSets;
    const movementCount = circuit?.movements.length ?? circuitDose?.movementCount ?? 1;
    prescription = `${rounds} rounds - ${movementCount} movements`;
    effort = circuitDose?.densityTarget ?? 'Steady pressure, clean reps';
    rest = formatRestForCoach(circuit?.restBetweenRoundsSec ?? circuitDose?.restSeconds);
    feel = 'Smooth and repeatable.';
    mistake = 'Do not rush transitions into messy reps.';
  } else if (recoveryDose) {
    prescription = `${recoveryDose.durationMin} min easy flow`;
    effort = 'Easy. No strain.';
    rest = null;
    feel = 'Easier with each minute.';
    mistake = 'Do not force range.';
  } else if (timedWork) {
    if (timedWork.format === 'emom') {
      prescription = `${timedWork.roundCount ?? timedWork.targetRounds ?? exercise.targetSets} min EMOM`;
      effort = 'Finish early, breathe, repeat';
      rest = 'Rest is what remains each minute';
      feel = 'Crisp every minute.';
    } else if (timedWork.format === 'tabata') {
      prescription = `${timedWork.roundCount ?? 8} rounds: ${timedWork.workIntervalSec ?? 20}s on / ${timedWork.restIntervalSec ?? 10}s off`;
      effort = 'Hard bursts, clean reps';
      rest = `Rest ${formatSecondsForCoach(timedWork.restIntervalSec ?? 10)}`;
      feel = 'Short, sharp, controlled.';
    } else if (timedWork.format === 'amrap') {
      prescription = `${formatSecondsForCoach(timedWork.totalDurationSec)} AMRAP`;
      effort = 'Sustainable push';
      rest = 'Break before form breaks';
      feel = 'Busy, not frantic.';
    } else if (timedWork.format === 'for_time') {
      prescription = `For time${timedWork.totalDurationSec > 0 ? ` - cap ${formatSecondsForCoach(timedWork.totalDurationSec)}` : ''}`;
      effort = 'Move fast, stay in control';
      rest = 'Break as needed';
      feel = 'Urgent, not sloppy.';
    } else {
      prescription = `${formatSecondsForCoach(timedWork.totalDurationSec)} work`;
      effort = 'Hold quality the whole interval';
      rest = formatRestForCoach(exercise.restSeconds);
      feel = 'Steady to the end.';
    }
  }

  const focus = exercise.coachingCues.length > 0
    ? exercise.coachingCues.slice(0, 2).map(cleanCue)
    : buildDefaultFocus(exercise);

  return {
    prescription,
    effort,
    rest,
    focus,
    feel,
    mistake,
  };
}
