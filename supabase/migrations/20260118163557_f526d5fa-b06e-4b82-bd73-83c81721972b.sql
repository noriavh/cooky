-- Allow recipe_id to be nullable and add custom_text column for manual meal entries
ALTER TABLE public.meal_plans 
  ALTER COLUMN recipe_id DROP NOT NULL;

ALTER TABLE public.meal_plans 
  ADD COLUMN custom_text TEXT;

-- Add a check constraint to ensure either recipe_id or custom_text is set
ALTER TABLE public.meal_plans 
  ADD CONSTRAINT meal_plans_recipe_or_custom_text 
  CHECK (recipe_id IS NOT NULL OR custom_text IS NOT NULL);