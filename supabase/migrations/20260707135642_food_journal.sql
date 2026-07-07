-- Journal alimentaire : strictement personnel (user_id uniquement, pas de family_id)

-- 1. Repas (un par slot et par jour)
CREATE TABLE public.journal_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('morning', 'noon', 'evening', 'custom')),
  slot_name TEXT,
  score TEXT CHECK (score IN ('green', 'orange', 'red')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT journal_meals_slot_name_coherence CHECK (
    (slot_type = 'custom' AND slot_name IS NOT NULL AND btrim(slot_name) <> '')
    OR (slot_type <> 'custom' AND slot_name IS NULL)
  )
);

-- Un seul repas par slot par défaut et par jour
CREATE UNIQUE INDEX journal_meals_default_slot_unique
  ON public.journal_meals (user_id, date, slot_type)
  WHERE slot_type <> 'custom';

-- Un seul slot custom du même nom par jour (insensible à la casse)
CREATE UNIQUE INDEX journal_meals_custom_slot_unique
  ON public.journal_meals (user_id, date, lower(slot_name))
  WHERE slot_type = 'custom';

CREATE INDEX idx_journal_meals_user_date ON public.journal_meals (user_id, date);

-- 2. Ingrédients consommés
CREATE TABLE public.journal_meal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES public.journal_meals(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE RESTRICT,
  source_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (meal_id, product_id)
);

CREATE INDEX idx_journal_meal_items_meal ON public.journal_meal_items (meal_id);
CREATE INDEX idx_journal_meal_items_product ON public.journal_meal_items (product_id);

-- 3. RLS
ALTER TABLE public.journal_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal meals"
ON public.journal_meals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journal meals"
ON public.journal_meals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal meals"
ON public.journal_meals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal meals"
ON public.journal_meals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own journal meal items"
ON public.journal_meal_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.journal_meals m
  WHERE m.id = meal_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users can create their own journal meal items"
ON public.journal_meal_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.journal_meals m
  WHERE m.id = meal_id AND m.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own journal meal items"
ON public.journal_meal_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.journal_meals m
  WHERE m.id = meal_id AND m.user_id = auth.uid()
));

-- 4. Trigger updated_at
CREATE TRIGGER update_journal_meals_updated_at
BEFORE UPDATE ON public.journal_meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
