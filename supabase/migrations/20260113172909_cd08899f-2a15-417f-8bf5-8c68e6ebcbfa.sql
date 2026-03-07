-- Create diet enum type
CREATE TYPE public.diet_type AS ENUM ('none', 'pescetarian', 'vegetarian', 'vegan');

-- Add diet column to recipes table
ALTER TABLE public.recipes
ADD COLUMN diet public.diet_type DEFAULT 'none';

-- Add diet column to profiles table for user preference
ALTER TABLE public.profiles
ADD COLUMN diet public.diet_type DEFAULT NULL;