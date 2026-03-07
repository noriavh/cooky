-- Add source_url column to recipes table to store the original URL when importing
ALTER TABLE public.recipes ADD COLUMN source_url TEXT;