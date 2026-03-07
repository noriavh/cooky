-- Drop the existing ALL policy for admins and create separate policies for each operation
DROP POLICY IF EXISTS "Admins can manage global products" ON public.shopping_products;

-- Create policy for admins to SELECT global products
CREATE POLICY "Admins can view global products"
ON public.shopping_products
FOR SELECT
USING (is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL);

-- Create policy for admins to INSERT global products
CREATE POLICY "Admins can create global products"
ON public.shopping_products
FOR INSERT
WITH CHECK (is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL);

-- Create policy for admins to UPDATE global products
CREATE POLICY "Admins can update global products"
ON public.shopping_products
FOR UPDATE
USING (is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL)
WITH CHECK (is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL);

-- Create policy for admins to DELETE global products
CREATE POLICY "Admins can delete global products"
ON public.shopping_products
FOR DELETE
USING (is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL);