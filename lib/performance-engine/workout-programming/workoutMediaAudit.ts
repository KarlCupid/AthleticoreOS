import type {
  ContentRolloutEligibility,
  ContentReviewStatus,
  Exercise,
  ExerciseMedia,
  ExerciseMediaPriority,
  WorkoutProgrammingCatalog,
} from './types.ts';

export type ExerciseMediaAssetKind = 'thumbnail' | 'image' | 'video' | 'animation';

export interface ExerciseMediaAsset {
  kind: ExerciseMediaAssetKind;
  url: string;
  altText: string;
}

export interface ExerciseMediaAuditIssue {
  type: 'Exercise';
  id: string;
  name: string;
  field: 'media' | 'media.altText' | 'media.reviewStatus' | 'media.priority';
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
  details: {
    rolloutEligibility?: ContentRolloutEligibility;
    reviewStatus?: ContentReviewStatus;
    mediaReviewStatus?: ContentReviewStatus;
    mediaPriority?: ExerciseMediaPriority;
    missingReason?: string;
    hasMediaHooks: boolean;
    hasDemoAsset: boolean;
    hasImageAsset: boolean;
    hasAnyAsset: boolean;
    hasAltText: boolean;
  };
}

export interface WorkoutMediaAuditReport {
  generatedAt: string;
  summary: {
    exercises: number;
    exercisesWithMediaHooks: number;
    exercisesWithAnyAsset: number;
    productionExercisesMissingMedia: number;
    betaExercisesMissingMedia: number;
    missingAltText: number;
    unreviewedMedia: number;
    highPriorityExercisesWithoutDemoAssets: number;
    boxingExercisesNeedingMedia: number;
  };
  missingMedia: ExerciseMediaAuditIssue[];
  productionExercisesMissingMedia: ExerciseMediaAuditIssue[];
  betaExercisesMissingMedia: ExerciseMediaAuditIssue[];
  missingAltText: ExerciseMediaAuditIssue[];
  unreviewedMedia: ExerciseMediaAuditIssue[];
  highPriorityExercisesWithoutDemoAssets: ExerciseMediaAuditIssue[];
  boxingMediaReadiness: BoxingExerciseMediaReadinessReport;
}

export interface BoxingExerciseMediaReadinessItem {
  id: string;
  name: string;
  priority: ExerciseMediaPriority | 'unknown';
  hasAltText: boolean;
  hasMissingReason: boolean;
  safeTextOnlyFallbackAvailable: boolean;
  needsMedia: boolean;
}

export interface BoxingExerciseMediaReadinessReport {
  boxingExerciseCount: number;
  needingMediaCount: number;
  items: BoxingExerciseMediaReadinessItem[];
}

export interface BoxingExerciseMediaReleaseReadinessIssue {
  id: string;
  name: string;
  severity: 'warning' | 'error';
  reason: string;
}

export interface BoxingExerciseMediaReleaseReadinessReport {
  ready: boolean;
  productionMode: boolean;
  boxingExerciseCount: number;
  needingMediaCount: number;
  issues: BoxingExerciseMediaReleaseReadinessIssue[];
}

const ASSET_FIELDS = ['thumbnailUrl', 'imageUrl', 'videoUrl', 'animationUrl'] as const;

function cleanUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function hasExerciseMediaAsset(media: ExerciseMedia | undefined | null): boolean {
  return ASSET_FIELDS.some((field) => cleanUrl(media?.[field]) !== null);
}

export function hasExerciseDemoMediaAsset(media: ExerciseMedia | undefined | null): boolean {
  return cleanUrl(media?.videoUrl) !== null || cleanUrl(media?.animationUrl) !== null;
}

export function getPrimaryExerciseMediaAsset(media: ExerciseMedia | undefined | null): ExerciseMediaAsset | null {
  if (!media || media.reviewStatus !== 'approved') return null;
  const altText = cleanText(media.altText);
  if (!altText) return null;
  const candidates: Array<[ExerciseMediaAssetKind, unknown]> = [
    ['thumbnail', media.thumbnailUrl],
    ['image', media.imageUrl],
    ['video', media.videoUrl],
    ['animation', media.animationUrl],
  ];
  for (const [kind, value] of candidates) {
    const url = cleanUrl(value);
    if (url) return { kind, url, altText };
  }
  return null;
}

function isBetaExercise(exercise: Exercise): boolean {
  return exercise.rolloutEligibility === 'preview'
    || exercise.rolloutEligibility === 'dev_only'
    || exercise.reviewStatus === 'draft'
    || exercise.reviewStatus === 'needs_review';
}

function issueFor(
  exercise: Exercise,
  field: ExerciseMediaAuditIssue['field'],
  severity: ExerciseMediaAuditIssue['severity'],
  message: string,
  suggestion: string,
): ExerciseMediaAuditIssue {
  const media = exercise.media;
  const hasAnyAsset = hasExerciseMediaAsset(media);
  const details: ExerciseMediaAuditIssue['details'] = {
    hasMediaHooks: Boolean(media),
    hasDemoAsset: hasExerciseDemoMediaAsset(media),
    hasImageAsset: cleanUrl(media?.thumbnailUrl) !== null || cleanUrl(media?.imageUrl) !== null,
    hasAnyAsset,
    hasAltText: cleanText(media?.altText) !== null,
  };
  if (exercise.rolloutEligibility) details.rolloutEligibility = exercise.rolloutEligibility;
  if (exercise.reviewStatus) details.reviewStatus = exercise.reviewStatus;
  if (media?.reviewStatus) details.mediaReviewStatus = media.reviewStatus;
  if (media?.priority) details.mediaPriority = media.priority;
  if (media?.missingReason) details.missingReason = media.missingReason;
  return {
    type: 'Exercise',
    id: exercise.id,
    name: exercise.name,
    field,
    severity,
    message,
    suggestion,
    details,
  };
}

function isBoxingExercise(exercise: Exercise): boolean {
  return exercise.id.startsWith('boxing_');
}

function hasInstructionText(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim().length > 0);
}

export function auditBoxingExerciseMediaReadiness(catalog: WorkoutProgrammingCatalog): BoxingExerciseMediaReadinessReport {
  const items = catalog.exercises
    .filter(isBoxingExercise)
    .map((exercise): BoxingExerciseMediaReadinessItem => {
      const media = exercise.media;
      const needsMedia = !hasExerciseMediaAsset(media);
      const record = exercise as unknown as {
        setupInstructions?: unknown;
        executionInstructions?: unknown;
        safetyNotes?: unknown;
      };
      return {
        id: exercise.id,
        name: exercise.name,
        priority: media?.priority ?? 'unknown',
        hasAltText: cleanText(media?.altText) !== null,
        hasMissingReason: cleanText(media?.missingReason) !== null,
        safeTextOnlyFallbackAvailable: hasInstructionText(record.setupInstructions)
          && hasInstructionText(record.executionInstructions)
          && hasInstructionText(record.safetyNotes),
        needsMedia,
      };
    });
  return {
    boxingExerciseCount: items.length,
    needingMediaCount: items.filter((item) => item.needsMedia).length,
    items,
  };
}

export function auditBoxingExerciseMediaReleaseReadiness(
  catalog: WorkoutProgrammingCatalog,
  options: { productionMode?: boolean } = {},
): BoxingExerciseMediaReleaseReadinessReport {
  const productionMode = options.productionMode === true;
  const items = catalog.exercises.filter(isBoxingExercise);
  const issues: BoxingExerciseMediaReleaseReadinessIssue[] = [];

  for (const exercise of items) {
    const productionEligible = exercise.rolloutEligibility === 'production';
    if (!productionEligible) continue;
    const media = exercise.media;
    const hasAsset = hasExerciseMediaAsset(media);
    const hasAltText = cleanText(media?.altText) !== null;
    const hasMissingReason = cleanText(media?.missingReason) !== null;
    const record = exercise as unknown as {
      setupInstructions?: unknown;
      executionInstructions?: unknown;
      safetyNotes?: unknown;
    };
    const hasTextFallback = hasInstructionText(record.setupInstructions)
      && hasInstructionText(record.executionInstructions)
      && hasInstructionText(record.safetyNotes);

    if (!hasAsset && !hasTextFallback) {
      issues.push({
        id: exercise.id,
        name: exercise.name,
        severity: 'error',
        reason: 'Production boxing exercise has no media asset and no safe text-only fallback.',
      });
    }
    if (!hasAsset && !hasAltText) {
      issues.push({
        id: exercise.id,
        name: exercise.name,
        severity: 'error',
        reason: 'Missing boxing media needs alt text for the pending asset.',
      });
    }
    if (!hasAsset && !hasMissingReason) {
      issues.push({
        id: exercise.id,
        name: exercise.name,
        severity: 'error',
        reason: 'Missing boxing media needs a missingReason.',
      });
    }
    if (productionMode && media?.priority === 'high' && (!hasExerciseDemoMediaAsset(media) || media.reviewStatus !== 'approved')) {
      issues.push({
        id: exercise.id,
        name: exercise.name,
        severity: 'error',
        reason: 'High-priority production boxing exercise needs an approved demo asset.',
      });
    }
  }

  return {
    ready: issues.every((issue) => issue.severity !== 'error'),
    productionMode,
    boxingExerciseCount: items.length,
    needingMediaCount: items.filter((exercise) => !hasExerciseMediaAsset(exercise.media)).length,
    issues,
  };
}

export function auditWorkoutProgrammingExerciseMedia(
  catalog: WorkoutProgrammingCatalog,
  generatedAt = new Date().toISOString(),
): WorkoutMediaAuditReport {
  const missingMedia: ExerciseMediaAuditIssue[] = [];
  const productionExercisesMissingMedia: ExerciseMediaAuditIssue[] = [];
  const betaExercisesMissingMedia: ExerciseMediaAuditIssue[] = [];
  const missingAltText: ExerciseMediaAuditIssue[] = [];
  const unreviewedMedia: ExerciseMediaAuditIssue[] = [];
  const highPriorityExercisesWithoutDemoAssets: ExerciseMediaAuditIssue[] = [];

  for (const exercise of catalog.exercises) {
    const media = exercise.media;
    const hasAnyAsset = hasExerciseMediaAsset(media);
    const hasDemoAsset = hasExerciseDemoMediaAsset(media);
    const hasAltText = cleanText(media?.altText) !== null;

    if (!hasAnyAsset) {
      const missing = issueFor(
        exercise,
        'media',
        exercise.rolloutEligibility === 'production' ? 'error' : 'warning',
        media
          ? `${exercise.id} has media hooks but no linked media asset.`
          : `${exercise.id} has no linked media asset.`,
        media?.missingReason
          ? 'Keep the missing reason current until a reviewed thumbnail, image, video, or animation is attached.'
          : 'Add a reviewed thumbnail, image, video, or animation, or document media.missingReason while the asset is in production.',
      );
      missingMedia.push(missing);
      if (exercise.rolloutEligibility === 'production') productionExercisesMissingMedia.push(missing);
      else if (isBetaExercise(exercise)) betaExercisesMissingMedia.push(missing);
    }

    if (hasAnyAsset && !hasAltText) {
      missingAltText.push(issueFor(
        exercise,
        'media.altText',
        'error',
        `${exercise.id} has a media asset without alt text.`,
        'Add concise media.altText that describes the visible exercise setup and action.',
      ));
    }

    if (hasAnyAsset && media?.reviewStatus !== 'approved') {
      unreviewedMedia.push(issueFor(
        exercise,
        'media.reviewStatus',
        exercise.rolloutEligibility === 'production' ? 'error' : 'warning',
        `${exercise.id} has media assets that are not approved for release.`,
        'Review the media for correctness, safety, and accessibility, then set media.reviewStatus to approved.',
      ));
    }

    if (media?.priority === 'high' && !hasDemoAsset) {
      highPriorityExercisesWithoutDemoAssets.push(issueFor(
        exercise,
        'media.priority',
        exercise.rolloutEligibility === 'production' ? 'error' : 'warning',
        `${exercise.id} is high-priority for media but has no demo video or animation.`,
        'Produce a reviewed videoUrl or animationUrl for high-priority exercises before relying on media-rich production surfaces.',
      ));
    }
  }
  const boxingMediaReadiness = auditBoxingExerciseMediaReadiness(catalog);

  return {
    generatedAt,
    summary: {
      exercises: catalog.exercises.length,
      exercisesWithMediaHooks: catalog.exercises.filter((exercise) => Boolean(exercise.media)).length,
      exercisesWithAnyAsset: catalog.exercises.filter((exercise) => hasExerciseMediaAsset(exercise.media)).length,
      productionExercisesMissingMedia: productionExercisesMissingMedia.length,
      betaExercisesMissingMedia: betaExercisesMissingMedia.length,
      missingAltText: missingAltText.length,
      unreviewedMedia: unreviewedMedia.length,
      highPriorityExercisesWithoutDemoAssets: highPriorityExercisesWithoutDemoAssets.length,
      boxingExercisesNeedingMedia: boxingMediaReadiness.needingMediaCount,
    },
    missingMedia,
    productionExercisesMissingMedia,
    betaExercisesMissingMedia,
    missingAltText,
    unreviewedMedia,
    highPriorityExercisesWithoutDemoAssets,
    boxingMediaReadiness,
  };
}
