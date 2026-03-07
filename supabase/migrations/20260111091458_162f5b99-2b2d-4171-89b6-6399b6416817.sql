-- Add permission column to recipe_shares
ALTER TABLE public.recipe_shares 
ADD COLUMN permission text NOT NULL DEFAULT 'reader' CHECK (permission IN ('reader', 'editor'));

-- Add permission column to list_shares
ALTER TABLE public.list_shares 
ADD COLUMN permission text NOT NULL DEFAULT 'reader' CHECK (permission IN ('reader', 'editor'));

-- Drop existing policies on recipes to add editor support
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;

-- Create new update policy that allows owners and editors
CREATE POLICY "Users can update their own or shared recipes"
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
);

-- Drop existing policies on recipe_lists to add editor support
DROP POLICY IF EXISTS "Users can update their own lists" ON public.recipe_lists;

-- Create new update policy for lists that allows owners and editors
CREATE POLICY "Users can update their own or shared lists"
ON public.recipe_lists
FOR UPDATE
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM list_shares 
    WHERE list_shares.list_id = recipe_lists.id 
    AND list_shares.shared_with = auth.uid()
    AND list_shares.permission = 'editor'
  )
);

-- Allow editors to manage recipe list items
DROP POLICY IF EXISTS "Users can manage items in their lists" ON public.recipe_list_items;

CREATE POLICY "Users can manage items in their lists"
ON public.recipe_list_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipe_lists
    WHERE recipe_lists.id = recipe_list_items.list_id 
    AND (
      recipe_lists.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_shares.list_id = recipe_lists.id 
        AND list_shares.shared_with = auth.uid()
        AND list_shares.permission = 'editor'
      )
    )
  )
);

-- Allow editors to manage ingredients
DROP POLICY IF EXISTS "Users can manage ingredients on their recipes" ON public.ingredients;

CREATE POLICY "Users can manage ingredients on their recipes"
ON public.ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = ingredients.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM recipe_shares 
        WHERE recipe_shares.recipe_id = recipes.id 
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      )
    )
  )
);

-- Allow editors to manage steps
DROP POLICY IF EXISTS "Users can manage steps on their recipes" ON public.steps;

CREATE POLICY "Users can manage steps on their recipes"
ON public.steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = steps.recipe_id 
    AND (
      recipes.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM recipe_shares 
        WHERE recipe_shares.recipe_id = recipes.id 
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      )
    )
  )
);

-- Allow editors to manage recipe tags
DROP POLICY IF EXISTS "Users can manage tags on their recipes" ON public.recipe_tags;

CREATE POLICY "Users can manage tags on their recipes"
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
    )
  )
);

-- Add update policy for recipe_shares so owner can change permission
CREATE POLICY "Users can update shares they created"
ON public.recipe_shares
FOR UPDATE
USING (auth.uid() = shared_by);

-- Add update policy for list_shares so owner can change permission
CREATE POLICY "Users can update list shares they created"
ON public.list_shares
FOR UPDATE
USING (auth.uid() = shared_by);