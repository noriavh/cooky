-- Add product_id column to ingredients table
ALTER TABLE public.ingredients
ADD COLUMN product_id uuid REFERENCES public.shopping_products(id);

-- Create index for better query performance
CREATE INDEX idx_ingredients_product_id ON public.ingredients(product_id);