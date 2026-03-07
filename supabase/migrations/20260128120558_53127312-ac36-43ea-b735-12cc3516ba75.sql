-- Remove the has_seen_guide column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_seen_guide;