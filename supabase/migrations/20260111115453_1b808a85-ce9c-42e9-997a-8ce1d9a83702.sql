
-- Table des rayons (aisles) avec les 15 plus courants
CREATE TABLE public.aisles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  icon TEXT
);

-- Insérer les 15 rayons les plus courants
INSERT INTO public.aisles (name, position, icon) VALUES
  ('Fruits et légumes', 1, '🥬'),
  ('Viande', 2, '🥩'),
  ('Poisson et fruits de mer', 3, '🐟'),
  ('Charcuterie', 4, '🥓'),
  ('Produits laitiers', 5, '🧀'),
  ('Crèmerie', 6, '🥛'),
  ('Boulangerie', 7, '🥖'),
  ('Épicerie salée', 8, '🍝'),
  ('Épicerie sucrée', 9, '🍫'),
  ('Surgelés', 10, '❄️'),
  ('Boissons', 11, '🥤'),
  ('Condiments et sauces', 12, '🫒'),
  ('Conserves', 13, '🥫'),
  ('Hygiène et entretien', 14, '🧴'),
  ('Autres', 15, '📦');

-- RLS pour les rayons (lecture seule pour tous)
ALTER TABLE public.aisles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aisles are viewable by everyone" 
ON public.aisles 
FOR SELECT 
USING (true);

-- Table des éléments de la liste de course
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit_id UUID REFERENCES public.units(id),
  aisle_id UUID REFERENCES public.aisles(id),
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_shopping_list_items_user_id ON public.shopping_list_items(user_id);
CREATE INDEX idx_shopping_list_items_aisle_id ON public.shopping_list_items(aisle_id);

-- RLS pour la liste de course
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping list items" 
ON public.shopping_list_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping list items" 
ON public.shopping_list_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items" 
ON public.shopping_list_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" 
ON public.shopping_list_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_shopping_list_items_updated_at
BEFORE UPDATE ON public.shopping_list_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
