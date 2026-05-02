-- Workout programming content review metadata.
-- Forward-only rollout gate for static programming content. Static content remains
-- public read-only through the existing RLS policies; user-specific workout data
-- remains protected by the earlier user-scoped RLS migrations.

DO $$
DECLARE
  content_table TEXT;
BEGIN
  FOREACH content_table IN ARRAY ARRAY[
    'programming_exercises',
    'prescription_templates',
    'description_templates',
    'progression_rules',
    'regression_rules',
    'deload_rules',
    'substitution_rules',
    'safety_flags',
    'validation_rules'
  ]
  LOOP
    EXECUTE format($sql$
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'needs_review'
          CHECK (review_status IN ('draft', 'needs_review', 'approved', 'rejected')),
        ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS review_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS safety_review_status TEXT NOT NULL DEFAULT 'not_required'
          CHECK (safety_review_status IN ('not_required', 'needs_review', 'approved', 'rejected')),
        ADD COLUMN IF NOT EXISTS content_version TEXT NOT NULL DEFAULT '1.0.0',
        ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'moderate'
          CHECK (risk_level IN ('low', 'moderate', 'high')),
        ADD COLUMN IF NOT EXISTS rollout_eligibility TEXT NOT NULL DEFAULT 'preview'
          CHECK (rollout_eligibility IN ('dev_only', 'preview', 'production', 'blocked'))
    $sql$, content_table);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = format('%s_content_review_rejected_blocked_chk', content_table)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (review_status <> ''rejected'' OR rollout_eligibility = ''blocked'')',
        content_table,
        format('%s_content_review_rejected_blocked_chk', content_table)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = format('%s_content_review_high_risk_safety_chk', content_table)
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (rollout_eligibility <> ''production'' OR risk_level <> ''high'' OR safety_review_status = ''approved'')',
        content_table,
        format('%s_content_review_high_risk_safety_chk', content_table)
      );
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(review_status, rollout_eligibility)',
      format('idx_%s_content_review_status', content_table),
      content_table
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(risk_level, safety_review_status)',
      format('idx_%s_safety_review_status', content_table),
      content_table
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(last_updated_at DESC)',
      format('idx_%s_content_review_updated', content_table),
      content_table
    );
  END LOOP;
END $$;

COMMENT ON COLUMN public.programming_exercises.review_status IS
  'Content review gate for workout-programming static catalog records: draft, needs_review, approved, or rejected.';
COMMENT ON COLUMN public.programming_exercises.safety_review_status IS
  'Programming safety review status. High-risk production content must be explicitly safety-approved.';
COMMENT ON COLUMN public.programming_exercises.rollout_eligibility IS
  'Maximum rollout channel for this content: dev_only, preview, production, or blocked.';

NOTIFY pgrst, 'reload schema';
