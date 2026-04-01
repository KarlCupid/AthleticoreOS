ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'custom' CHECK (source IN ('usda', 'open_food_facts', 'custom')),
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'custom' CHECK (source_type IN ('ingredient', 'packaged', 'custom')),
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'serving',
  ADD COLUMN IF NOT EXISTS grams_per_portion NUMERIC,
  ADD COLUMN IF NOT EXISTS portion_options JSONB DEFAULT '[]'::jsonb;

UPDATE public.food_items
SET
  source = COALESCE(
    source,
    CASE
      WHEN off_barcode IS NOT NULL THEN 'open_food_facts'
      ELSE 'custom'
    END
  ),
  source_type = COALESCE(
    source_type,
    CASE
      WHEN user_id IS NOT NULL THEN 'custom'
      WHEN off_barcode IS NOT NULL THEN 'packaged'
      ELSE 'ingredient'
    END
  ),
  verified = COALESCE(verified, off_barcode IS NOT NULL OR user_id IS NOT NULL),
  base_amount = COALESCE(base_amount, 1),
  base_unit = COALESCE(base_unit, 'serving'),
  grams_per_portion = COALESCE(grams_per_portion, serving_size_g),
  portion_options = CASE
    WHEN portion_options IS NULL OR portion_options = '[]'::jsonb THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', 'default',
          'label', COALESCE(serving_label, 'serving'),
          'amount', COALESCE(base_amount, 1),
          'unit', COALESCE(base_unit, 'serving'),
          'grams', COALESCE(serving_size_g, 100),
          'isDefault', TRUE
        )
      )
    ELSE portion_options
  END;

ALTER TABLE public.food_log
  ADD COLUMN IF NOT EXISTS amount_value NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amount_unit TEXT DEFAULT 'serving',
  ADD COLUMN IF NOT EXISTS grams NUMERIC,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('usda', 'open_food_facts', 'custom')),
  ADD COLUMN IF NOT EXISTS nutrition_snapshot JSONB;

UPDATE public.food_log AS food_log
SET
  amount_value = COALESCE(food_log.amount_value, food_log.servings, 1),
  amount_unit = COALESCE(food_log.amount_unit, 'serving'),
  grams = COALESCE(
    food_log.grams,
    CASE
      WHEN food_items.serving_size_g IS NOT NULL THEN food_log.servings * food_items.serving_size_g
      ELSE NULL
    END
  ),
  source = COALESCE(
    food_log.source,
    food_items.source,
    CASE
      WHEN food_items.off_barcode IS NOT NULL THEN 'open_food_facts'
      ELSE 'custom'
    END
  ),
  nutrition_snapshot = COALESCE(
    food_log.nutrition_snapshot,
    jsonb_build_object(
      'source', COALESCE(food_items.source, CASE WHEN food_items.off_barcode IS NOT NULL THEN 'open_food_facts' ELSE 'custom' END),
      'sourceType', COALESCE(food_items.source_type, CASE WHEN food_items.off_barcode IS NOT NULL THEN 'packaged' ELSE 'custom' END),
      'external_id', food_items.external_id,
      'verified', COALESCE(food_items.verified, food_items.off_barcode IS NOT NULL OR food_items.user_id IS NOT NULL),
      'name', food_items.name,
      'brand', food_items.brand,
      'image_url', food_items.image_url,
      'baseAmount', COALESCE(food_items.base_amount, 1),
      'baseUnit', COALESCE(food_items.base_unit, 'serving'),
      'gramsPerPortion', COALESCE(food_items.grams_per_portion, food_items.serving_size_g),
      'portionOptions', CASE
        WHEN food_items.portion_options IS NULL OR food_items.portion_options = '[]'::jsonb THEN
          jsonb_build_array(
            jsonb_build_object(
              'id', 'default',
              'label', COALESCE(food_items.serving_label, 'serving'),
              'amount', COALESCE(food_items.base_amount, 1),
              'unit', COALESCE(food_items.base_unit, 'serving'),
              'grams', COALESCE(food_items.serving_size_g, 100),
              'isDefault', TRUE
            )
          )
        ELSE food_items.portion_options
      END,
      'serving_size_g', COALESCE(food_items.serving_size_g, 100),
      'serving_label', COALESCE(food_items.serving_label, 'serving'),
      'calories_per_serving', COALESCE(food_items.calories_per_serving, 0),
      'protein_per_serving', COALESCE(food_items.protein_per_serving, 0),
      'carbs_per_serving', COALESCE(food_items.carbs_per_serving, 0),
      'fat_per_serving', COALESCE(food_items.fat_per_serving, 0),
      'is_supplement', COALESCE(food_items.is_supplement, FALSE)
    )
  )
FROM public.food_items
WHERE food_items.id = food_log.food_item_id;

CREATE UNIQUE INDEX IF NOT EXISTS food_items_source_external_id_key
  ON public.food_items (source, external_id)
  WHERE external_id IS NOT NULL;
