-- Add columns to track recipe sharing between cookiers
-- user_shares_recipes: user_id shares their recipes with cookier_id
-- cookier_shares_recipes: cookier_id shares their recipes with user_id
ALTER TABLE public.cookiers 
ADD COLUMN user_shares_recipes boolean NOT NULL DEFAULT false,
ADD COLUMN cookier_shares_recipes boolean NOT NULL DEFAULT false;

-- Update RLS policy to allow cookier_id to update cookier_shares_recipes
DROP POLICY IF EXISTS "Users can accept friend requests" ON public.cookiers;

CREATE POLICY "Users can update as cookier_id" 
ON public.cookiers 
FOR UPDATE 
USING (auth.uid() = cookier_id);

-- Add policy to allow user_id to update their sharing settings
CREATE POLICY "Users can update as user_id" 
ON public.cookiers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update recipes RLS policy to allow cookiers to view shared recipes
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;

CREATE POLICY "Users can view accessible recipes" 
ON public.recipes 
FOR SELECT 
USING (
  (auth.uid() = owner_id) 
  OR (EXISTS ( 
    SELECT 1 FROM recipe_shares 
    WHERE recipe_shares.recipe_id = recipes.id 
    AND recipe_shares.shared_with = auth.uid()
  )) 
  OR (EXISTS ( 
    SELECT 1 FROM recipe_list_items rli 
    JOIN list_shares ls ON ls.list_id = rli.list_id 
    WHERE rli.recipe_id = recipes.id 
    AND ls.shared_with = auth.uid()
  )) 
  OR (EXISTS ( 
    SELECT 1 FROM recipe_list_items rli 
    JOIN recipe_lists rl ON rl.id = rli.list_id 
    WHERE rli.recipe_id = recipes.id 
    AND rl.owner_id = auth.uid()
  ))
  -- NEW: Allow cookiers to view recipes if sharing is enabled
  OR (EXISTS (
    SELECT 1 FROM cookiers c
    WHERE c.status = 'accepted'
    AND (
      -- Case 1: I am the cookier_id and user_id shares their recipes
      (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true)
      OR
      -- Case 2: I am the user_id and cookier_id shares their recipes  
      (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)
    )
  ))
);