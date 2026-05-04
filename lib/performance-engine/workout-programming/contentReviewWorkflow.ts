import {
  getUnsafeOrUnreviewedContentReport,
  markContentApproved,
  markContentRejected,
  type ContentReviewIssue,
  type ReviewableContentRecordType,
} from './contentReview.ts';
import type {
  ContentRiskLevel,
  ContentRolloutEligibility,
  ReviewableContentFields,
  SafetyReviewStatus,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
} from './types.ts';

export type ContentReviewDecisionAction = 'approve' | 'reject' | 'needs_review';

export interface ContentReviewDecision {
  recordType: ReviewableContentRecordType;
  id: string;
  decision: ContentReviewDecisionAction;
  reviewer?: string;
  notes?: string[];
  safetyReviewStatus?: SafetyReviewStatus;
  riskLevel?: ContentRiskLevel;
  rolloutEligibility?: ContentRolloutEligibility;
  contentVersion?: string;
  reviewedAt?: string;
  lastUpdatedAt?: string;
}

export interface ContentReviewDecisionFile {
  schemaVersion: 'workout-content-review-decisions/v1';
  generatedAt?: string;
  reviewerInstructions?: string[];
  decisions: ContentReviewDecision[];
}

export interface ContentReviewQueueItem {
  recordType: ReviewableContentRecordType;
  id: string;
  reviewStatus?: string;
  safetyReviewStatus?: string;
  riskLevel?: string;
  rolloutEligibility?: string;
  issueFields: string[];
  issues: ContentReviewIssue[];
  decisionTemplate: ContentReviewDecision;
}

export interface ContentReviewQueueExport {
  schemaVersion: 'workout-content-review-queue/v1';
  generatedAt: string;
  summary: {
    needingReviewCount: number;
    unsafeOrBlockedCount: number;
    productionBlockingCount: number;
    queueCount: number;
  };
  reviewerInstructions: string[];
  items: ContentReviewQueueItem[];
}

export interface ContentReviewDecisionResult {
  applied: Array<{
    recordType: ReviewableContentRecordType;
    id: string;
    decision: ContentReviewDecisionAction;
  }>;
  errors: string[];
  warnings: string[];
  catalog: WorkoutProgrammingCatalog;
  intelligence: WorkoutIntelligenceCatalog;
}

const RECORD_COLLECTIONS = {
  Exercise: { root: 'catalog', collection: 'exercises', table: 'programming_exercises' },
  PrescriptionTemplate: { root: 'catalog', collection: 'prescriptionTemplates', table: 'prescription_templates' },
  DescriptionTemplate: { root: 'intelligence', collection: 'descriptionTemplates', table: 'description_templates' },
  ProgressionRule: { root: 'intelligence', collection: 'progressionRules', table: 'progression_rules' },
  RegressionRule: { root: 'intelligence', collection: 'regressionRules', table: 'regression_rules' },
  DeloadRule: { root: 'intelligence', collection: 'deloadRules', table: 'deload_rules' },
  SubstitutionRule: { root: 'intelligence', collection: 'substitutionRules', table: 'substitution_rules' },
  SafetyFlag: { root: 'intelligence', collection: 'safetyFlags', table: 'safety_flags' },
  ValidationRule: { root: 'intelligence', collection: 'validationRules', table: 'validation_rules' },
} as const satisfies Record<ReviewableContentRecordType, { root: 'catalog' | 'intelligence'; collection: string; table: string }>;

function recordId(item: ReviewableContentFields & { id?: string; sourceExerciseId?: string; descriptionTemplateId?: string }): string {
  return item.id ?? item.descriptionTemplateId ?? item.sourceExerciseId ?? 'unknown';
}

function reviewKey(recordType: ReviewableContentRecordType, id: string): string {
  return `${recordType}:${id}`;
}

function metadataPatch(decision: ContentReviewDecision): Partial<ReviewableContentFields> {
  const patch: Partial<ReviewableContentFields> = {};
  if (decision.safetyReviewStatus) patch.safetyReviewStatus = decision.safetyReviewStatus;
  if (decision.riskLevel) patch.riskLevel = decision.riskLevel;
  if (decision.rolloutEligibility) patch.rolloutEligibility = decision.rolloutEligibility;
  if (decision.contentVersion) patch.contentVersion = decision.contentVersion;
  if (decision.reviewedAt) patch.reviewedAt = decision.reviewedAt;
  if (decision.lastUpdatedAt) patch.lastUpdatedAt = decision.lastUpdatedAt;
  return patch;
}

function withDecisionTimestamps<T extends ReviewableContentFields>(item: T, decision: ContentReviewDecision): T {
  return {
    ...item,
    ...(decision.reviewedAt ? { reviewedAt: decision.reviewedAt } : {}),
    ...(decision.lastUpdatedAt ? { lastUpdatedAt: decision.lastUpdatedAt } : {}),
    ...(decision.contentVersion ? { contentVersion: decision.contentVersion } : {}),
  };
}

function applyDecisionToItem<T extends ReviewableContentFields>(item: T, decision: ContentReviewDecision): T {
  const patched = {
    ...item,
    ...metadataPatch(decision),
  };

  if (decision.decision === 'approve') {
    return withDecisionTimestamps(markContentApproved(patched, decision.reviewer ?? 'unknown-reviewer', decision.notes), decision);
  }

  if (decision.decision === 'reject') {
    return withDecisionTimestamps(markContentRejected(patched, decision.reviewer ?? 'unknown-reviewer', decision.notes), decision);
  }

  const now = decision.reviewedAt ?? new Date().toISOString();
  return {
    ...patched,
    reviewStatus: 'needs_review',
    reviewedBy: decision.reviewer ?? patched.reviewedBy,
    reviewedAt: decision.reviewer ? now : patched.reviewedAt,
    reviewNotes: decision.notes ?? patched.reviewNotes ?? [],
    safetyReviewStatus: decision.safetyReviewStatus ?? patched.safetyReviewStatus ?? (patched.riskLevel === 'high' ? 'needs_review' : 'not_required'),
    rolloutEligibility: decision.rolloutEligibility ?? (patched.rolloutEligibility === 'production' ? 'preview' : patched.rolloutEligibility ?? 'preview'),
    contentVersion: decision.contentVersion ?? patched.contentVersion ?? 'unversioned',
    lastUpdatedAt: decision.lastUpdatedAt ?? now,
    riskLevel: patched.riskLevel ?? 'moderate',
  };
}

function validateDecision(decision: ContentReviewDecision, item: ReviewableContentFields | null): string[] {
  const errors: string[] = [];
  if (!RECORD_COLLECTIONS[decision.recordType]) errors.push(`Unknown recordType ${String(decision.recordType)}.`);
  if (!decision.id || typeof decision.id !== 'string') errors.push('Decision is missing a string id.');
  if (!['approve', 'reject', 'needs_review'].includes(decision.decision)) errors.push(`Decision ${decision.id} has invalid action ${String(decision.decision)}.`);
  if ((decision.decision === 'approve' || decision.decision === 'reject') && !decision.reviewer) {
    errors.push(`${decision.recordType} ${decision.id} requires reviewer for ${decision.decision}.`);
  }
  if (!item) return errors;

  const riskLevel = decision.riskLevel ?? item.riskLevel;
  const safetyReviewStatus = decision.safetyReviewStatus ?? item.safetyReviewStatus;
  const rolloutEligibility = decision.rolloutEligibility ?? (decision.decision === 'approve' ? 'production' : item.rolloutEligibility);
  if (decision.decision === 'approve' && riskLevel === 'high' && safetyReviewStatus !== 'approved' && rolloutEligibility === 'production') {
    errors.push(`${decision.recordType} ${decision.id} is high risk and needs safetyReviewStatus approved before production approval.`);
  }
  if (decision.decision === 'reject' && decision.rolloutEligibility && decision.rolloutEligibility !== 'blocked') {
    errors.push(`${decision.recordType} ${decision.id} rejection must use rolloutEligibility blocked.`);
  }
  return errors;
}

function itemMap(catalog: WorkoutProgrammingCatalog, intelligence: WorkoutIntelligenceCatalog): Map<string, ReviewableContentFields> {
  const map = new Map<string, ReviewableContentFields>();
  for (const [recordType, config] of Object.entries(RECORD_COLLECTIONS) as Array<[ReviewableContentRecordType, typeof RECORD_COLLECTIONS[ReviewableContentRecordType]]>) {
    const root = config.root === 'catalog' ? catalog : intelligence;
    const collection = (root as unknown as Record<string, ReviewableContentFields[]>)[config.collection] ?? [];
    for (const item of collection) map.set(reviewKey(recordType, recordId(item)), item);
  }
  return map;
}

export function applyContentReviewDecisions(
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
  decisionFile: ContentReviewDecisionFile | { decisions: ContentReviewDecision[] },
): ContentReviewDecisionResult {
  const decisions = decisionFile.decisions ?? [];
  const byItem = itemMap(catalog, intelligence);
  const seen = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const applied: ContentReviewDecisionResult['applied'] = [];

  const decisionByKey = new Map<string, ContentReviewDecision>();
  for (const decision of decisions) {
    const key = reviewKey(decision.recordType, decision.id);
    if (seen.has(key)) {
      errors.push(`Duplicate review decision for ${key}.`);
      continue;
    }
    seen.add(key);
    const item = byItem.get(key) ?? null;
    if (!item) {
      errors.push(`Review decision targets missing content record ${key}.`);
      continue;
    }
    errors.push(...validateDecision(decision, item));
    decisionByKey.set(key, decision);
  }

  function mapCollection<T extends ReviewableContentFields>(recordType: ReviewableContentRecordType, collection: T[]): T[] {
    return collection.map((item) => {
      const id = recordId(item);
      const decision = decisionByKey.get(reviewKey(recordType, id));
      if (!decision) return item;
      if (validateDecision(decision, item).length > 0) return item;
      applied.push({ recordType, id, decision: decision.decision });
      return applyDecisionToItem(item, decision);
    });
  }

  const updatedCatalog: WorkoutProgrammingCatalog = {
    ...catalog,
    exercises: mapCollection('Exercise', catalog.exercises),
    prescriptionTemplates: mapCollection('PrescriptionTemplate', catalog.prescriptionTemplates),
  };
  const updatedIntelligence: WorkoutIntelligenceCatalog = {
    ...intelligence,
    descriptionTemplates: mapCollection('DescriptionTemplate', intelligence.descriptionTemplates),
    progressionRules: mapCollection('ProgressionRule', intelligence.progressionRules),
    regressionRules: mapCollection('RegressionRule', intelligence.regressionRules),
    deloadRules: mapCollection('DeloadRule', intelligence.deloadRules),
    substitutionRules: mapCollection('SubstitutionRule', intelligence.substitutionRules),
    safetyFlags: mapCollection('SafetyFlag', intelligence.safetyFlags),
    validationRules: mapCollection('ValidationRule', intelligence.validationRules),
  };

  if (decisions.length === 0) warnings.push('Review decision file contained no decisions.');
  return { applied, errors, warnings, catalog: updatedCatalog, intelligence: updatedIntelligence };
}

function queueItemFor(
  recordType: ReviewableContentRecordType,
  id: string,
  item: ReviewableContentFields,
  issues: ContentReviewIssue[],
): ContentReviewQueueItem {
  const decisionTemplate: ContentReviewDecision = {
    recordType,
    id,
    decision: item.reviewStatus === 'rejected' ? 'reject' : 'approve',
    reviewer: '',
    notes: [],
    safetyReviewStatus: item.riskLevel === 'high' ? 'approved' : item.safetyReviewStatus ?? 'not_required',
    rolloutEligibility: item.reviewStatus === 'rejected' ? 'blocked' : 'production',
  };
  if (item.riskLevel) decisionTemplate.riskLevel = item.riskLevel;

  const queueItem: ContentReviewQueueItem = {
    recordType,
    id,
    issueFields: Array.from(new Set(issues.map((issue) => issue.field))),
    issues,
    decisionTemplate,
  };
  if (item.reviewStatus) queueItem.reviewStatus = item.reviewStatus;
  if (item.safetyReviewStatus) queueItem.safetyReviewStatus = item.safetyReviewStatus;
  if (item.riskLevel) queueItem.riskLevel = item.riskLevel;
  if (item.rolloutEligibility) queueItem.rolloutEligibility = item.rolloutEligibility;
  return queueItem;
}

export function createContentReviewQueue(
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
  generatedAt = new Date().toISOString(),
): ContentReviewQueueExport {
  const report = getUnsafeOrUnreviewedContentReport(catalog, intelligence, generatedAt);
  const byItem = itemMap(catalog, intelligence);
  const issueGroups = new Map<string, ContentReviewIssue[]>();
  for (const issue of [...report.needingReview, ...report.unsafeOrBlocked, ...report.productionBlocking]) {
    const key = reviewKey(issue.recordType, issue.id);
    issueGroups.set(key, [...(issueGroups.get(key) ?? []), issue]);
  }
  const items = Array.from(issueGroups.entries()).flatMap(([key, issues]) => {
    const [recordType, id] = key.split(':') as [ReviewableContentRecordType, string];
    const item = byItem.get(key);
    return item ? [queueItemFor(recordType, id, item, issues)] : [];
  });

  return {
    schemaVersion: 'workout-content-review-queue/v1',
    generatedAt,
    summary: {
      ...report.summary,
      queueCount: items.length,
    },
    reviewerInstructions: [
      'Copy decisionTemplate objects into a workout-content-review-decisions/v1 file.',
      'Approve only after coach/content review is complete.',
      'High-risk production approvals require safetyReviewStatus approved.',
      'Reject unsafe or obsolete content; rejected content must stay blocked.',
    ],
    items,
  };
}

function sqlLiteral(value: unknown): string {
  if (value == null) return 'NULL';
  if (Array.isArray(value)) return `ARRAY[${value.map(sqlLiteral).join(', ')}]::TEXT[]`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function generateContentReviewDecisionSql(decisionFile: ContentReviewDecisionFile | { decisions: ContentReviewDecision[] }): string {
  const statements = [
    '-- Workout-programming content review metadata update.',
    '-- Review before applying. Use only against a dedicated admin/service-role context.',
  ];
  for (const decision of decisionFile.decisions ?? []) {
    const config = RECORD_COLLECTIONS[decision.recordType];
    if (!config) continue;
    const reviewedAt = decision.reviewedAt ?? new Date().toISOString();
    const reviewStatus = decision.decision === 'approve' ? 'approved' : decision.decision === 'reject' ? 'rejected' : 'needs_review';
    const rolloutEligibility = decision.rolloutEligibility
      ?? (decision.decision === 'approve' ? 'production' : decision.decision === 'reject' ? 'blocked' : 'preview');
    const safetyReviewStatus = decision.safetyReviewStatus
      ?? (decision.decision === 'reject' ? 'rejected' : 'not_required');
    statements.push([
      `UPDATE public.${config.table}`,
      'SET',
      `  review_status = ${sqlLiteral(reviewStatus)},`,
      `  reviewed_by = ${sqlLiteral(decision.reviewer ?? null)},`,
      `  reviewed_at = ${sqlLiteral(reviewedAt)},`,
      `  review_notes = ${sqlLiteral(decision.notes ?? [])},`,
      `  safety_review_status = ${sqlLiteral(safetyReviewStatus)},`,
      `  content_version = COALESCE(${sqlLiteral(decision.contentVersion ?? null)}, content_version),`,
      `  last_updated_at = ${sqlLiteral(decision.lastUpdatedAt ?? reviewedAt)},`,
      `  risk_level = COALESCE(${sqlLiteral(decision.riskLevel ?? null)}, risk_level),`,
      `  rollout_eligibility = ${sqlLiteral(rolloutEligibility)}`,
      `WHERE id = ${sqlLiteral(decision.id)};`,
    ].join('\n'));
  }
  return `${statements.join('\n\n')}\n`;
}
