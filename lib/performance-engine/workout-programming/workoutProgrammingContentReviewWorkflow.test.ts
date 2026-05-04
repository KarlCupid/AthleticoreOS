import {
  applyContentReviewDecisions,
  createContentReviewQueue,
  generateContentReviewDecisionSql,
  type ContentReviewDecisionFile,
} from './contentReviewWorkflow.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { workoutProgrammingCatalog } from './seedData.ts';

declare const require: (path: string) => {
  buildAuditReport?: (projectRoot?: string, options?: Record<string, unknown>) => {
    summary: {
      reviewDecisionsApplied: number;
    };
    reviewDecisionResult: {
      applied: Array<{ id: string }>;
    } | null;
  };
};
declare const process: {
  cwd: () => string;
  exit: (code?: number) => never;
};

const {
  buildAuditReport,
} = require('../../../scripts/workout-programming-content-utils.js');

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

function run() {
  console.log('\n-- workout programming content review workflow --');

  const queue = createContentReviewQueue(workoutProgrammingCatalog, workoutIntelligenceCatalog, '2026-05-04T00:00:00.000Z');
  const hipThrustQueueItem = queue.items.find((item) => item.recordType === 'Exercise' && item.id === 'hip_thrust');
  assert('review queue lists content needing review', Boolean(hipThrustQueueItem));
  assert('review queue includes approval decision template', hipThrustQueueItem?.decisionTemplate.decision === 'approve');
  assert('review queue includes risk and review status context', hipThrustQueueItem?.reviewStatus === 'needs_review' && hipThrustQueueItem?.rolloutEligibility === 'preview');

  const approvalFile: ContentReviewDecisionFile = {
    schemaVersion: 'workout-content-review-decisions/v1',
    decisions: [
      {
        recordType: 'Exercise',
        id: 'hip_thrust',
        decision: 'approve',
        reviewer: 'coach-reviewer',
        notes: ['Reviewed movement description and rollout eligibility.'],
        safetyReviewStatus: 'not_required',
        reviewedAt: '2026-05-04T00:00:00.000Z',
      },
    ],
  };
  const approved = applyContentReviewDecisions(workoutProgrammingCatalog, workoutIntelligenceCatalog, approvalFile);
  const approvedHipThrust = approved.catalog.exercises.find((exercise) => exercise.id === 'hip_thrust');
  assert('approval decision applies without TypeScript content-pack edits', approved.errors.length === 0 && approved.applied.length === 1);
  assert('approval decision marks content production eligible', approvedHipThrust?.reviewStatus === 'approved' && approvedHipThrust.rolloutEligibility === 'production');

  const rejectionFile: ContentReviewDecisionFile = {
    schemaVersion: 'workout-content-review-decisions/v1',
    decisions: [
      {
        recordType: 'Exercise',
        id: 'hip_thrust',
        decision: 'reject',
        reviewer: 'coach-reviewer',
        notes: ['Rejected until the media and safety review are revised.'],
      },
    ],
  };
  const rejected = applyContentReviewDecisions(workoutProgrammingCatalog, workoutIntelligenceCatalog, rejectionFile);
  const rejectedHipThrust = rejected.catalog.exercises.find((exercise) => exercise.id === 'hip_thrust');
  assert('rejection decision blocks content rollout', rejectedHipThrust?.reviewStatus === 'rejected' && rejectedHipThrust.rolloutEligibility === 'blocked');

  const unsafeApproval = applyContentReviewDecisions(workoutProgrammingCatalog, workoutIntelligenceCatalog, {
    schemaVersion: 'workout-content-review-decisions/v1',
    decisions: [
      {
        recordType: 'Exercise',
        id: 'hip_thrust',
        decision: 'approve',
        reviewer: 'coach-reviewer',
        riskLevel: 'high',
      },
    ],
  });
  assert('high-risk production approval requires explicit safety approval', unsafeApproval.errors.some((error) => error.includes('safetyReviewStatus approved')));

  const sql = generateContentReviewDecisionSql(approvalFile);
  assert('review decisions can export Supabase metadata update SQL', sql.includes('UPDATE public.programming_exercises') && sql.includes("WHERE id = 'hip_thrust';"));
  assert('review SQL does not insert or delete content rows', !/\bINSERT\b|\bDELETE\b/i.test(sql));

  const report = buildAuditReport?.(process.cwd(), { reviewDecisionFile: approvalFile });
  assert('audit report can use review decision data', Boolean(
    report
      && report.summary.reviewDecisionsApplied === 1
      && report.reviewDecisionResult?.applied.some((item) => item.id === 'hip_thrust'),
  ));
}

run();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
if (failed > 0) process.exit(1);
