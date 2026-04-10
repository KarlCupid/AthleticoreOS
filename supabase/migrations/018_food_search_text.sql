ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';

UPDATE public.food_items
SET search_text = lower(
  trim(
    regexp_replace(
      concat_ws(' ', coalesce(name, ''), coalesce(brand, ''), coalesce(serving_label, '')),
      '\s+',
      ' ',
      'g'
    )
  )
)
WHERE search_text = '';
