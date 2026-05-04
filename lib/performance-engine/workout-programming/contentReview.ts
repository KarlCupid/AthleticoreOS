import type {
  ContentRiskLevel,
  ContentReviewStatus,
  ContentRolloutEligibility,
  DeloadRule,
  DescriptionTemplate,
  Exercise,
  PrescriptionTemplate,
  ProgressionRule,
  RegressionRule,
  ReviewableContentFields,
  SafetyReviewStatus,
  SubstitutionRule,
  ValidationRule,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
  WorkoutSafetyFlag,
} from './types.ts';

export type ContentReviewMode = 'production' | 'preview' | 'development';

export type ReviewableContentRecordType =
  | 'Exercise'
  | 'PrescriptionTemplate'
  | 'DescriptionTemplate'
  | 'ProgressionRule'
  | 'RegressionRule'
  | 'DeloadRule'
  | 'SubstitutionRule'
  | 'SafetyFlag'
  | 'ValidationRule';

export interface ContentReviewMetadataRequired {
  reviewStatus: ContentReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes: string[];
  safetyReviewStatus: SafetyReviewStatus;
  contentVersion: string;
  lastUpdatedAt: string;
  riskLevel: ContentRiskLevel;
  rolloutEligibility: ContentRolloutEligibility;
}

export interface ContentReviewIssue {
  recordType: ReviewableContentRecordType;
  id: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
  suggestedCorrection: string;
  reviewStatus?: ContentReviewStatus;
  safetyReviewStatus?: SafetyReviewStatus;
  riskLevel?: ContentRiskLevel;
  rolloutEligibility?: ContentRolloutEligibility;
}

export interface ContentReviewGateOptions {
  mode?: ContentReviewMode;
  allowDraftContent?: boolean;
}

export interface ContentReviewGateResult<T> {
  content: T[];
  warnings: ContentReviewIssue[];
  excluded: ContentReviewIssue[];
}

export interface PreparedWorkoutProgrammingContent {
  catalog: WorkoutProgrammingCatalog;
  intelligence: WorkoutIntelligenceCatalog;
  warnings: ContentReviewIssue[];
  excluded: ContentReviewIssue[];
}

export interface ContentReviewReport {
  generatedAt: string;
  needingReview: ContentReviewIssue[];
  unsafeOrBlocked: ContentReviewIssue[];
  productionBlocking: ContentReviewIssue[];
  summary: {
    needingReviewCount: number;
    unsafeOrBlockedCount: number;
    productionBlockingCount: number;
  };
}

const TRUSTED_SEED_REVIEWER = 'athleticore_seed_review';
const TRUSTED_SEED_REVIEW_TIMESTAMP = '2026-05-02T00:00:00.000Z';
const TRUSTED_SEED_CONTENT_VERSION = '2026.05.p0-content-review';

function itemId(item: ReviewableContentFields & { id?: string; sourceExerciseId?: string; descriptionTemplateId?: string }): string {
  return item.id ?? item.descriptionTemplateId ?? item.sourceExerciseId ?? 'unknown';
}

function inferRiskLevel(recordType: ReviewableContentRecordType, item: ReviewableContentFields & { severity?: string; blocksHardTraining?: boolean; contraindicationTags?: string[] }): ContentRiskLevel {
  if (item.riskLevel) return item.riskLevel;
  if (recordType === 'SafetyFlag') {
    if (item.blocksHardTraining || item.severity === 'block' || item.severity === 'restriction') return 'high';
    return 'moderate';
  }
  if (recordType === 'RegressionRule' || recordType === 'DeloadRule' || recordType === 'ValidationRule') return 'high';
  if (recordType === 'ProgressionRule') return 'moderate';
  if (recordType === 'SubstitutionRule') {
    return item.contraindicationTags && item.contraindicationTags.length > 0 ? 'high' : 'moderate';
  }
  return 'moderate';
}

function metadataFor(
  item: ReviewableContentFields,
  recordType: ReviewableContentRecordType,
  trustedSeed: boolean,
): ContentReviewMetadataRequired {
  const riskLevel = inferRiskLevel(recordType, item);
  if (trustedSeed) {
    const seeded: ContentReviewMetadataRequired = {
      reviewStatus: item.reviewStatus ?? 'approved',
      reviewNotes: item.reviewNotes ?? ['Seeded workout-programming content is approved for initial production rollout and remains subject to periodic coach and safety review.'],
      safetyReviewStatus: item.safetyReviewStatus ?? (riskLevel === 'high' ? 'approved' : 'not_required'),
      contentVersion: item.contentVersion ?? TRUSTED_SEED_CONTENT_VERSION,
      lastUpdatedAt: item.lastUpdatedAt ?? TRUSTED_SEED_REVIEW_TIMESTAMP,
      riskLevel,
      rolloutEligibility: item.rolloutEligibility ?? 'production',
    };
    seeded.reviewedBy = item.reviewedBy ?? TRUSTED_SEED_REVIEWER;
    seeded.reviewedAt = item.reviewedAt ?? TRUSTED_SEED_REVIEW_TIMESTAMP;
    return seeded;
  }
  const metadata: ContentReviewMetadataRequired = {
    reviewStatus: item.reviewStatus ?? 'needs_review',
    reviewNotes: item.reviewNotes ?? [],
    safetyReviewStatus: item.safetyReviewStatus ?? (riskLevel === 'high' ? 'needs_review' : 'not_required'),
    contentVersion: item.contentVersion ?? 'unversioned',
    lastUpdatedAt: item.lastUpdatedAt ?? TRUSTED_SEED_REVIEW_TIMESTAMP,
    riskLevel,
    rolloutEligibility: item.rolloutEligibility ?? 'preview',
  };
  if (item.reviewedBy) metadata.reviewedBy = item.reviewedBy;
  if (item.reviewedAt) metadata.reviewedAt = item.reviewedAt;
  return metadata;
}

function withMetadata<T extends ReviewableContentFields>(
  item: T,
  recordType: ReviewableContentRecordType,
  trustedSeed: boolean,
): T {
  return {
    ...item,
    ...metadataFor(item, recordType, trustedSeed),
  };
}

function issue(
  item: ReviewableContentFields & { id?: string; sourceExerciseId?: string },
  recordType: ReviewableContentRecordType,
  metadata: ContentReviewMetadataRequired,
  field: string,
  severity: 'error' | 'warning',
  message: string,
  suggestedCorrection: string,
): ContentReviewIssue {
  return {
    recordType,
    id: itemId(item),
    field,
    severity,
    message,
    suggestedCorrection,
    reviewStatus: metadata.reviewStatus,
    safetyReviewStatus: metadata.safetyReviewStatus,
    riskLevel: metadata.riskLevel,
    rolloutEligibility: metadata.rolloutEligibility,
  };
}

function productionBlockers<T extends ReviewableContentFields & { id?: string; sourceExerciseId?: string }>(
  item: T,
  recordType: ReviewableContentRecordType,
  metadata: ContentReviewMetadataRequired,
): ContentReviewIssue[] {
  const blockers: ContentReviewIssue[] = [];
  if (metadata.reviewStatus !== 'approved') {
    blockers.push(issue(
      item,
      recordType,
      metadata,
      'reviewStatus',
      'error',
      `${recordType} ${itemId(item)} is ${metadata.reviewStatus} and cannot be used in production generation.`,
      'Have a qualified reviewer approve the content or keep it out of production rollout.',
    ));
  }
  if (metadata.rolloutEligibility !== 'production') {
    blockers.push(issue(
      item,
      recordType,
      metadata,
      'rolloutEligibility',
      'error',
      `${recordType} ${itemId(item)} is only eligible for ${metadata.rolloutEligibility} rollout.`,
      'Set rolloutEligibility to production only after content and safety review are complete.',
    ));
  }
  if (metadata.riskLevel === 'high' && metadata.safetyReviewStatus !== 'approved') {
    blockers.push(issue(
      item,
      recordType,
      metadata,
      'safetyReviewStatus',
      'error',
      `${recordType} ${itemId(item)} is high risk and does not have approved safety review.`,
      'Complete explicit safety review before production rollout.',
    ));
  }
  if (metadata.safetyReviewStatus === 'rejected') {
    blockers.push(issue(
      item,
      recordType,
      metadata,
      'safetyReviewStatus',
      'error',
      `${recordType} ${itemId(item)} has rejected safety review.`,
      'Replace or revise the content before it can be used.',
    ));
  }
  return blockers;
}

export function validateContentReviewForProduction<T extends ReviewableContentFields & { id?: string; sourceExerciseId?: string }>(
  item: T,
  recordType: ReviewableContentRecordType,
): ContentReviewIssue[] {
  const metadata = metadataFor(item, recordType, false);
  if (metadata.reviewStatus === 'rejected' || metadata.rolloutEligibility === 'blocked') {
    return [issue(
      item,
      recordType,
      metadata,
      metadata.reviewStatus === 'rejected' ? 'reviewStatus' : 'rolloutEligibility',
      'error',
      `${recordType} ${itemId(item)} is blocked from selection.`,
      'Do not use rejected or blocked content. Revise it and submit it for review again.',
    )];
  }
  return productionBlockers(item, recordType, metadata);
}

export function filterReviewableContent<T extends ReviewableContentFields & { id?: string; sourceExerciseId?: string }>(
  items: T[],
  recordType: ReviewableContentRecordType,
  options: ContentReviewGateOptions = {},
): ContentReviewGateResult<T> {
  const mode = options.mode ?? 'production';
  const content: T[] = [];
  const warnings: ContentReviewIssue[] = [];
  const excluded: ContentReviewIssue[] = [];

  for (const item of items) {
    const metadata = metadataFor(item, recordType, false);
    const normalized = { ...item, ...metadata };

    if (metadata.reviewStatus === 'rejected' || metadata.rolloutEligibility === 'blocked' || metadata.safetyReviewStatus === 'rejected') {
      excluded.push(issue(
        item,
        recordType,
        metadata,
        metadata.reviewStatus === 'rejected' ? 'reviewStatus' : 'rolloutEligibility',
        'error',
        `${recordType} ${itemId(item)} is rejected or blocked and will never be selected.`,
        'Revise the record and move it back to draft before requesting review again.',
      ));
      continue;
    }

    if (mode === 'production') {
      const blockers = productionBlockers(item, recordType, metadata);
      if (blockers.length > 0) {
        excluded.push(...blockers);
        continue;
      }
      content.push(normalized);
      continue;
    }

    if (metadata.reviewStatus === 'draft' && !options.allowDraftContent && mode !== 'development') {
      excluded.push(issue(
        item,
        recordType,
        metadata,
        'reviewStatus',
        'warning',
        `${recordType} ${itemId(item)} is draft content and preview mode was not allowed to include drafts.`,
        'Use allowDraftContent for internal previews, or move the record to needs_review.',
      ));
      continue;
    }

    if (metadata.reviewStatus !== 'approved' || metadata.rolloutEligibility !== 'production' || (metadata.riskLevel === 'high' && metadata.safetyReviewStatus !== 'approved')) {
      warnings.push(issue(
        item,
        recordType,
        metadata,
        'reviewStatus',
        'warning',
        `${recordType} ${itemId(item)} is allowed only for ${mode} review and must not be treated as production-ready.`,
        'Surface this warning in preview/beta workflows and complete review before production use.',
      ));
    }
    content.push(normalized);
  }

  return { content, warnings, excluded };
}

export function applyDefaultContentReviewMetadataToCatalog(catalog: WorkoutProgrammingCatalog): WorkoutProgrammingCatalog {
  return {
    ...catalog,
    exercises: catalog.exercises.map((exercise) => withMetadata(exercise, 'Exercise', true)),
    prescriptionTemplates: catalog.prescriptionTemplates.map((template) => withMetadata(template, 'PrescriptionTemplate', true)),
  };
}

export function applyDefaultContentReviewMetadataToIntelligence(intelligence: WorkoutIntelligenceCatalog): WorkoutIntelligenceCatalog {
  return {
    ...intelligence,
    progressionRules: intelligence.progressionRules.map((rule) => withMetadata(rule, 'ProgressionRule', true)),
    regressionRules: intelligence.regressionRules.map((rule) => withMetadata(rule, 'RegressionRule', true)),
    deloadRules: intelligence.deloadRules.map((rule) => withMetadata(rule, 'DeloadRule', true)),
    substitutionRules: intelligence.substitutionRules.map((rule) => withMetadata(rule, 'SubstitutionRule', true)),
    safetyFlags: intelligence.safetyFlags.map((flag) => withMetadata(flag, 'SafetyFlag', true)),
    descriptionTemplates: intelligence.descriptionTemplates.map((template) => withMetadata(template, 'DescriptionTemplate', true)),
    validationRules: intelligence.validationRules.map((rule) => withMetadata(rule, 'ValidationRule', true)),
  };
}

export function filterCatalogForContentReview(
  catalog: WorkoutProgrammingCatalog,
  options: ContentReviewGateOptions = {},
): { catalog: WorkoutProgrammingCatalog; warnings: ContentReviewIssue[]; excluded: ContentReviewIssue[] } {
  const exerciseGate = filterReviewableContent(catalog.exercises, 'Exercise', options);
  const prescriptionGate = filterReviewableContent(catalog.prescriptionTemplates, 'PrescriptionTemplate', options);
  const allowedExerciseIds = new Set(exerciseGate.content.map((exercise) => exercise.id));
  const allowedPrescriptionIds = new Set(prescriptionGate.content.map((template) => template.id));
  const sessionTemplates = catalog.sessionTemplates.map((template) => ({
    ...template,
    blocks: template.blocks.filter((block) => allowedPrescriptionIds.has(block.prescriptionTemplateId)),
    movementSlots: template.movementSlots.map((slot) => ({
      ...slot,
      ...(slot.preferredExerciseIds ? { preferredExerciseIds: slot.preferredExerciseIds.filter((id) => allowedExerciseIds.has(id)) } : {}),
      ...(slot.avoidExerciseIds ? { avoidExerciseIds: slot.avoidExerciseIds.filter((id) => allowedExerciseIds.has(id)) } : {}),
    })),
  })).filter((template) => template.blocks.length > 0);

  return {
    catalog: {
      ...catalog,
      exercises: exerciseGate.content,
      prescriptionTemplates: prescriptionGate.content,
      sessionTemplates,
    },
    warnings: [...exerciseGate.warnings, ...prescriptionGate.warnings],
    excluded: [...exerciseGate.excluded, ...prescriptionGate.excluded],
  };
}

export function filterIntelligenceForContentReview(
  intelligence: WorkoutIntelligenceCatalog,
  options: ContentReviewGateOptions = {},
): { intelligence: WorkoutIntelligenceCatalog; warnings: ContentReviewIssue[]; excluded: ContentReviewIssue[] } {
  const progression = filterReviewableContent(intelligence.progressionRules, 'ProgressionRule', options);
  const regression = filterReviewableContent(intelligence.regressionRules, 'RegressionRule', options);
  const deload = filterReviewableContent(intelligence.deloadRules, 'DeloadRule', options);
  const substitution = filterReviewableContent(intelligence.substitutionRules, 'SubstitutionRule', options);
  const safety = filterReviewableContent(intelligence.safetyFlags, 'SafetyFlag', options);
  const description = filterReviewableContent(intelligence.descriptionTemplates, 'DescriptionTemplate', options);
  const validation = filterReviewableContent(intelligence.validationRules, 'ValidationRule', options);

  return {
    intelligence: {
      ...intelligence,
      progressionRules: progression.content,
      regressionRules: regression.content,
      deloadRules: deload.content,
      substitutionRules: substitution.content,
      safetyFlags: safety.content,
      descriptionTemplates: description.content,
      validationRules: validation.content,
    },
    warnings: [
      ...progression.warnings,
      ...regression.warnings,
      ...deload.warnings,
      ...substitution.warnings,
      ...safety.warnings,
      ...description.warnings,
      ...validation.warnings,
    ],
    excluded: [
      ...progression.excluded,
      ...regression.excluded,
      ...deload.excluded,
      ...substitution.excluded,
      ...safety.excluded,
      ...description.excluded,
      ...validation.excluded,
    ],
  };
}

export function prepareWorkoutProgrammingContentForMode(
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
  options: ContentReviewGateOptions = {},
): PreparedWorkoutProgrammingContent {
  const catalogGate = filterCatalogForContentReview(catalog, options);
  const intelligenceGate = filterIntelligenceForContentReview(intelligence, options);
  return {
    catalog: catalogGate.catalog,
    intelligence: intelligenceGate.intelligence,
    warnings: [...catalogGate.warnings, ...intelligenceGate.warnings],
    excluded: [...catalogGate.excluded, ...intelligenceGate.excluded],
  };
}

export function markContentApproved<T extends ReviewableContentFields>(
  item: T,
  reviewer: string,
  notes?: string[],
): T {
  const now = new Date().toISOString();
  const riskLevel = item.riskLevel ?? 'moderate';
  return {
    ...item,
    reviewStatus: 'approved',
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes: notes ?? item.reviewNotes ?? [],
    safetyReviewStatus: item.safetyReviewStatus ?? (riskLevel === 'high' ? 'approved' : 'not_required'),
    contentVersion: item.contentVersion ?? '1.0.0',
    lastUpdatedAt: now,
    riskLevel,
    rolloutEligibility: 'production',
  };
}

export function markContentRejected<T extends ReviewableContentFields>(
  item: T,
  reviewer: string,
  notes?: string[],
): T {
  const now = new Date().toISOString();
  return {
    ...item,
    reviewStatus: 'rejected',
    reviewedBy: reviewer,
    reviewedAt: now,
    reviewNotes: notes ?? item.reviewNotes ?? [],
    safetyReviewStatus: item.safetyReviewStatus === 'approved' ? 'approved' : 'rejected',
    contentVersion: item.contentVersion ?? '1.0.0',
    lastUpdatedAt: now,
    riskLevel: item.riskLevel ?? 'moderate',
    rolloutEligibility: 'blocked',
  };
}

function reviewItems(catalog: WorkoutProgrammingCatalog, intelligence: WorkoutIntelligenceCatalog) {
  return [
    ...catalog.exercises.map((item) => ({ item, recordType: 'Exercise' as const })),
    ...catalog.prescriptionTemplates.map((item) => ({ item, recordType: 'PrescriptionTemplate' as const })),
    ...intelligence.descriptionTemplates.map((item) => ({ item, recordType: 'DescriptionTemplate' as const })),
    ...intelligence.progressionRules.map((item) => ({ item, recordType: 'ProgressionRule' as const })),
    ...intelligence.regressionRules.map((item) => ({ item, recordType: 'RegressionRule' as const })),
    ...intelligence.deloadRules.map((item) => ({ item, recordType: 'DeloadRule' as const })),
    ...intelligence.substitutionRules.map((item) => ({ item, recordType: 'SubstitutionRule' as const })),
    ...intelligence.safetyFlags.map((item) => ({ item, recordType: 'SafetyFlag' as const })),
    ...intelligence.validationRules.map((item) => ({ item, recordType: 'ValidationRule' as const })),
  ];
}

export function listContentNeedingReview(
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
): ContentReviewIssue[] {
  const issues: ContentReviewIssue[] = [];
  for (const { item, recordType } of reviewItems(catalog, intelligence)) {
    const metadata = metadataFor(item, recordType, false);
    if (metadata.reviewStatus === 'draft' || metadata.reviewStatus === 'needs_review') {
      issues.push(issue(
        item,
        recordType,
        metadata,
        'reviewStatus',
        'warning',
        `${recordType} ${itemId(item)} needs content review before production rollout.`,
        'Review the content, update notes, and approve or reject it.',
      ));
    }
    if (metadata.riskLevel === 'high' && metadata.safetyReviewStatus !== 'approved') {
      issues.push(issue(
        item,
        recordType,
        metadata,
        'safetyReviewStatus',
        'error',
        `${recordType} ${itemId(item)} is high risk and needs explicit safety review.`,
        'Complete safety review before production rollout. This is a programming safety check, not medical advice.',
      ));
    }
  }
  return issues;
}

export function getUnsafeOrUnreviewedContentReport(
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
  generatedAt = new Date().toISOString(),
): ContentReviewReport {
  const needingReview = listContentNeedingReview(catalog, intelligence);
  const unsafeOrBlocked: ContentReviewIssue[] = [];
  const productionBlocking: ContentReviewIssue[] = [];

  for (const { item, recordType } of reviewItems(catalog, intelligence)) {
    const metadata = metadataFor(item, recordType, false);
    if (metadata.reviewStatus === 'rejected' || metadata.safetyReviewStatus === 'rejected' || metadata.rolloutEligibility === 'blocked') {
      unsafeOrBlocked.push(issue(
        item,
        recordType,
        metadata,
        'rolloutEligibility',
        'error',
        `${recordType} ${itemId(item)} is rejected or blocked.`,
        'Keep blocked content out of catalogs used by production generation.',
      ));
    }
    productionBlocking.push(...validateContentReviewForProduction(item, recordType));
  }

  return {
    generatedAt,
    needingReview,
    unsafeOrBlocked,
    productionBlocking,
    summary: {
      needingReviewCount: needingReview.length,
      unsafeOrBlockedCount: unsafeOrBlocked.length,
      productionBlockingCount: productionBlocking.length,
    },
  };
}

export type ReviewableWorkoutProgrammingContent =
  | Exercise
  | PrescriptionTemplate
  | DescriptionTemplate
  | ProgressionRule
  | RegressionRule
  | DeloadRule
  | SubstitutionRule
  | WorkoutSafetyFlag
  | ValidationRule;
