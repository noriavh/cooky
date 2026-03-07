-- Drop existing RLS policies on recipe_tags
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can manage tags on accessible recipes" ON public.recipe_tags;

-- Recreate SELECT policy including cookier access
CREATE POLICY "Users can view recipe tags for accessible recipes" 
ON public.recipe_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      -- Owner access
      recipes.owner_id = auth.uid()
      -- Direct share access
      OR EXISTS (
        SELECT 1 FROM recipe_shares
        WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with = auth.uid()
      )
      -- List share access
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id
        AND ls.shared_with = auth.uid()
      )
      -- Cookier access (when cookier shares their recipes)
      OR EXISTS (
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true)
          OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)
        )
      )
    )
  )
);

-- Recreate ALL policy for managing tags (editors only - no cookier access for write)
CREATE POLICY "Users can manage tags on accessible recipes" 
ON public.recipe_tags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM recipe_shares
        WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      )
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id
        AND ls.shared_with = auth.uid()
        AND ls.permission = 'editor'
      )
    )
  )
);