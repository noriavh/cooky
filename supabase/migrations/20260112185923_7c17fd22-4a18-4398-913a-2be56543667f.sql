-- Add new recipe types to the enum
ALTER TYPE public.recipe_type ADD VALUE IF NOT EXISTS 'petit_dejeuner';
ALTER TYPE public.recipe_type ADD VALUE IF NOT EXISTS 'gouter';