-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;

-- Create updated policy that handles family recipes for cookiers
CREATE POLICY "Users can view accessible recipes" ON public.recipes
FOR SELECT
USING (
  -- User is the owner
  auth.uid() = owner_id
  OR 
  -- User is in the same family as the recipe
  (family_id IS NOT NULL AND family_id = get_user_family_id(auth.uid()))
  OR
  -- Cookier relationship: check if the recipe owner OR any member of the recipe's family shares with current user
  EXISTS (
    SELECT 1 FROM cookiers c
    WHERE c.status = 'accepted'
    AND (
      -- Direct owner relationship (for recipes without family)
      (
        recipes.family_id IS NULL 
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true)
          OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)
        )
      )
      OR
      -- Family recipe relationship: check if any member of the recipe's family is a cookier sharing recipes
      (
        recipes.family_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM family_members fm
          WHERE fm.family_id = recipes.family_id
          AND (
            (c.cookier_id = auth.uid() AND c.user_id = fm.user_id AND c.user_shares_recipes = true)
            OR (c.user_id = auth.uid() AND c.cookier_id = fm.user_id AND c.cookier_shares_recipes = true)
          )
        )
      )
    )
  )
);