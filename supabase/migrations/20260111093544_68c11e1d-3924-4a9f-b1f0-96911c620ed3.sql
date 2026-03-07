-- Drop existing recipe policies and recreate with list share support
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can view shared recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update their own or shared recipes" ON public.recipes;

-- Allow viewing recipes: own, directly shared, or in shared lists
CREATE POLICY "Users can view accessible recipes" 
ON public.recipes 
FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM recipe_shares 
    WHERE recipe_shares.recipe_id = recipes.id 
    AND recipe_shares.shared_with = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM recipe_list_items rli
    JOIN list_shares ls ON ls.list_id = rli.list_id
    WHERE rli.recipe_id = recipes.id
    AND ls.shared_with = auth.uid()
  )
);

-- Allow updating recipes: own, directly shared as editor, or in lists shared as editor
CREATE POLICY "Users can update accessible recipes" 
ON public.recipes 
FOR UPDATE 
USING (
  auth.uid() = owner_id 
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
);

-- Update ingredients policies
DROP POLICY IF EXISTS "Users can view ingredients for accessible recipes" ON public.ingredients;
DROP POLICY IF EXISTS "Users can manage ingredients on their recipes" ON public.ingredients;

CREATE POLICY "Users can view ingredients for accessible recipes" 
ON public.ingredients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = ingredients.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage ingredients on accessible recipes" 
ON public.ingredients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = ingredients.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor'
      )
    )
  )
);

-- Update steps policies
DROP POLICY IF EXISTS "Users can view steps for accessible recipes" ON public.steps;
DROP POLICY IF EXISTS "Users can manage steps on their recipes" ON public.steps;

CREATE POLICY "Users can view steps for accessible recipes" 
ON public.steps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = steps.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage steps on accessible recipes" 
ON public.steps 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = steps.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor'
      )
    )
  )
);

-- Update recipe_tags policies
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can manage tags on their recipes" ON public.recipe_tags;

CREATE POLICY "Users can view recipe tags for accessible recipes" 
ON public.recipe_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage tags on accessible recipes" 
ON public.recipe_tags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor'
      )
    )
  )
);