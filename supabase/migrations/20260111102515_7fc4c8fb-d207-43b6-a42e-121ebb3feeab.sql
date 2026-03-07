-- Drop existing policy
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;

-- Create updated policy that includes list owners viewing recipes in their lists
CREATE POLICY "Users can view accessible recipes" 
ON public.recipes 
FOR SELECT 
USING (
  (auth.uid() = owner_id) 
  OR (EXISTS ( 
    SELECT 1
    FROM recipe_shares
    WHERE recipe_shares.recipe_id = recipes.id 
    AND recipe_shares.shared_with = auth.uid()
  )) 
  OR (EXISTS ( 
    SELECT 1
    FROM recipe_list_items rli
    JOIN list_shares ls ON ls.list_id = rli.list_id
    WHERE rli.recipe_id = recipes.id 
    AND ls.shared_with = auth.uid()
  ))
  OR (EXISTS (
    -- NEW: List owners can view recipes in their lists
    SELECT 1
    FROM recipe_list_items rli
    JOIN recipe_lists rl ON rl.id = rli.list_id
    WHERE rli.recipe_id = recipes.id 
    AND rl.owner_id = auth.uid()
  ))
);