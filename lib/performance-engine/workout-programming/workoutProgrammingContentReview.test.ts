import {
  filterCatalogForContentReview,
  getUnsafeOrUnreviewedContentReport,
  listContentNeedingReview,
  markContentApproved,
  markContentRejected,
  prepareWorkoutProgrammingContentForMode,
  validateContentReviewForProduction,
} from './contentReview.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  Exercise,
  PrescriptionTemplate,
  ProgressionRule,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
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

function catalogWithExercise(exercise: Exercise): WorkoutProgrammingCatalog {
  return {
    ...workoutProgrammingCatalog,
    exercises: workoutProgrammingCatalog.exercises.map((candidate) => (
      candidate.id === exercise.id ? exercise : candidate
    )),
  };
}

function catalogWithPrescription(template: PrescriptionTemplate): WorkoutProgrammingCatalog {
  return {
    ...workoutProgrammingCatalog,
    prescriptionTemplates: workoutProgrammingCatalog.prescriptionTemplates.map((candidate) => (
      candidate.id === template.id ? template : candidate
    )),
  };
}

function intelligenceWithProgressionRule(rule: ProgressionRule): WorkoutIntelligenceCatalog {
  return {
    ...workoutIntelligenceCatalog,
    progressionRules: workoutIntelligenceCatalog.progressionRules.map((candidate) => (
      candidate.id === rule.id ? rule : candidate
    )),
  };
}

async function run() {
  console.log('\n-- workout programming content review --');

  const approved = prepareWorkoutProgrammingContentForMode(workoutProgrammingCatalog, workoutIntelligenceCatalog, { mode: 'production' });
  assert(
    'approved seeded content can be used in production',
    approved.catalog.exercises.some((exercise) => exercise.id === 'goblet_squat')
      && approved.intelligence.descriptionTemplates.length === workoutIntelligenceCatalog.descriptionTemplates.length
      && approved.warnings.length === 0,
  );

  const gobletSquat = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'goblet_squat')!;
  const rejectedExercise = markContentRejected(gobletSquat, 'coach-reviewer', ['Block until revised.']);
  const rejectedGate = filterCatalogForContentReview(catalogWithExercise(rejectedExercise), { mode: 'production' });
  assert(
    'rejected content is excluded from production selection',
    !rejectedGate.catalog.exercises.some((exercise) => exercise.id === 'goblet_squat')
      && rejectedGate.excluded.some((issue) => issue.id === 'goblet_squat' && issue.field === 'reviewStatus'),
  );

  const draftExercise: Exercise = {
    ...gobletSquat,
    reviewStatus: 'draft',
    rolloutEligibility: 'dev_only',
  };
  const draftProductionGate = filterCatalogForContentReview(catalogWithExercise(draftExercise), { mode: 'production' });
  assert(
    'draft content is excluded from production mode',
    !draftProductionGate.catalog.exercises.some((exercise) => exercise.id === 'goblet_squat')
      && draftProductionGate.excluded.some((issue) => issue.id === 'goblet_squat'),
  );

  const draftPreviewGate = filterCatalogForContentReview(catalogWithExercise(draftExercise), {
    mode: 'preview',
    allowDraftContent: true,
  });
  assert(
    'preview mode can include draft content with warnings',
    draftPreviewGate.catalog.exercises.some((exercise) => exercise.id === 'goblet_squat')
      && draftPreviewGate.warnings.some((issue) => issue.id === 'goblet_squat'),
  );

  const highRiskRule: ProgressionRule = {
    ...workoutIntelligenceCatalog.progressionRules[0],
    reviewStatus: 'approved',
    rolloutEligibility: 'production',
    riskLevel: 'high',
    safetyReviewStatus: 'needs_review',
  };
  const highRiskIssues = validateContentReviewForProduction(highRiskRule, 'ProgressionRule');
  assert(
    'high-risk production rule without safety approval fails review validation',
    highRiskIssues.some((issue) => issue.field === 'safetyReviewStatus' && issue.severity === 'error'),
  );

  const approvedHighRisk = markContentApproved({ ...highRiskRule, safetyReviewStatus: 'approved' }, 'safety-reviewer');
  assert(
    'approved high-risk content can pass production review validation',
    validateContentReviewForProduction(approvedHighRisk, 'ProgressionRule').length === 0,
  );

  const draftPrescription: PrescriptionTemplate = {
    ...workoutProgrammingCatalog.prescriptionTemplates[0],
    reviewStatus: 'needs_review',
    rolloutEligibility: 'preview',
  };
  const reportCatalog = catalogWithPrescription(draftPrescription);
  const reportIntelligence = intelligenceWithProgressionRule(highRiskRule);
  const report = getUnsafeOrUnreviewedContentReport(reportCatalog, reportIntelligence, '2026-05-02T00:00:00.000Z');
  const needsReview = listContentNeedingReview(reportCatalog, reportIntelligence);
  assert(
    'report returns exercises, prescriptions, and rules needing review',
    report.summary.needingReviewCount > 0
      && report.productionBlocking.some((issue) => issue.recordType === 'PrescriptionTemplate')
      && needsReview.some((issue) => issue.recordType === 'ProgressionRule' && issue.field === 'safetyReviewStatus'),
  );
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
