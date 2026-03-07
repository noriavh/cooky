-- Allow user_id to be nullable (NULL = global product)
ALTER TABLE public.shopping_products ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.shopping_products;

-- Create new RLS policies

-- Everyone can view global products (user_id IS NULL) and their own products
CREATE POLICY "Users can view global and own products" 
ON public.shopping_products 
FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

-- Users can only create their own products (user_id must match)
CREATE POLICY "Users can create their own products" 
ON public.shopping_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own products (not global ones)
CREATE POLICY "Users can update their own products" 
ON public.shopping_products 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own products (not global ones)
CREATE POLICY "Users can delete their own products" 
ON public.shopping_products 
FOR DELETE 
USING (auth.uid() = user_id);