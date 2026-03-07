
-- Activer l'extension pour la recherche floue
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Table des produits de course (base de référence)
CREATE TABLE public.shopping_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id),
  aisle_id UUID REFERENCES public.aisles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Index pour les recherches
CREATE INDEX idx_shopping_products_user_id ON public.shopping_products(user_id);
CREATE INDEX idx_shopping_products_name ON public.shopping_products USING gin(name gin_trgm_ops);

-- RLS pour les produits
ALTER TABLE public.shopping_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products" 
ON public.shopping_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own products" 
ON public.shopping_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.shopping_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
ON public.shopping_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_shopping_products_updated_at
BEFORE UPDATE ON public.shopping_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter une référence optionnelle au produit dans shopping_list_items
ALTER TABLE public.shopping_list_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.shopping_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_product_id ON public.shopping_list_items(product_id);
