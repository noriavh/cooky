-- First, drop the problematic policies on family_members
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Members can add new members" ON public.family_members;
DROP POLICY IF EXISTS "Members can remove members" ON public.family_members;

-- Create a security definer function to check family membership without recursion
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id
      AND family_id = _family_id
  )
$$;

-- Create a security definer function to get user's family id
CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.family_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Recreate family_members policies using the security definer function
CREATE POLICY "Users can view family members" ON public.family_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR family_id = public.get_user_family_id(auth.uid())
);

CREATE POLICY "Members can add new members" ON public.family_members
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR family_id = public.get_user_family_id(auth.uid())
);

CREATE POLICY "Members can remove members" ON public.family_members
FOR DELETE USING (
  user_id = auth.uid() 
  OR family_id = public.get_user_family_id(auth.uid())
);

-- Now update policies on other tables to use the security definer function
-- Drop and recreate policies for families
DROP POLICY IF EXISTS "Users can view their family" ON public.families;
DROP POLICY IF EXISTS "Members can update their family" ON public.families;
DROP POLICY IF EXISTS "Members can delete their family" ON public.families;

CREATE POLICY "Users can view their family" ON public.families
FOR SELECT USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Members can update their family" ON public.families
FOR UPDATE USING (id = public.get_user_family_id(auth.uid()));

CREATE POLICY "Members can delete their family" ON public.families
FOR DELETE USING (id = public.get_user_family_id(auth.uid()));

-- Update family_invitations policies
DROP POLICY IF EXISTS "Members can create invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Members can view family invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Members or invited can delete invitations" ON public.family_invitations;

CREATE POLICY "Members can create invitations" ON public.family_invitations
FOR INSERT WITH CHECK (
  auth.uid() = invited_by 
  AND family_id = public.get_user_family_id(auth.uid())
);

CREATE POLICY "Members can view family invitations" ON public.family_invitations
FOR SELECT USING (
  invited_user_id = auth.uid() 
  OR family_id = public.get_user_family_id(auth.uid())
);

CREATE POLICY "Members or invited can delete invitations" ON public.family_invitations
FOR DELETE USING (
  invited_user_id = auth.uid() 
  OR family_id = public.get_user_family_id(auth.uid())
);

-- Update recipes policies
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update accessible recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete accessible recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can create recipes" ON public.recipes;

CREATE POLICY "Users can view accessible recipes" ON public.recipes
FOR SELECT USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
  OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid())
  OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN recipe_lists rl ON rl.id = rli.list_id WHERE rli.recipe_id = recipes.id AND rl.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM cookiers c WHERE c.status = 'accepted' AND ((c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true) OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)))
);

CREATE POLICY "Users can create recipes" ON public.recipes
FOR INSERT WITH CHECK (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can update accessible recipes" ON public.recipes
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
  OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor')
);

CREATE POLICY "Users can delete accessible recipes" ON public.recipes
FOR DELETE USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update recipe_lists policies
DROP POLICY IF EXISTS "Users can view accessible lists" ON public.recipe_lists;
DROP POLICY IF EXISTS "Users can create lists" ON public.recipe_lists;
DROP POLICY IF EXISTS "Users can update accessible lists" ON public.recipe_lists;
DROP POLICY IF EXISTS "Users can delete accessible lists" ON public.recipe_lists;

CREATE POLICY "Users can view accessible lists" ON public.recipe_lists
FOR SELECT USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = recipe_lists.id AND list_shares.shared_with = auth.uid())
);

CREATE POLICY "Users can create lists" ON public.recipe_lists
FOR INSERT WITH CHECK (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can update accessible lists" ON public.recipe_lists
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = recipe_lists.id AND list_shares.shared_with = auth.uid() AND list_shares.permission = 'editor')
);

CREATE POLICY "Users can delete accessible lists" ON public.recipe_lists
FOR DELETE USING (
  auth.uid() = owner_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update recipe_list_items policies
DROP POLICY IF EXISTS "Users can view items in accessible lists" ON public.recipe_list_items;
DROP POLICY IF EXISTS "Users can manage items in accessible lists" ON public.recipe_list_items;

CREATE POLICY "Users can view items in accessible lists" ON public.recipe_list_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recipe_lists 
    WHERE recipe_lists.id = recipe_list_items.list_id 
    AND (
      recipe_lists.owner_id = auth.uid() 
      OR (recipe_lists.family_id IS NOT NULL AND recipe_lists.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = recipe_lists.id AND list_shares.shared_with = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage items in accessible lists" ON public.recipe_list_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipe_lists 
    WHERE recipe_lists.id = recipe_list_items.list_id 
    AND (
      recipe_lists.owner_id = auth.uid() 
      OR (recipe_lists.family_id IS NOT NULL AND recipe_lists.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = recipe_lists.id AND list_shares.shared_with = auth.uid() AND list_shares.permission = 'editor')
    )
  )
);

-- Update shopping_products policies
DROP POLICY IF EXISTS "Users can view accessible products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can create products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can update accessible products" ON public.shopping_products;
DROP POLICY IF EXISTS "Users can delete accessible products" ON public.shopping_products;

CREATE POLICY "Users can view accessible products" ON public.shopping_products
FOR SELECT USING (
  user_id IS NULL 
  OR auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can create products" ON public.shopping_products
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can update accessible products" ON public.shopping_products
FOR UPDATE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can delete accessible products" ON public.shopping_products
FOR DELETE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update shopping_list_items policies
DROP POLICY IF EXISTS "Users can view accessible shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can create shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can update accessible shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can delete accessible shopping list items" ON public.shopping_list_items;

CREATE POLICY "Users can view accessible shopping list items" ON public.shopping_list_items
FOR SELECT USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can create shopping list items" ON public.shopping_list_items
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can update accessible shopping list items" ON public.shopping_list_items
FOR UPDATE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can delete accessible shopping list items" ON public.shopping_list_items
FOR DELETE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update meal_plans policies
DROP POLICY IF EXISTS "Users can view accessible meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can create meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update accessible meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete accessible meal plans" ON public.meal_plans;

CREATE POLICY "Users can view accessible meal plans" ON public.meal_plans
FOR SELECT USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can create meal plans" ON public.meal_plans
FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can update accessible meal plans" ON public.meal_plans
FOR UPDATE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can delete accessible meal plans" ON public.meal_plans
FOR DELETE USING (
  auth.uid() = user_id 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update tags policies
DROP POLICY IF EXISTS "Users can view accessible tags" ON public.tags;
DROP POLICY IF EXISTS "Users can create tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete accessible tags" ON public.tags;

CREATE POLICY "Users can view accessible tags" ON public.tags
FOR SELECT USING (
  created_by IS NULL 
  OR auth.uid() = created_by 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY "Users can create tags" ON public.tags
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    created_by = auth.uid() 
    OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
  )
);

CREATE POLICY "Users can delete accessible tags" ON public.tags
FOR DELETE USING (
  auth.uid() = created_by 
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

-- Update ingredients policies
DROP POLICY IF EXISTS "Users can view ingredients for accessible recipes" ON public.ingredients;
DROP POLICY IF EXISTS "Users can manage ingredients on accessible recipes" ON public.ingredients;

CREATE POLICY "Users can view ingredients for accessible recipes" ON public.ingredients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = ingredients.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage ingredients on accessible recipes" ON public.ingredients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = ingredients.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor')
    )
  )
);

-- Update steps policies
DROP POLICY IF EXISTS "Users can view steps for accessible recipes" ON public.steps;
DROP POLICY IF EXISTS "Users can manage steps on accessible recipes" ON public.steps;

CREATE POLICY "Users can view steps for accessible recipes" ON public.steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = steps.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid())
    )
  )
);

CREATE POLICY "Users can manage steps on accessible recipes" ON public.steps
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = steps.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor')
    )
  )
);

-- Update recipe_tags policies
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
DROP POLICY IF EXISTS "Users can manage tags on accessible recipes" ON public.recipe_tags;

CREATE POLICY "Users can view recipe tags for accessible recipes" ON public.recipe_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid())
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid())
      OR EXISTS (SELECT 1 FROM cookiers c WHERE c.status = 'accepted' AND ((c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true) OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)))
    )
  )
);

CREATE POLICY "Users can manage tags on accessible recipes" ON public.recipe_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_tags.recipe_id 
    AND (
      recipes.owner_id = auth.uid() 
      OR (recipes.family_id IS NOT NULL AND recipes.family_id = public.get_user_family_id(auth.uid()))
      OR EXISTS (SELECT 1 FROM recipe_shares WHERE recipe_shares.recipe_id = recipes.id AND recipe_shares.shared_with = auth.uid() AND recipe_shares.permission = 'editor')
      OR EXISTS (SELECT 1 FROM recipe_list_items rli JOIN list_shares ls ON ls.list_id = rli.list_id WHERE rli.recipe_id = recipes.id AND ls.shared_with = auth.uid() AND ls.permission = 'editor')
    )
  )
);