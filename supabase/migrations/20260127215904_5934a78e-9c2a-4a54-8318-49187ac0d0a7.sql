-- Add meal type visibility settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN show_morning_meals boolean NOT NULL DEFAULT true,
ADD COLUMN show_noon_meals boolean NOT NULL DEFAULT true,
ADD COLUMN show_evening_meals boolean NOT NULL DEFAULT true;

-- Update existing users to have all meal types visible (already handled by DEFAULT true)