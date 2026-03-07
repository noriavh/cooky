-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()));

-- Create table for global product requests
CREATE TABLE public.product_global_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.shopping_products(id) ON DELETE CASCADE NOT NULL,
    requested_by uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    processed_at timestamp with time zone,
    processed_by uuid,
    UNIQUE (product_id)
);

-- Enable RLS on product_global_requests
ALTER TABLE public.product_global_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_global_requests
CREATE POLICY "Users can view their own requests"
ON public.product_global_requests
FOR SELECT
USING (auth.uid() = requested_by);

CREATE POLICY "Admins can view all requests"
ON public.product_global_requests
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create requests for their own products"
ON public.product_global_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by AND
  EXISTS (
    SELECT 1 FROM public.shopping_products
    WHERE id = product_id AND (user_id = auth.uid() OR (family_id IS NOT NULL AND family_id = get_user_family_id(auth.uid())))
  )
);

CREATE POLICY "Users can delete their own pending requests"
ON public.product_global_requests
FOR DELETE
USING (auth.uid() = requested_by AND status = 'pending');

CREATE POLICY "Admins can update requests"
ON public.product_global_requests
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Update shopping_products policies to allow admins to manage global products
CREATE POLICY "Admins can manage global products"
ON public.shopping_products
FOR ALL
USING (public.is_admin(auth.uid()) AND user_id IS NULL AND family_id IS NULL);

-- Insert admin role for the specified user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'benoit.valkenberg@gmail.com'
ON CONFLICT DO NOTHING;