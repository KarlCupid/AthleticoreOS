-- Reassert PR-log exercise relationship and refresh PostgREST's schema cache.
-- Embedded selects like exercise_pr_log -> exercise_library require FK metadata.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.exercise_pr_log'::regclass
      AND c.confrelid = 'public.exercise_library'::regclass
      AND a.attname = 'exercise_library_id'
  ) THEN
    ALTER TABLE public.exercise_pr_log
      ADD CONSTRAINT exercise_pr_log_exercise_library_id_fkey
      FOREIGN KEY (exercise_library_id)
      REFERENCES public.exercise_library(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
