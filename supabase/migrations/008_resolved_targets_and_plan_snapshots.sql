ALTER TABLE public.macro_ledger
    ADD COLUMN IF NOT EXISTS prescribed_calories INTEGER,
    ADD COLUMN IF NOT EXISTS target_source TEXT
        CHECK (target_source IN ('base', 'daily_activity_adjusted', 'weight_cut_protocol'));

UPDATE public.macro_ledger
SET prescribed_calories = COALESCE(
        prescribed_calories,
        (prescribed_protein * 4) + (prescribed_carbs * 4) + (prescribed_fats * 9)
    ),
    target_source = COALESCE(target_source, 'base')
WHERE prescribed_calories IS NULL OR target_source IS NULL;
