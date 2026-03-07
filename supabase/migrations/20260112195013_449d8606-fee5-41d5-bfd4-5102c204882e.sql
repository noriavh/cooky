-- Fix RLS policy for families table to allow selecting newly created family

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their family" ON public.families;

-- Create a new SELECT policy that allows viewing:
-- 1. The family the user belongs to
-- 2. Families where the user is the creator (for immediate access after creation)
CREATE POLICY "Users can view their family" ON public.families
FOR SELECT USING (
  id = get_user_family_id(auth.uid())
  OR created_by = auth.uid()
);