-- Create essential_products table for storing user's regular shopping products
CREATE TABLE public.essential_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  quantity NUMERIC,
  unit_id UUID REFERENCES public.units(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id, product_id)
);

-- Enable RLS
ALTER TABLE public.essential_products ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own essential products"
ON public.essential_products FOR SELECT
USING (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can create their own essential products"
ON public.essential_products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essential products"
ON public.essential_products FOR UPDATE
USING (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can delete their own essential products"
ON public.essential_products FOR DELETE
USING (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);