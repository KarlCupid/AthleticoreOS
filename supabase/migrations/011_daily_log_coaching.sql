-- Daily Log Coaching v1: reflection fields + persisted coaching debrief payload.
-- All additions are nullable/default-safe for backward compatibility.

ALTER TABLE public.daily_checkins
    ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS soreness_level INTEGER CHECK (soreness_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS primary_limiter TEXT CHECK (
        primary_limiter IN ('sleep', 'stress', 'soreness', 'nutrition', 'hydration', 'time', 'none')
    ),
    ADD COLUMN IF NOT EXISTS nutrition_barrier TEXT CHECK (
        nutrition_barrier IN ('appetite', 'timing', 'cravings', 'prep', 'social', 'none')
    ),
    ADD COLUMN IF NOT EXISTS coaching_focus TEXT CHECK (
        coaching_focus IN ('recovery', 'execution', 'consistency', 'nutrition')
    ),
    ADD COLUMN IF NOT EXISTS coach_debrief JSONB;
