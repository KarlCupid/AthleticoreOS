import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import type {
  DescriptionTemplate,
  DescriptionToneVariant,
  GenerateWorkoutDescriptionOptions,
  GeneratedWorkout,
  PrescriptionPayload,
  WorkoutDescription,
} from './types.ts';

const fallbackTone: DescriptionToneVariant = 'coach_like';

function firstMainPayload(workout: GeneratedWorkout): PrescriptionPayload | null {
  return workout.blocks
    .filter((block) => block.kind === 'main')
    .flatMap((block) => block.exercises.map((exercise) => exercise.prescription.payload))[0] ?? null;
}

function byTemplateId(templates: readonly DescriptionTemplate[], id: string): DescriptionTemplate | null {
  return templates.find((template) => template.id === id || template.descriptionTemplateId === id) ?? null;
}

function scoreTemplate(template: DescriptionTemplate, workout: GeneratedWorkout): number {
  let score = 0;
  if (template.appliesToEntityType === 'session_template' && template.appliesToEntityId === workout.templateId) score += 50;
  if (template.appliesToEntityType === 'goal' && template.appliesToEntityId === workout.goalId) score += 40;
  if (template.appliesToEntityType === 'workout_type' && template.appliesToEntityId === workout.workoutTypeId) score += 30;
  if (template.appliesToGoalIds?.includes(workout.goalId)) score += 20;
  if (template.appliesToEntityType === 'program') score += 5;
  return score;
}

function selectTemplate(
  workout: GeneratedWorkout,
  options: GenerateWorkoutDescriptionOptions,
): DescriptionTemplate {
  const templates = options.templates ?? workoutIntelligenceCatalog.descriptionTemplates;
  if (options.descriptionTemplateId) {
    const exact = byTemplateId(templates, options.descriptionTemplateId);
    if (exact) return exact;
  }

  return templates
    .map((template, index) => ({ template, score: scoreTemplate(template, workout), index }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.template
    ?? templates[0]!;
}

function payloadSpecificEffort(workout: GeneratedWorkout, template: DescriptionTemplate): string {
  const payload = firstMainPayload(workout);
  if (!payload) return template.effortExplanation ?? 'Keep the session easy enough to complete safely and record symptoms before progressing.';

  if (payload.kind === 'resistance') {
    return 'Use a load that leaves about two good reps in reserve. Rest long enough that the next set is strong, not rushed.';
  }
  if (payload.kind === 'cardio') {
    return 'Stay at a conversational effort. You should be able to speak in short sentences without gasping.';
  }
  if (payload.kind === 'mobility' || payload.kind === 'flexibility') {
    return 'Work in a pain-free range. The goal is control and usable range, not forcing depth.';
  }
  if (payload.kind === 'conditioning' || payload.kind === 'interval') {
    return template.effortExplanation ?? 'Work hard enough to challenge breathing while keeping every interval repeatable and technically clean.';
  }
  if (payload.kind === 'power') {
    return 'Keep reps explosive and low fatigue. Rest fully so every effort is fast, clean, and worth counting.';
  }
  if (payload.kind === 'balance') {
    return template.effortExplanation ?? 'Keep attention high and fatigue low. Use support before balance becomes a survival task.';
  }
  return template.effortExplanation ?? 'Keep the work easy enough that recovery improves instead of becoming another stressor.';
}

function toneIntro(template: DescriptionTemplate, workout: GeneratedWorkout, tone: DescriptionToneVariant): string {
  const base = `${template.plainLanguageSummary ?? template.summaryTemplate} ${payloadSpecificEffort(workout, template)}`;
  switch (tone) {
    case 'beginner_friendly':
      return `${template.sessionIntent ?? 'Train the session safely.'} Keep it simple: ${base}`;
    case 'clinical':
      return `Target: ${template.sessionIntent ?? 'complete the planned dose'}. Monitor pain, readiness, breathing, and movement quality throughout. ${base}`;
    case 'motivational':
      return `${template.sessionIntent ?? 'Build the session one clean rep at a time.'} Today is about earning the next step with repeatable work. ${base}`;
    case 'minimal':
      return `${template.sessionIntent ?? 'Complete the session safely.'} ${template.plainLanguageSummary ?? template.summaryTemplate}`;
    case 'detailed':
      return `${template.sessionIntent ?? 'Complete the planned session.'} ${template.coachExplanation ?? template.summaryTemplate} ${base}`;
    case 'athletic':
      return `${template.sessionIntent ?? 'Train the target quality.'} Keep the output sharp, respect the cutoffs, and make the work transfer. ${base}`;
    case 'rehab_informed':
      return `${template.sessionIntent ?? 'Train within a safe window.'} Symptoms, range, and control set the ceiling today. ${base}`;
    case 'data_driven':
      return `${template.sessionIntent ?? 'Train and capture useful signals.'} Let duration, RPE, pain response, and completion data guide the next recommendation. ${base}`;
    case 'coach_like':
    default:
      return `${template.sessionIntent ?? 'Train the session with intent.'} ${base}`;
  }
}

function toneEffort(base: string, tone: DescriptionToneVariant): string {
  if (tone === 'minimal') return base;
  if (tone === 'clinical') return `${base} Record actual RPE, pain response, and any symptom change.`;
  if (tone === 'motivational') return `${base} Leave the session knowing you could repeat the standard.`;
  if (tone === 'data_driven') return `${base} The next progression depends on the logged result, not on intent.`;
  if (tone === 'rehab_informed') return `${base} Pain-free control matters more than completing an aggressive dose.`;
  return base;
}

function nonEmptyArray(items: string[] | undefined, fallback: string[]): string[] {
  return items?.length ? items : fallback;
}

function nonEmptyText(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

export function generateWorkoutDescription(
  workout: GeneratedWorkout,
  options: GenerateWorkoutDescriptionOptions = {},
): WorkoutDescription {
  const template = selectTemplate(workout, options);
  const toneVariant = options.toneVariant ?? template.toneVariant ?? fallbackTone;
  const effortExplanation = toneEffort(payloadSpecificEffort(workout, template), toneVariant);

  return {
    descriptionTemplateId: template.descriptionTemplateId ?? template.id,
    toneVariant,
    intro: toneIntro(template, workout, toneVariant),
    sessionIntent: nonEmptyText(template.sessionIntent, 'Complete the session with the safest useful dose.'),
    plainLanguageSummary: nonEmptyText(template.plainLanguageSummary, template.summaryTemplate),
    coachExplanation: nonEmptyText(template.coachExplanation, 'This session uses the selected pattern, equipment, and safety filters to match the current training goal.'),
    effortExplanation,
    whyThisMatters: nonEmptyText(template.whyThisMatters, 'The session should support the next training decision without ignoring safety signals.'),
    howItShouldFeel: nonEmptyText(template.howItShouldFeel, 'Controlled, repeatable, and appropriate for today state.'),
    safetyNotes: nonEmptyArray(template.safetyNotes, ['Stop if pain, dizziness, or symptoms change how you move.']),
    successCriteria: nonEmptyArray(template.successCriteria, workout.successCriteria),
    scalingDown: nonEmptyText(template.scalingDown, 'Reduce volume, range, or intensity while preserving the safest version of the movement pattern.'),
    scalingUp: nonEmptyText(template.scalingUp, 'Progress one variable only after completion, effort, and symptoms are stable.'),
    formFocus: nonEmptyArray(template.formFocus, ['Controlled setup', 'Stable position', 'Repeatable pace']),
    breathingFocus: nonEmptyText(template.breathingFocus, 'Use breathing to keep effort controlled and recover between exposures.'),
    commonMistakes: nonEmptyArray(template.commonMistakes, ['Progressing before the current dose is repeatable.']),
    recoveryExpectation: nonEmptyText(template.recoveryExpectation, 'Recovery should match the planned intensity and should not worsen safety signals.'),
    completionMessage: nonEmptyText(template.completionMessage, 'Session logged. Use the result to guide the next step.'),
    nextSessionNote: nonEmptyText(template.nextSessionNote, 'Repeat or progress based on readiness, symptoms, and completion quality.'),
  };
}
