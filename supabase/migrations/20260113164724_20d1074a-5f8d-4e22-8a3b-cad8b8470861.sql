-- Create a table for user/family aisle ordering
CREATE TABLE public.user_aisle_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aisle_id UUID NOT NULL REFERENCES public.aisles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aisle_id, user_id, family_id),
  UNIQUE(aisle_id, family_id) -- Ensure only one order per aisle per family
);

-- Create an index for faster lookups
CREATE INDEX idx_user_aisle_orders_user ON public.user_aisle_orders(user_id);
CREATE INDEX idx_user_aisle_orders_family ON public.user_aisle_orders(family_id);

-- Enable Row Level Security
ALTER TABLE public.user_aisle_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders or their family's orders
CREATE POLICY "Users can view their own or family aisle orders" 
ON public.user_aisle_orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
);

-- Users can insert their own orders (family members can insert for family)
CREATE POLICY "Users can insert aisle orders" 
ON public.user_aisle_orders 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- Users can update their own orders or their family's orders
CREATE POLICY "Users can update their own or family aisle orders" 
ON public.user_aisle_orders 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
);

-- Users can delete their own orders or their family's orders
CREATE POLICY "Users can delete their own or family aisle orders" 
ON public.user_aisle_orders 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND public.is_family_member(family_id, auth.uid()))
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_aisle_orders_updated_at
BEFORE UPDATE ON public.user_aisle_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();