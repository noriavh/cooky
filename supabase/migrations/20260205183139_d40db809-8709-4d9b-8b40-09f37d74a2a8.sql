-- Create table for product seasons (which months a product is in season)
CREATE TABLE public.product_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shopping_products(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, month)
);

-- Enable RLS
ALTER TABLE public.product_seasons ENABLE ROW LEVEL SECURITY;

-- Everyone can view product seasons (public data)
CREATE POLICY "Product seasons are viewable by everyone" 
ON public.product_seasons 
FOR SELECT 
USING (true);

-- Only admins can manage product seasons (via edge function with service role)
-- No direct insert/update/delete policies for regular users

-- Create index for efficient lookups
CREATE INDEX idx_product_seasons_product_id ON public.product_seasons(product_id);
CREATE INDEX idx_product_seasons_month ON public.product_seasons(month);
