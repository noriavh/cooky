-- Add copied_from_id column to track copied recipes
ALTER TABLE public.recipes 
ADD COLUMN copied_from_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_recipes_copied_from_id ON public.recipes(copied_from_id);