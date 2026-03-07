-- Fix recipe visibility for cookier-sharing when recipes belong to a family.
-- Previous policy relied on reading public.family_members inside the recipes RLS policy,
-- which fails for non-family viewers because family_members has its own RLS restrictions.
-- We instead use the existing SECURITY DEFINER function public.is_family_member(),
-- which bypasses RLS safely for this membership check.

DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;

CREATE POLICY "Users can view accessible recipes"
ON public.recipes
FOR SELECT
USING (
  -- 1) Owner can always view
  auth.uid() = owner_id

  OR

  -- 2) Same-family access
  (
    family_id IS NOT NULL
    AND family_id = public.get_user_family_id(auth.uid())
  )

  OR

  -- 3) Cookier sharing for non-family (personal) recipes
  (
    family_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.cookiers c
      WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = owner_id AND c.user_shares_recipes = true)
          OR
          (c.user_id = auth.uid() AND c.cookier_id = owner_id AND c.cookier_shares_recipes = true)
        )
    )
  )

  OR

  -- 4) Cookier sharing for family recipes: viewer can see a family's recipes if they are
  --    cookiers with ANY member of that family who shares recipes with them.
  (
    family_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.cookiers c
      WHERE c.status = 'accepted'
        AND (
          (
            c.cookier_id = auth.uid()
            AND c.user_shares_recipes = true
            AND public.is_family_member(c.user_id, recipes.family_id)
          )
          OR
          (
            c.user_id = auth.uid()
            AND c.cookier_shares_recipes = true
            AND public.is_family_member(c.cookier_id, recipes.family_id)
          )
        )
    )
  )
);
