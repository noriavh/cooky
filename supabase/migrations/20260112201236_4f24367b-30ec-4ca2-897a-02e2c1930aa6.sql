-- Update recipes RLS policy to remove recipe_shares and list_shares, keep only: owner, family, cookiers
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;
CREATE POLICY "Users can view accessible recipes" ON public.recipes
FOR SELECT
USING (
  (auth.uid() = owner_id) OR 
  ((family_id IS NOT NULL) AND (family_id = get_user_family_id(auth.uid()))) OR
  (EXISTS (
    SELECT 1 FROM cookiers c
    WHERE c.status = 'accepted'
    AND (
      (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id) OR
      (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id)
    )
  ))
);

-- Update recipes UPDATE policy - remove recipe_shares and list_shares based editing
DROP POLICY IF EXISTS "Users can update accessible recipes" ON public.recipes;
CREATE POLICY "Users can update accessible recipes" ON public.recipes
FOR UPDATE
USING (
  (auth.uid() = owner_id) OR 
  ((family_id IS NOT NULL) AND (family_id = get_user_family_id(auth.uid())))
);

-- Update ingredients SELECT policy - remove recipe_shares and list_shares
DROP POLICY IF EXISTS "Users can view ingredients for accessible recipes" ON public.ingredients;
CREATE POLICY "Users can view ingredients for accessible recipes" ON public.ingredients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = ingredients.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid())) OR
      EXISTS (
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id) OR
          (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id)
        )
      )
    )
  )
);

-- Update ingredients ALL policy - remove recipe_shares and list_shares
DROP POLICY IF EXISTS "Users can manage ingredients on accessible recipes" ON public.ingredients;
CREATE POLICY "Users can manage ingredients on accessible recipes" ON public.ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = ingredients.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid()))
    )
  )
);

-- Update steps SELECT policy
DROP POLICY IF EXISTS "Users can view steps for accessible recipes" ON public.steps;
CREATE POLICY "Users can view steps for accessible recipes" ON public.steps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = steps.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid())) OR
      EXISTS (
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id) OR
          (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id)
        )
      )
    )
  )
);

-- Update steps ALL policy
DROP POLICY IF EXISTS "Users can manage steps on accessible recipes" ON public.steps;
CREATE POLICY "Users can manage steps on accessible recipes" ON public.steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = steps.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid()))
    )
  )
);

-- Update recipe_tags SELECT policy
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
CREATE POLICY "Users can view recipe tags for accessible recipes" ON public.recipe_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid())) OR
      EXISTS (
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id) OR
          (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id)
        )
      )
    )
  )
);

-- Update recipe_tags ALL policy
DROP POLICY IF EXISTS "Users can manage tags on accessible recipes" ON public.recipe_tags;
CREATE POLICY "Users can manage tags on accessible recipes" ON public.recipe_tags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      recipes.owner_id = auth.uid() OR
      (recipes.family_id IS NOT NULL AND recipes.family_id = get_user_family_id(auth.uid()))
    )
  )
);

-- Update recipe_lists SELECT policy to include cookiers
DROP POLICY IF EXISTS "Users can view accessible lists" ON public.recipe_lists;
CREATE POLICY "Users can view accessible lists" ON public.recipe_lists
FOR SELECT
USING (
  (auth.uid() = owner_id) OR 
  ((family_id IS NOT NULL) AND (family_id = get_user_family_id(auth.uid()))) OR
  (EXISTS (
    SELECT 1 FROM cookiers c
    WHERE c.status = 'accepted'
    AND (
      (c.cookier_id = auth.uid() AND c.user_id = recipe_lists.owner_id) OR
      (c.user_id = auth.uid() AND c.cookier_id = recipe_lists.owner_id)
    )
  ))
);

-- Update recipe_lists UPDATE policy - only owner and family can update
DROP POLICY IF EXISTS "Users can update accessible lists" ON public.recipe_lists;
CREATE POLICY "Users can update accessible lists" ON public.recipe_lists
FOR UPDATE
USING (
  (auth.uid() = owner_id) OR 
  ((family_id IS NOT NULL) AND (family_id = get_user_family_id(auth.uid())))
);

-- Update recipe_list_items SELECT policy
DROP POLICY IF EXISTS "Users can view items in accessible lists" ON public.recipe_list_items;
CREATE POLICY "Users can view items in accessible lists" ON public.recipe_list_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipe_lists
    WHERE recipe_lists.id = recipe_list_items.list_id
    AND (
      recipe_lists.owner_id = auth.uid() OR
      (recipe_lists.family_id IS NOT NULL AND recipe_lists.family_id = get_user_family_id(auth.uid())) OR
      EXISTS (
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipe_lists.owner_id) OR
          (c.user_id = auth.uid() AND c.cookier_id = recipe_lists.owner_id)
        )
      )
    )
  )
);

-- Update recipe_list_items ALL policy - only owner and family can manage
DROP POLICY IF EXISTS "Users can manage items in accessible lists" ON public.recipe_list_items;
CREATE POLICY "Users can manage items in accessible lists" ON public.recipe_list_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipe_lists
    WHERE recipe_lists.id = recipe_list_items.list_id
    AND (
      recipe_lists.owner_id = auth.uid() OR
      (recipe_lists.family_id IS NOT NULL AND recipe_lists.family_id = get_user_family_id(auth.uid()))
    )
  )
);