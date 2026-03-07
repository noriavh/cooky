-- Create typical_week_meals table for storing the template week
CREATE TABLE public.typical_week_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Monday, 6 = Sunday
  meal_type TEXT NOT NULL CHECK (meal_type IN ('morning', 'noon', 'evening')),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  servings INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.typical_week_meals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own typical meals"
ON public.typical_week_meals FOR SELECT
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can create their own typical meals"
ON public.typical_week_meals FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own typical meals"
ON public.typical_week_meals FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can delete their own typical meals"
ON public.typical_week_meals FOR DELETE
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

-- Trigger for updated_at
CREATE TRIGGER update_typical_week_meals_updated_at
BEFORE UPDATE ON public.typical_week_meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();