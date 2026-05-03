const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const REQUIRED_TONE_VARIANTS = [
  'beginner_friendly',
  'coach_like',
  'clinical',
  'motivational',
  'minimal',
  'detailed',
  'athletic',
  'rehab_informed',
  'data_driven',
];

function registerTypeScriptHook() {
  if (require.extensions.__workoutProgrammingContentHook) return;

  require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const js = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: true,
        jsx: ts.JsxEmit.React,
      },
      fileName: filename,
    }).outputText;
    module._compile(js, filename);
  };

  require.extensions.__workoutProgrammingContentHook = true;
}

function loadWorkoutProgramming(projectRoot = process.cwd()) {
  registerTypeScriptHook();
  return require(path.join(projectRoot, 'lib', 'performance-engine', 'workout-programming', 'index.ts'));
}

function parseArgs(argv) {
  const args = {
    json: false,
    strict: false,
    release: false,
    failOnWarnings: false,
    allowInvalid: false,
    out: undefined,
    limit: 25,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--release') args.release = true;
    else if (arg === '--fail-on-warnings') args.failOnWarnings = true;
    else if (arg === '--allow-invalid') args.allowInvalid = true;
    else if (arg === '--out') {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--out=')) {
      args.out = arg.slice('--out='.length);
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--limit=')) {
      args.limit = Number(arg.slice('--limit='.length));
    }
  }

  if (!Number.isFinite(args.limit) || args.limit < 1) args.limit = 25;
  return args;
}

function entry(type, id, field, severity, message, suggestion, details = {}) {
  return {
    type,
    id,
    field,
    severity,
    message,
    suggestion,
    details,
  };
}

function runtimeIssuesToEntries(issues) {
  return issues.map((issue) => entry(
    issue.recordType,
    issue.id || 'unknown',
    issue.field,
    issue.severity,
    issue.message,
    issue.suggestedCorrection,
  ));
}

function reviewIssuesToEntries(issues) {
  return issues.map((issue) => entry(
    issue.recordType,
    issue.id || 'unknown',
    issue.field,
    issue.severity,
    issue.message,
    issue.suggestedCorrection,
    {
      reviewStatus: issue.reviewStatus,
      safetyReviewStatus: issue.safetyReviewStatus,
      riskLevel: issue.riskLevel,
      rolloutEligibility: issue.rolloutEligibility,
    },
  ));
}

function isIntentionallyGatedPreviewIssue(item) {
  const eligibility = item.details && item.details.rolloutEligibility;
  const reviewStatus = item.details && item.details.reviewStatus;
  const safetyReviewStatus = item.details && item.details.safetyReviewStatus;

  return (eligibility === 'preview' || eligibility === 'dev_only')
    && reviewStatus !== 'rejected'
    && safetyReviewStatus !== 'rejected';
}

function gatedPreviewWarning(item) {
  return {
    ...item,
    severity: 'warning',
    message: `${item.message} This record is intentionally gated out of production content selection.`,
    suggestion: 'Keep this content preview/dev-only until coach and safety review are complete, then approve it and set rolloutEligibility to production.',
  };
}

function hasMedia(exercise) {
  const media = exercise.media || {};
  return Boolean(media.videoUrl || media.thumbnailUrl || media.imageUrl || media.animationUrl);
}

function mediaReviewStatus(exercise) {
  const status = exercise.media && typeof exercise.media.reviewStatus === 'string'
    ? exercise.media.reviewStatus
    : 'needs_review';
  return status;
}

function ids(items) {
  return new Set(items.map((item) => item.id));
}

function progressionRuleIdsForTemplate(template) {
  const payloadRuleIds = template.payload && Array.isArray(template.payload.progressionRuleIds)
    ? template.payload.progressionRuleIds
    : [];
  return Array.from(new Set([
    ...(template.progressionRuleIds || []),
    ...payloadRuleIds,
  ]));
}

function collectReviewableItems(catalog, intelligence) {
  return [
    ...catalog.exercises.map((item) => ({ type: 'Exercise', item })),
    ...catalog.prescriptionTemplates.map((item) => ({ type: 'PrescriptionTemplate', item })),
    ...intelligence.descriptionTemplates.map((item) => ({ type: 'DescriptionTemplate', item })),
    ...intelligence.progressionRules.map((item) => ({ type: 'ProgressionRule', item })),
    ...intelligence.regressionRules.map((item) => ({ type: 'RegressionRule', item })),
    ...intelligence.deloadRules.map((item) => ({ type: 'DeloadRule', item })),
    ...intelligence.substitutionRules.map((item) => ({ type: 'SubstitutionRule', item })),
    ...intelligence.safetyFlags.map((item) => ({ type: 'SafetyFlag', item })),
    ...intelligence.validationRules.map((item) => ({ type: 'ValidationRule', item })),
  ];
}

function isProductionEligible(item) {
  return item.rolloutEligibility === 'production';
}

function isPreviewGated(item) {
  return item.rolloutEligibility === 'preview' || item.rolloutEligibility === 'dev_only';
}

function countByType(items) {
  const counts = { total: items.length };
  for (const { type } of items) {
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function unsafeProductionEntries(catalog, intelligence) {
  return collectReviewableItems(catalog, intelligence)
    .filter(({ item }) => item.rolloutEligibility === 'production')
    .filter(({ item }) => (
      item.reviewStatus === 'rejected'
      || item.safetyReviewStatus === 'rejected'
      || (item.riskLevel === 'high' && item.safetyReviewStatus !== 'approved')
    ))
    .map(({ type, item }) => entry(
      type,
      item.id || item.sourceExerciseId || 'unknown',
      'rolloutEligibility',
      'error',
      `${type} is eligible for production but has rejected or unsafe review metadata.`,
      'Block, reject, or complete safety approval before production generation can use this content.',
      {
        reviewStatus: item.reviewStatus,
        safetyReviewStatus: item.safetyReviewStatus,
        riskLevel: item.riskLevel,
        rolloutEligibility: item.rolloutEligibility,
      },
    ));
}

function rejectedButNotBlockedEntries(catalog, intelligence) {
  return collectReviewableItems(catalog, intelligence)
    .filter(({ item }) => item.reviewStatus === 'rejected' && item.rolloutEligibility !== 'blocked')
    .map(({ type, item }) => entry(
      type,
      item.id || item.sourceExerciseId || 'unknown',
      'rolloutEligibility',
      'error',
      `${type} is rejected but not blocked from rollout.`,
      'Set rolloutEligibility to blocked for rejected content, or move it back to draft only after an intentional revision.',
      {
        reviewStatus: item.reviewStatus,
        safetyReviewStatus: item.safetyReviewStatus,
        riskLevel: item.riskLevel,
        rolloutEligibility: item.rolloutEligibility,
      },
    ));
}

function productionExerciseSafetyEntries(catalog) {
  return catalog.exercises
    .filter(isProductionEligible)
    .filter((exercise) => !Array.isArray(exercise.safetyNotes) || exercise.safetyNotes.filter((note) => typeof note === 'string' && note.trim()).length === 0)
    .map((exercise) => entry(
      'Exercise',
      exercise.id,
      'safetyNotes',
      'error',
      `${exercise.id} is production-eligible but has no exercise-level safety notes.`,
      'Add specific safety notes before the exercise can be used in production generation.',
      {
        reviewStatus: exercise.reviewStatus,
        safetyReviewStatus: exercise.safetyReviewStatus,
        riskLevel: exercise.riskLevel,
        rolloutEligibility: exercise.rolloutEligibility,
      },
    ));
}

function productionExerciseSubstitutionEntries(catalog, intelligence) {
  const substitutionRuleSourceIds = ids(intelligence.substitutionRules.map((rule) => ({ id: rule.sourceExerciseId })));
  return catalog.exercises
    .filter(isProductionEligible)
    .filter((exercise) => (exercise.substitutionExerciseIds || []).length === 0 && !substitutionRuleSourceIds.has(exercise.id))
    .map((exercise) => entry(
      'Exercise',
      exercise.id,
      'substitutionExerciseIds',
      'error',
      `${exercise.id} is production-eligible but has no direct substitution links and no substitution rule.`,
      'Add substitutionExerciseIds or an authored SubstitutionRule when a safe intent-preserving replacement exists.',
      {
        reviewStatus: exercise.reviewStatus,
        rolloutEligibility: exercise.rolloutEligibility,
      },
    ));
}

function ruleIdsForTemplate(template, field, payloadField) {
  const topLevel = Array.isArray(template[field]) ? template[field] : [];
  const payload = template.payload && payloadField && Array.isArray(template.payload[payloadField])
    ? template.payload[payloadField]
    : [];
  return Array.from(new Set([...topLevel, ...payload]));
}

function productionPrescriptionRuleEntries(catalog) {
  const ruleRequirements = [
    ['progressionRuleIds', 'progressionRuleIds', 'progression rules'],
    ['regressionRuleIds', null, 'regression rules'],
    ['deloadRuleIds', null, 'deload rules'],
  ];
  return catalog.prescriptionTemplates
    .filter(isProductionEligible)
    .flatMap((template) => ruleRequirements
      .filter(([field, payloadField]) => ruleIdsForTemplate(template, field, payloadField).length === 0)
      .map(([field, , label]) => entry(
        'PrescriptionTemplate',
        template.id,
        field,
        'error',
        `${template.id} is production-eligible but has no ${label}.`,
        `Attach ${field} before this prescription can be used in production generation.`,
        {
          kind: template.kind,
          reviewStatus: template.reviewStatus,
          rolloutEligibility: template.rolloutEligibility,
        },
      )));
}

function productionMediaEntries(catalog) {
  return catalog.exercises
    .filter(isProductionEligible)
    .filter((exercise) => !hasMedia(exercise) || mediaReviewStatus(exercise) !== 'approved')
    .map((exercise) => entry(
      'Exercise',
      exercise.id,
      'media',
      'error',
      !hasMedia(exercise)
        ? `${exercise.id} is production-eligible but has no linked media asset.`
        : `${exercise.id} has production media hooks that are not approved.`,
      'Add approved thumbnailUrl, videoUrl, imageUrl, or animationUrl before release if media is required.',
      {
        mediaReviewStatus: mediaReviewStatus(exercise),
        hasAltText: Boolean(exercise.media && exercise.media.altText),
        hasMediaHooks: Boolean(exercise.media),
        reviewStatus: exercise.reviewStatus,
        rolloutEligibility: exercise.rolloutEligibility,
      },
    ));
}

function uniqueEntries(entries) {
  const seen = new Set();
  const output = [];
  for (const item of entries) {
    const key = entryKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function entryKey(item) {
  return `${item.type}:${item.id}:${item.field}:${item.message}`;
}

function reviewableItemsById(catalog, intelligence) {
  const byId = new Map();
  for (const { item } of collectReviewableItems(catalog, intelligence)) {
    const id = item.id || item.sourceExerciseId;
    if (id) byId.set(id, item);
  }
  return byId;
}

function isPreviewSafetyReviewValidationEntry(item, reviewableById) {
  const reviewable = reviewableById.get(item.id);
  return item.field === 'safetyReviewStatus'
    && typeof item.message === 'string'
    && item.message.includes('high risk without approved safety review')
    && reviewable
    && isPreviewGated(reviewable)
    && reviewable.reviewStatus !== 'rejected'
    && reviewable.safetyReviewStatus !== 'rejected';
}

function buildReleaseReport(input) {
  const {
    catalog,
    intelligence,
    errors,
    descriptionCompletenessErrors,
    productionBlockers,
    reviewBlockers,
    unsafeProductionEligible,
    gatedPreviewContent,
    suggestions,
  } = input;
  const productionItems = collectReviewableItems(catalog, intelligence).filter(({ item }) => isProductionEligible(item));
  const previewItems = collectReviewableItems(catalog, intelligence).filter(({ item }) => isPreviewGated(item));
  const productionDescriptionIds = new Set(
    intelligence.descriptionTemplates
      .filter(isProductionEligible)
      .map((template) => template.id),
  );
  const missingProductionDescriptions = descriptionCompletenessErrors
    .filter((item) => productionDescriptionIds.has(item.id))
    .map((item) => ({
      ...item,
      severity: 'error',
      message: `${item.message} This production-eligible description must be complete for release.`,
    }));
  const productionSafetyNotes = productionExerciseSafetyEntries(catalog);
  const productionSubstitutions = productionExerciseSubstitutionEntries(catalog, intelligence);
  const productionPrescriptionRules = productionPrescriptionRuleEntries(catalog);
  const missingProductionMedia = productionMediaEntries(catalog);
  const rejectedNotBlocked = rejectedButNotBlockedEntries(catalog, intelligence);
  const descriptionCompletenessKeys = new Set(descriptionCompletenessErrors.map(entryKey));
  const reviewableById = reviewableItemsById(catalog, intelligence);
  const releaseValidationErrors = errors.filter((item) => (
    !descriptionCompletenessKeys.has(entryKey(item))
    && !isPreviewSafetyReviewValidationEntry(item, reviewableById)
  ));
  const releaseReviewBlockers = uniqueEntries([
    ...reviewBlockers.filter((item) => item.details && item.details.rolloutEligibility === 'production'),
    ...rejectedNotBlocked,
  ]);
  const releaseProductionBlockers = uniqueEntries([
    ...releaseValidationErrors,
    ...productionBlockers,
    ...missingProductionDescriptions,
    ...productionSafetyNotes,
    ...productionSubstitutions,
    ...productionPrescriptionRules,
  ]);
  const productionReady = releaseProductionBlockers.length === 0
    && releaseReviewBlockers.length === 0
    && unsafeProductionEligible.length === 0
    && missingProductionMedia.length === 0;
  const recommendedFixes = uniqueEntries([
    ...releaseProductionBlockers,
    ...releaseReviewBlockers,
    ...unsafeProductionEligible,
    ...missingProductionMedia,
  ]).slice(0, 25).map((item) => item.suggestion).filter(Boolean);

  return {
    productionReady,
    productionBlockers: releaseProductionBlockers,
    reviewBlockers: releaseReviewBlockers,
    unsafeProductionEligible,
    missingProductionMedia,
    productionEligibleCounts: countByType(productionItems),
    previewGatedCounts: countByType(previewItems),
    previewGatedContent: gatedPreviewContent,
    recommendedFixes: recommendedFixes.length > 0 ? Array.from(new Set(recommendedFixes)) : suggestions,
  };
}

function tableCounts(rows) {
  return Object.fromEntries(Object.entries(rows).map(([table, values]) => [table, Array.isArray(values) ? values.length : 0]));
}

function buildAuditReport(projectRoot = process.cwd(), options = {}) {
  const workout = options.workoutModule || loadWorkoutProgramming(projectRoot);
  const catalog = options.catalog || workout.workoutProgrammingCatalog;
  const intelligence = options.intelligence || workout.workoutIntelligenceCatalog;
  const validationOptions = { catalog, intelligence };
  const validation = workout.validateWorkoutProgrammingContentPacks(validationOptions);
  const duplicateValidation = workout.validateNoDuplicateIds(validationOptions);
  const referenceValidation = workout.validateReferences(validationOptions);
  const prescriptionValidation = workout.validatePrescriptionPayloads(validationOptions);
  const descriptionValidation = workout.validateDescriptionCompleteness(validationOptions);
  const reviewReport = workout.getUnsafeOrUnreviewedContentReport(catalog, intelligence);
  const seedRows = workout.buildWorkoutProgrammingSeedRows(catalog);
  const substitutionRuleSourceIds = ids(intelligence.substitutionRules.map((rule) => ({ id: rule.sourceExerciseId })));
  const toneVariants = new Set(intelligence.descriptionTemplates.map((template) => template.toneVariant).filter(Boolean));
  const missingToneVariants = REQUIRED_TONE_VARIANTS.filter((tone) => !toneVariants.has(tone));

  const missingMedia = catalog.exercises
    .filter((exercise) => !hasMedia(exercise))
    .map((exercise) => entry(
      'Exercise',
      exercise.id,
      'media',
      'warning',
      exercise.media
        ? `${exercise.id} has media hooks but no linked media asset.`
        : `${exercise.id} has no linked media asset.`,
      'Add thumbnailUrl, videoUrl, imageUrl, or animationUrl before media-rich production surfaces rely on it.',
      {
        mediaReviewStatus: mediaReviewStatus(exercise),
        hasAltText: Boolean(exercise.media && exercise.media.altText),
        hasMediaHooks: Boolean(exercise.media),
      },
    ));

  const exercisesWithoutSubstitutions = catalog.exercises
    .filter((exercise) => (exercise.substitutionExerciseIds || []).length === 0 && !substitutionRuleSourceIds.has(exercise.id))
    .map((exercise) => entry(
      'Exercise',
      exercise.id,
      'substitutionExerciseIds',
      'warning',
      `${exercise.id} has no direct substitution links and no substitution rule.`,
      'Add substitutionExerciseIds or an authored SubstitutionRule when a safe intent-preserving replacement exists.',
    ));

  const prescriptionsWithoutProgressionRules = catalog.prescriptionTemplates
    .filter((template) => progressionRuleIdsForTemplate(template).length === 0)
    .map((template) => entry(
      'PrescriptionTemplate',
      template.id,
      'progressionRuleIds',
      'warning',
      `${template.id} has no progression rule IDs.`,
      'Attach progressionRuleIds when the prescription is intended to advance over time, or document why it should repeat.',
      { kind: template.kind },
    ));

  const missingToneEntries = missingToneVariants.map((tone) => entry(
    'DescriptionTemplate',
    tone,
    'toneVariant',
    'warning',
    `No description template currently covers tone variant ${tone}.`,
    'Add at least one high-quality description template for this tone variant.',
  ));

  const validationErrors = runtimeIssuesToEntries(validation.errors);
  const validationWarnings = runtimeIssuesToEntries(validation.warnings);
  const duplicateIdErrors = runtimeIssuesToEntries(duplicateValidation.errors);
  const orphanedReferenceErrors = runtimeIssuesToEntries(referenceValidation.errors);
  const prescriptionPayloadErrors = runtimeIssuesToEntries(prescriptionValidation.errors);
  const descriptionCompletenessErrors = runtimeIssuesToEntries(descriptionValidation.errors);
  const reviewBlockers = reviewIssuesToEntries(reviewReport.needingReview);
  const strictProductionBlockers = reviewIssuesToEntries(reviewReport.productionBlocking);
  const gatedPreviewContent = strictProductionBlockers
    .filter(isIntentionallyGatedPreviewIssue)
    .map(gatedPreviewWarning);
  const productionBlockers = strictProductionBlockers.filter((item) => !isIntentionallyGatedPreviewIssue(item));
  const unsafeProductionEligible = unsafeProductionEntries(catalog, intelligence);

  const errors = [
    ...validationErrors,
    ...duplicateIdErrors,
    ...orphanedReferenceErrors,
    ...prescriptionPayloadErrors,
    ...descriptionCompletenessErrors,
    ...productionBlockers,
    ...unsafeProductionEligible,
  ];
  const warnings = [
    ...validationWarnings,
    ...missingMedia,
    ...exercisesWithoutSubstitutions,
    ...prescriptionsWithoutProgressionRules,
    ...missingToneEntries,
    ...gatedPreviewContent,
    ...reviewBlockers.filter((item) => item.severity === 'warning'),
  ];

  const suggestions = [];
  if (errors.length > 0) suggestions.push('Fix validation errors and production blockers before release.');
  if (gatedPreviewContent.length > 0) suggestions.push('Preview/dev-only content is intentionally gated out of production; review and approve it before making it production-eligible.');
  if (missingMedia.length > 0) suggestions.push('Prioritize media for exercises used by beta or production UI flows.');
  if (exercisesWithoutSubstitutions.length > 0) suggestions.push('Add substitutions for commonly generated strength, cardio, and mobility exercises first.');
  if (prescriptionsWithoutProgressionRules.length > 0) suggestions.push('Attach progression rules to trainable prescriptions or mark repeat-only intent in coach notes.');
  if (missingToneVariants.length > 0) suggestions.push('Fill missing tone variants so coaching copy can match user preference.');
  if (suggestions.length === 0) suggestions.push('Content packs are ready for production review.');

  const release = buildReleaseReport({
    catalog,
    intelligence,
    errors,
    descriptionCompletenessErrors,
    productionBlockers,
    reviewBlockers,
    unsafeProductionEligible,
    gatedPreviewContent,
    suggestions,
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      catalog: {
        workoutTypes: catalog.workoutTypes.length,
        trainingGoals: catalog.trainingGoals.length,
        workoutFormats: catalog.workoutFormats.length,
        movementPatterns: catalog.movementPatterns.length,
        muscleGroups: catalog.muscleGroups.length,
        equipmentTypes: catalog.equipmentTypes.length,
        exercises: catalog.exercises.length,
        prescriptionTemplates: catalog.prescriptionTemplates.length,
        sessionTemplates: catalog.sessionTemplates.length,
        trackingMetrics: catalog.trackingMetrics.length,
        assessmentMetrics: catalog.assessmentMetrics.length,
      },
      intelligence: {
        progressionRules: intelligence.progressionRules.length,
        regressionRules: intelligence.regressionRules.length,
        deloadRules: intelligence.deloadRules.length,
        substitutionRules: intelligence.substitutionRules.length,
        safetyFlags: intelligence.safetyFlags.length,
        coachingCueSets: intelligence.coachingCueSets.length,
        commonMistakeSets: intelligence.commonMistakeSets.length,
        descriptionTemplates: intelligence.descriptionTemplates.length,
        validationRules: intelligence.validationRules.length,
      },
      seedRows: tableCounts(seedRows),
      errors: errors.length,
      warnings: warnings.length,
      reviewBlockers: reviewBlockers.length,
      productionBlockers: productionBlockers.length,
      gatedPreviewContent: gatedPreviewContent.length,
      duplicateIdErrors: duplicateIdErrors.length,
      orphanedReferenceErrors: orphanedReferenceErrors.length,
      missingMedia: missingMedia.length,
      exercisesWithoutSubstitutions: exercisesWithoutSubstitutions.length,
      prescriptionsWithoutProgressionRules: prescriptionsWithoutProgressionRules.length,
      missingToneVariants: missingToneVariants.length,
      unsafeProductionEligible: unsafeProductionEligible.length,
      productionReady: release.productionReady,
      releaseProductionBlockers: release.productionBlockers.length,
      releaseReviewBlockers: release.reviewBlockers.length,
      missingProductionMedia: release.missingProductionMedia.length,
    },
    errors,
    warnings,
    reviewBlockers,
    productionBlockers,
    gatedPreviewContent,
    duplicateIdErrors,
    orphanedReferenceErrors,
    missingMedia,
    exercisesWithoutSubstitutions,
    prescriptionsWithoutProgressionRules,
    missingToneVariants,
    unsafeProductionEligible,
    suggestions,
    release,
    productionReady: release.productionReady,
    missingProductionMedia: release.missingProductionMedia,
    productionEligibleCounts: release.productionEligibleCounts,
    previewGatedCounts: release.previewGatedCounts,
    recommendedFixes: release.recommendedFixes,
  };
}

function writeJsonOrHuman(report, args, humanFormatter) {
  const output = args.json ? `${JSON.stringify(report, null, 2)}\n` : humanFormatter(report, args);
  if (args.out) {
    const target = path.resolve(process.cwd(), args.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output, 'utf8');
    console.log(`Wrote ${target}`);
  } else {
    process.stdout.write(output);
  }
}

function formatEntries(title, entries, limit) {
  const lines = [`${title} (${entries.length})`];
  for (const item of entries.slice(0, limit)) {
    lines.push(`- [${item.severity}] ${item.type} ${item.id} ${item.field}: ${item.message}`);
    if (item.suggestion) lines.push(`  suggestion: ${item.suggestion}`);
  }
  if (entries.length > limit) lines.push(`- ... ${entries.length - limit} more`);
  return lines.join('\n');
}

function formatAuditReport(report, args = {}) {
  const limit = args.limit || 25;
  const lines = [
    'Workout Programming Content Audit',
    `Generated: ${report.generatedAt}`,
    '',
    'Summary',
    `- errors: ${report.summary.errors}`,
    `- warnings: ${report.summary.warnings}`,
    `- review blockers: ${report.summary.reviewBlockers}`,
    `- production blockers: ${report.summary.productionBlockers}`,
    `- gated preview/dev-only content: ${report.summary.gatedPreviewContent}`,
    `- duplicate ID errors: ${report.summary.duplicateIdErrors}`,
    `- orphaned reference errors: ${report.summary.orphanedReferenceErrors}`,
    `- missing media: ${report.summary.missingMedia}`,
    `- exercises without substitutions: ${report.summary.exercisesWithoutSubstitutions}`,
    `- prescriptions without progression rules: ${report.summary.prescriptionsWithoutProgressionRules}`,
    `- missing tone variants: ${report.summary.missingToneVariants}`,
    `- unsafe production-eligible content: ${report.summary.unsafeProductionEligible}`,
    `- release production ready: ${report.release.productionReady}`,
    `- release production blockers: ${report.release.productionBlockers.length}`,
    `- release review blockers: ${report.release.reviewBlockers.length}`,
    `- missing production media: ${report.release.missingProductionMedia.length}`,
    '',
    'Catalog Counts',
    ...Object.entries(report.summary.catalog).map(([key, value]) => `- ${key}: ${value}`),
    '',
    'Intelligence Counts',
    ...Object.entries(report.summary.intelligence).map(([key, value]) => `- ${key}: ${value}`),
    '',
    formatEntries('Errors', report.errors, limit),
    '',
    formatEntries('Warnings', report.warnings, limit),
    '',
    formatEntries('Review Blockers', report.reviewBlockers, limit),
    '',
    formatEntries('Production Blockers', report.productionBlockers, limit),
    '',
    formatEntries('Gated Preview/Dev-Only Content', report.gatedPreviewContent, limit),
    '',
    'Release Gate',
    `- productionReady: ${report.release.productionReady}`,
    `- production-eligible content: ${report.release.productionEligibleCounts.total}`,
    `- preview/dev-only gated content: ${report.release.previewGatedCounts.total}`,
    '',
    formatEntries('Release Production Blockers', report.release.productionBlockers, limit),
    '',
    formatEntries('Release Review Blockers', report.release.reviewBlockers, limit),
    '',
    formatEntries('Missing Production Media', report.release.missingProductionMedia, limit),
    '',
    'Suggestions',
    ...report.release.recommendedFixes.map((suggestion) => `- ${suggestion}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function formatValidationReport(report, args = {}) {
  const limit = args.limit || 25;
  const lines = [
    'Workout Programming Content Validation',
    `Generated: ${report.generatedAt}`,
    '',
    'Summary',
    `- errors: ${report.summary.errors}`,
    `- warnings: ${report.summary.warnings}`,
    `- production blockers: ${report.summary.productionBlockers}`,
    `- gated preview/dev-only content: ${report.summary.gatedPreviewContent}`,
    `- duplicate ID errors: ${report.summary.duplicateIdErrors}`,
    `- orphaned reference errors: ${report.summary.orphanedReferenceErrors}`,
    `- unsafe production-eligible content: ${report.summary.unsafeProductionEligible}`,
    `- release production ready: ${report.release.productionReady}`,
    `- release production blockers: ${report.release.productionBlockers.length}`,
    `- release review blockers: ${report.release.reviewBlockers.length}`,
    `- missing production media: ${report.release.missingProductionMedia.length}`,
    '',
    formatEntries('Errors', report.errors, limit),
    '',
    formatEntries('Warnings', report.warnings, limit),
    '',
    'Release Gate',
    `- productionReady: ${report.release.productionReady}`,
    `- production-eligible content: ${report.release.productionEligibleCounts.total}`,
    `- preview/dev-only gated content: ${report.release.previewGatedCounts.total}`,
    '',
    formatEntries('Release Production Blockers', report.release.productionBlockers, limit),
    '',
    formatEntries('Release Review Blockers', report.release.reviewBlockers, limit),
    '',
    formatEntries('Missing Production Media', report.release.missingProductionMedia, limit),
    '',
    'Suggestions',
    ...report.release.recommendedFixes.map((suggestion) => `- ${suggestion}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function shouldFail(report, args) {
  if (args.allowInvalid) {
    return false;
  }
  if (args.strict || args.release) {
    return !report.release.productionReady;
  }
  if (report.summary.errors > 0 || report.summary.productionBlockers > 0 || report.summary.unsafeProductionEligible > 0) {
    return true;
  }
  return Boolean(args.failOnWarnings) && report.summary.warnings > 0;
}

module.exports = {
  buildAuditReport,
  formatAuditReport,
  formatValidationReport,
  loadWorkoutProgramming,
  parseArgs,
  shouldFail,
  tableCounts,
  writeJsonOrHuman,
};
