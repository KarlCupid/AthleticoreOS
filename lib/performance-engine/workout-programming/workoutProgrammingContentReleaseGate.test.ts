import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  Exercise,
  PrescriptionTemplate,
  ProgressionRule,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
} from './types.ts';

declare const require: {
  (path: string): any;
};
declare const process: {
  cwd: () => string;
  exit: (code?: number) => never;
};

const {
  buildAuditReport,
  shouldFail,
} = require('../../../scripts/workout-programming-content-utils.js') as {
  buildAuditReport: (projectRoot: string, options?: {
    catalog?: WorkoutProgrammingCatalog;
    intelligence?: WorkoutIntelligenceCatalog;
  }) => any;
  shouldFail: (report: any, args: Record<string, unknown>) => boolean;
};

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

function approvedSafetyStatus(item: { riskLevel?: string; safetyReviewStatus?: string }) {
  return item.riskLevel === 'high' || item.safetyReviewStatus === 'approved' ? 'approved' : 'not_required';
}

function releaseReadyCatalog(): WorkoutProgrammingCatalog {
  const exerciseIds = workoutProgrammingCatalog.exercises.map((exercise) => exercise.id);
  return {
    ...workoutProgrammingCatalog,
    exercises: workoutProgrammingCatalog.exercises.map((exercise): Exercise => {
      const fallbackSubstitution = exerciseIds.find((id) => id !== exercise.id) ?? exercise.id;
      const substitutionExerciseIds = exercise.substitutionExerciseIds && exercise.substitutionExerciseIds.length > 0
        ? exercise.substitutionExerciseIds
        : [fallbackSubstitution];
      const safetyNotes = exercise.safetyNotes && exercise.safetyNotes.length > 0
        ? exercise.safetyNotes
        : ['Use a pain-free range and stop if symptoms become sharp.'];
      return {
        ...exercise,
        reviewStatus: 'approved',
        safetyReviewStatus: approvedSafetyStatus(exercise),
        riskLevel: exercise.riskLevel ?? 'moderate',
        rolloutEligibility: 'production',
        safetyNotes,
        substitutionExerciseIds,
        media: {
          ...(exercise.media ?? {}),
          thumbnailUrl: `https://example.test/workout-media/${exercise.id}.jpg`,
          altText: exercise.media?.altText ?? `${exercise.name} demonstration`,
          reviewStatus: 'approved',
        },
      };
    }),
    prescriptionTemplates: workoutProgrammingCatalog.prescriptionTemplates.map((template): PrescriptionTemplate => {
      const progressionRuleIds = template.progressionRuleIds && template.progressionRuleIds.length > 0
        ? template.progressionRuleIds
        : [workoutIntelligenceCatalog.progressionRules[0].id];
      const regressionRuleIds = template.regressionRuleIds && template.regressionRuleIds.length > 0
        ? template.regressionRuleIds
        : [workoutIntelligenceCatalog.regressionRules[0].id];
      const deloadRuleIds = template.deloadRuleIds && template.deloadRuleIds.length > 0
        ? template.deloadRuleIds
        : [workoutIntelligenceCatalog.deloadRules[0].id];
      return {
        ...template,
        reviewStatus: 'approved',
        safetyReviewStatus: approvedSafetyStatus(template),
        riskLevel: template.riskLevel ?? 'moderate',
        rolloutEligibility: 'production',
        progressionRuleIds,
        regressionRuleIds,
        deloadRuleIds,
      };
    }),
  };
}

function releaseReadyIntelligence(): WorkoutIntelligenceCatalog {
  return {
    ...workoutIntelligenceCatalog,
    descriptionTemplates: workoutIntelligenceCatalog.descriptionTemplates.map((template) => ({
      ...template,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(template),
      riskLevel: template.riskLevel ?? 'moderate',
      rolloutEligibility: 'production',
    })),
    progressionRules: workoutIntelligenceCatalog.progressionRules.map((rule): ProgressionRule => ({
      ...rule,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(rule),
      riskLevel: rule.riskLevel ?? 'moderate',
      rolloutEligibility: 'production',
    })),
    regressionRules: workoutIntelligenceCatalog.regressionRules.map((rule) => ({
      ...rule,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(rule),
      riskLevel: rule.riskLevel ?? 'high',
      rolloutEligibility: 'production',
    })),
    deloadRules: workoutIntelligenceCatalog.deloadRules.map((rule) => ({
      ...rule,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(rule),
      riskLevel: rule.riskLevel ?? 'high',
      rolloutEligibility: 'production',
    })),
    substitutionRules: workoutIntelligenceCatalog.substitutionRules.map((rule) => ({
      ...rule,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(rule),
      riskLevel: rule.riskLevel ?? 'moderate',
      rolloutEligibility: 'production',
    })),
    safetyFlags: workoutIntelligenceCatalog.safetyFlags.map((flag) => ({
      ...flag,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(flag),
      riskLevel: flag.riskLevel ?? (flag.blocksHardTraining ? 'high' : 'moderate'),
      rolloutEligibility: 'production',
    })),
    validationRules: workoutIntelligenceCatalog.validationRules.map((rule) => ({
      ...rule,
      reviewStatus: 'approved',
      safetyReviewStatus: approvedSafetyStatus(rule),
      riskLevel: rule.riskLevel ?? 'high',
      rolloutEligibility: 'production',
    })),
  };
}

function reportFor(catalog: WorkoutProgrammingCatalog, intelligence = releaseReadyIntelligence()) {
  return buildAuditReport(process.cwd(), { catalog, intelligence });
}

function replaceExercise(catalog: WorkoutProgrammingCatalog, id: string, update: Partial<Exercise>): WorkoutProgrammingCatalog {
  return {
    ...catalog,
    exercises: catalog.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...update } : exercise),
  };
}

function run() {
  console.log('\n-- workout programming strict content release gate --');

  const readyCatalog = releaseReadyCatalog();
  const readyIntelligence = releaseReadyIntelligence();
  const readyReport = reportFor(readyCatalog, readyIntelligence);
  assert('approved production content passes strict release', readyReport.release.productionReady === true && shouldFail(readyReport, { strict: true }) === false);

  const previewCatalog = replaceExercise(readyCatalog, 'goblet_squat', {
    reviewStatus: 'needs_review',
    safetyReviewStatus: 'needs_review',
    rolloutEligibility: 'preview',
    media: {
      altText: 'Preview-only media placeholder',
      reviewStatus: 'needs_review',
    },
  });
  const previewReport = reportFor(previewCatalog, readyIntelligence);
  assert('preview/dev-only content does not block normal audit', shouldFail(previewReport, {}) === false && previewReport.summary.productionBlockers === 0);
  assert('preview/dev-only content does not block strict release when safely gated', shouldFail(previewReport, { strict: true }) === false && previewReport.release.previewGatedCounts.total > 0);

  const highRiskPreviewReport = reportFor(replaceExercise(readyCatalog, 'goblet_squat', {
    reviewStatus: 'needs_review',
    riskLevel: 'high',
    safetyReviewStatus: 'needs_review',
    rolloutEligibility: 'preview',
  }), readyIntelligence);
  assert('high-risk preview content awaiting safety approval does not block strict release when gated', shouldFail(highRiskPreviewReport, { release: true }) === false);

  const missingReviewReport = reportFor(replaceExercise(readyCatalog, 'goblet_squat', {
    reviewStatus: 'needs_review',
    rolloutEligibility: 'production',
  }), readyIntelligence);
  assert('production content missing review blocks strict release', shouldFail(missingReviewReport, { strict: true }) === true && missingReviewReport.release.reviewBlockers.some((item: any) => item.id === 'goblet_squat'));

  const unsafeHighRiskReport = reportFor(replaceExercise(readyCatalog, 'goblet_squat', {
    reviewStatus: 'approved',
    riskLevel: 'high',
    safetyReviewStatus: 'needs_review',
    rolloutEligibility: 'production',
  }), readyIntelligence);
  assert('high-risk production content without safety approval blocks strict release', shouldFail(unsafeHighRiskReport, { release: true }) === true && unsafeHighRiskReport.release.unsafeProductionEligible.some((item: any) => item.id === 'goblet_squat'));

  const rejectedReport = reportFor(replaceExercise(readyCatalog, 'goblet_squat', {
    reviewStatus: 'rejected',
    safetyReviewStatus: 'rejected',
    rolloutEligibility: 'production',
  }), readyIntelligence);
  assert('rejected content with production eligibility blocks strict release', shouldFail(rejectedReport, { strict: true }) === true && rejectedReport.release.reviewBlockers.some((item: any) => item.id === 'goblet_squat'));

  const missingMediaReport = reportFor(replaceExercise(readyCatalog, 'goblet_squat', {
    media: {
      altText: 'Missing production media',
      reviewStatus: 'needs_review',
    },
  }), readyIntelligence);
  assert('production-eligible exercises missing media block strict release', shouldFail(missingMediaReport, { strict: true }) === true && missingMediaReport.release.missingProductionMedia.some((item: any) => item.id === 'goblet_squat'));

  const missingRuleCatalog: WorkoutProgrammingCatalog = {
    ...readyCatalog,
    prescriptionTemplates: readyCatalog.prescriptionTemplates.map((template) => (
      template.id === 'mobility_hold'
        ? { ...template, progressionRuleIds: [], regressionRuleIds: [], deloadRuleIds: [] }
        : template
    )),
  };
  const missingRuleReport = reportFor(missingRuleCatalog, readyIntelligence);
  assert('production prescriptions missing progression regression or deload rules block strict release', shouldFail(missingRuleReport, { strict: true }) === true && missingRuleReport.release.productionBlockers.some((item: any) => item.id === 'mobility_hold'));
}

run();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
if (failed > 0) process.exit(1);
