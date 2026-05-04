import fs from 'node:fs';
import path from 'node:path';
import {
  generatePreviewWorkout,
} from './workoutProgrammingService.ts';
import { workoutProgrammingServiceFixtures } from './workoutProgrammingServiceFixtures.ts';
import {
  validateDescriptionTemplatesCopyQuality,
  validateWorkoutDescriptionCopyQuality,
} from './workoutDescriptionService.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import type {
  DescriptionToneVariant,
  GeneratedWorkout,
  RuntimeValidationResult,
  WorkoutDescription,
} from './types.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

function issueSummary(result: RuntimeValidationResult): string {
  return [...result.errors, ...result.warnings]
    .map((issue) => `${issue.recordType}.${issue.field}: ${issue.message}`)
    .join('\n');
}

function requireDescription(workout: GeneratedWorkout): WorkoutDescription {
  if (!workout.description) {
    throw new Error(`Generated workout ${workout.templateId} did not include a description.`);
  }
  return workout.description;
}

function allText(description: WorkoutDescription): string {
  return [
    description.intro,
    description.sessionIntent,
    description.plainLanguageSummary,
    description.coachExplanation,
    description.effortExplanation,
    description.whyThisMatters,
    description.howItShouldFeel,
    description.scalingDown,
    description.scalingUp,
    description.breathingFocus,
    description.recoveryExpectation,
    description.completionMessage,
    description.nextSessionNote,
    ...description.safetyNotes,
    ...description.successCriteria,
    ...description.formFocus,
    ...description.commonMistakes,
  ].join(' ');
}

function hasUnsafeCopy(description: WorkoutDescription): boolean {
  return /adjust as needed|do what feels right|listen to your body|diagnose|cure|guarantee|no excuses|pain is weakness|redline symptoms|forced shutdown|survival task/i.test(allText(description));
}

async function preview(name: keyof typeof workoutProgrammingServiceFixtures) {
  return generatePreviewWorkout(workoutProgrammingServiceFixtures[name], {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
}

function copyQualityPasses(label: string, description: WorkoutDescription): void {
  const result = validateWorkoutDescriptionCopyQuality(description);
  assert(`${label} copy has no blocking quality issues`, result.errors.length === 0);
  assert(`${label} copy avoids filler, unsupported claims, and fear language`, !hasUnsafeCopy(description));
  assert(`${label} copy explains the next step`, /log|pause|choose|reduce|repeat|progress|review|use|start|return|keep|add|switch|seek/i.test(`${description.completionMessage} ${description.nextSessionNote}`));
}

async function run() {
  console.log('\n-- workout programming copy and accessibility --');

  const templateQuality = validateDescriptionTemplatesCopyQuality(workoutIntelligenceCatalog.descriptionTemplates);
  assert(
    templateQuality.valid ? 'description template copy quality validates' : issueSummary(templateQuality),
    templateQuality.valid,
  );

  const beginner = requireDescription(await preview('beginnerBodyweightStrength'));
  const athletic = requireDescription(await preview('power'));
  const rehab = requireDescription(await preview('mobility'));
  const recovery = requireDescription(await preview('recovery'));
  const highReadiness = requireDescription(await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    readinessBand: 'green',
    preferredToneVariant: 'coach_like',
  }, { persistGeneratedWorkout: false, contentReviewMode: 'preview' }));
  const lowReadinessWorkout = await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    readinessBand: 'orange',
    preferredToneVariant: 'beginner_friendly',
  }, { persistGeneratedWorkout: false, contentReviewMode: 'preview' });
  const lowReadiness = requireDescription(lowReadinessWorkout);
  const blockedWorkout = await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    safetyFlags: ['red_flag_symptoms'],
  }, { persistGeneratedWorkout: false, contentReviewMode: 'preview' });
  const blocked = requireDescription(blockedWorkout);

  copyQualityPasses('beginner-friendly', beginner);
  copyQualityPasses('athletic', athletic);
  copyQualityPasses('rehab-informed', rehab);
  copyQualityPasses('recovery', recovery);
  copyQualityPasses('high-readiness', highReadiness);
  copyQualityPasses('low-readiness', lowReadiness);
  copyQualityPasses('safety-blocked', blocked);

  assert('beginner-friendly tone stays simple and reassuring', beginner.toneVariant === 'beginner_friendly' && beginner.intro.includes('Keep it simple'));
  assert('athletic tone emphasizes output quality', athletic.toneVariant === 'athletic' && /sharp|quality|transfer|crisp/i.test(allText(athletic)));
  assert('rehab-informed tone emphasizes symptoms, range, and control without diagnosis', rehab.toneVariant === 'rehab_informed' && /symptoms|range|control/i.test(allText(rehab)) && !/diagnos/i.test(allText(rehab)));
  assert('recovery copy keeps intensity low and non-alarming', /1-3 out of 10|easy|recovery/i.test(allText(recovery)) && !/panic|danger/i.test(allText(recovery)));
  assert('safety-blocked copy is calm and action-oriented', blockedWorkout.blocked === true && /pause|review|professional guidance|safety/i.test(allText(blocked)) && !/panic|danger|unsafe athlete/i.test(allText(blocked)));
  assert('low readiness copy explains the adjustment', lowReadinessWorkout.decisionTrace?.some((entry) => /readiness|sleep|soreness|fatigue/i.test(entry.reason)) === true);
  assert('tone variants remain meaningfully distinct', new Set<DescriptionToneVariant>([
    beginner.toneVariant,
    athletic.toneVariant,
    rehab.toneVariant,
    recovery.toneVariant,
    highReadiness.toneVariant,
  ]).size >= 5);

  const previewCard = read('src/components/workout/GeneratedWorkoutPreviewCard.tsx');
  const betaCard = read('src/components/workout/GeneratedWorkoutBetaSessionCard.tsx');
  const betaContainer = read('src/components/workout/GeneratedWorkoutBetaContainer.tsx');

  assert('preview UI exposes screen-reader labels and section headings', [
    'accessibilityLabel={`${label}: ${value}',
    'accessibilityRole="header"',
    'Effort ${exercise.prescription.targetRpe}/10',
    'This generated session is blocked. Use the safety notes',
  ].every((needle) => previewCard.includes(needle)));

  assert('beta UI actions have descriptive accessibility labels', [
    'accessibilityLabel={loading ? \'Generating workout\'',
    'accessibilityLabel="Clear generated workout"',
    'accessibilityLabel={workout.blocked ? \'Workout blocked by safety review\'',
    'accessibilityLabel={allExercisesComplete ? \'Clear all completed exercises\'',
    'accessibilityLabel={`${completed ? \'Mark incomplete\' : \'Mark complete\'}: ${exercise.name}`}',
    'Session effort rating',
  ].every((needle) => betaCard.includes(needle)));

  assert('workout screen generated sections are labeled for assistive tech', [
    'accessibilityLabel="Generated workout beta flow"',
    'accessibilityLabel="Generated workout preview section"',
  ].every((needle) => betaContainer.includes(needle)));
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
