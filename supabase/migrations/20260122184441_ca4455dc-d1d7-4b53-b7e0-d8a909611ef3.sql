-- Add has_seen_guide column to profiles table to track if user has seen the guide
ALTER TABLE public.profiles 
ADD COLUMN has_seen_guide BOOLEAN NOT NULL DEFAULT false;