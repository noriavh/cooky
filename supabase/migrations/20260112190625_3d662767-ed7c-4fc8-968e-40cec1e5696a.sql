-- Drop the unique constraint on (user_id, date, meal_type) to allow multiple recipes per slot
-- First, find and drop the constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.meal_plans'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 3;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.meal_plans DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add an index for efficient querying by user, date, and meal_type
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date_meal ON public.meal_plans (user_id, date, meal_type);