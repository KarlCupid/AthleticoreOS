-- Restore profile fitness fields for projects created before 000_core_base
-- included them. Onboarding and fitness assessment both write these columns.

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS fitness_level TEXT DEFAULT 'intermediate';

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS fitness_score NUMERIC;

UPDATE public.athlete_profiles
SET fitness_level = 'intermediate'
WHERE fitness_level IS NULL;

DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'athlete_profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%fitness_level%'
  LOOP
    EXECUTE format('ALTER TABLE public.athlete_profiles DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD CONSTRAINT athlete_profiles_fitness_level_check
  CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite'));
