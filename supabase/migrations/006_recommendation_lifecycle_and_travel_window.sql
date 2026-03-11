-- Fight Camp v1.1: recommendation lifecycle + travel window constraints

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_status TEXT
  CHECK (recommendation_status IN ('pending', 'accepted', 'declined', 'completed'));

UPDATE public.scheduled_activities
SET recommendation_status = CASE
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'skipped' THEN 'declined'
  WHEN recommendation_severity IS NOT NULL THEN 'pending'
  ELSE NULL
END
WHERE recommendation_status IS NULL;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS travel_end_date DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fight_camps_travel_window_check'
      AND conrelid = 'public.fight_camps'::regclass
  ) THEN
    ALTER TABLE public.fight_camps
      ADD CONSTRAINT fight_camps_travel_window_check
      CHECK (
        travel_start_date IS NULL
        OR travel_end_date IS NULL
        OR travel_end_date >= travel_start_date
      );
  END IF;
END $$;
