-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create family_members table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- User can only be in one family
);

-- Create family_invitations table (pending invitations)
CREATE TABLE public.family_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, invited_user_id) -- Can't invite same user twice to same family
);

-- Add family_id to recipes (nullable, either user_id or family_id should be set)
ALTER TABLE public.recipes ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to recipe_lists
ALTER TABLE public.recipe_lists ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to shopping_products
ALTER TABLE public.shopping_products ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to meal_plans
ALTER TABLE public.meal_plans ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to shopping_list_items
ALTER TABLE public.shopping_list_items ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Add family_id to tags (for user-created tags)
ALTER TABLE public.tags ADD COLUMN family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for families: members can view their family
CREATE POLICY "Users can view their family"
ON public.families FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = families.id
    AND family_members.user_id = auth.uid()
  )
);

-- Members can update family name
CREATE POLICY "Members can update their family"
ON public.families FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = families.id
    AND family_members.user_id = auth.uid()
  )
);

-- Users can create families
CREATE POLICY "Users can create families"
ON public.families FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Members can delete family
CREATE POLICY "Members can delete their family"
ON public.families FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = families.id
    AND family_members.user_id = auth.uid()
  )
);

-- RLS for family_members
CREATE POLICY "Users can view family members"
ON public.family_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Members can add new members"
ON public.family_members FOR INSERT
WITH CHECK (
  -- Either creating yourself as first member (when creating family)
  (auth.uid() = user_id)
  OR
  -- Or existing member adding someone
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can remove members"
ON public.family_members FOR DELETE
USING (
  -- Can remove yourself
  user_id = auth.uid()
  OR
  -- Or any member can remove anyone
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
  )
);

-- RLS for family_invitations
CREATE POLICY "Members can view family invitations"
ON public.family_invitations FOR SELECT
USING (
  invited_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_invitations.family_id
    AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create invitations"
ON public.family_invitations FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_invitations.family_id
    AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Members or invited can delete invitations"
ON public.family_invitations FOR DELETE
USING (
  invited_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_invitations.family_id
    AND fm.user_id = auth.uid()
  )
);

-- Update RLS policies for recipes to include family access
DROP POLICY IF EXISTS "Users can view accessible recipes" ON public.recipes;
CREATE POLICY "Users can view accessible recipes"
ON public.recipes FOR SELECT
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipes.family_id
    AND fm.user_id = auth.uid()
  ))
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
  OR (EXISTS (
    SELECT 1 FROM cookiers c
    WHERE c.status = 'accepted'
    AND (
      (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true)
      OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)
    )
  ))
);

DROP POLICY IF EXISTS "Users can update accessible recipes" ON public.recipes;
CREATE POLICY "Users can update accessible recipes"
ON public.recipes FOR UPDATE
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipes.family_id
    AND fm.user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM recipe_shares
    WHERE recipe_shares.recipe_id = recipes.id
    AND recipe_shares.shared_with = auth.uid()
    AND recipe_shares.permission = 'editor'
  ))
  OR (EXISTS (
    SELECT 1 FROM recipe_list_items rli
    JOIN list_shares ls ON ls.list_id = rli.list_id
    WHERE rli.recipe_id = recipes.id
    AND ls.shared_with = auth.uid()
    AND ls.permission = 'editor'
  ))
);

DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;
CREATE POLICY "Users can delete accessible recipes"
ON public.recipes FOR DELETE
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipes.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create recipes" ON public.recipes;
CREATE POLICY "Users can create recipes"
ON public.recipes FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipes.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for recipe_lists
DROP POLICY IF EXISTS "Users can view their own lists" ON public.recipe_lists;
DROP POLICY IF EXISTS "Users can view shared lists" ON public.recipe_lists;
CREATE POLICY "Users can view accessible lists"
ON public.recipe_lists FOR SELECT
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipe_lists.family_id
    AND fm.user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_shares.list_id = recipe_lists.id
    AND list_shares.shared_with = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create lists" ON public.recipe_lists;
CREATE POLICY "Users can create lists"
ON public.recipe_lists FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipe_lists.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their own or shared lists" ON public.recipe_lists;
CREATE POLICY "Users can update accessible lists"
ON public.recipe_lists FOR UPDATE
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipe_lists.family_id
    AND fm.user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_shares.list_id = recipe_lists.id
    AND list_shares.shared_with = auth.uid()
    AND list_shares.permission = 'editor'
  ))
);

DROP POLICY IF EXISTS "Users can delete their own lists" ON public.recipe_lists;
CREATE POLICY "Users can delete accessible lists"
ON public.recipe_lists FOR DELETE
USING (
  (auth.uid() = owner_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = recipe_lists.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for shopping_products
DROP POLICY IF EXISTS "Users can view global and own products" ON public.shopping_products;
CREATE POLICY "Users can view accessible products"
ON public.shopping_products FOR SELECT
USING (
  (user_id IS NULL) -- Global products
  OR (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_products.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create their own products" ON public.shopping_products;
CREATE POLICY "Users can create products"
ON public.shopping_products FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_products.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their own products" ON public.shopping_products;
CREATE POLICY "Users can update accessible products"
ON public.shopping_products FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_products.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.shopping_products;
CREATE POLICY "Users can delete accessible products"
ON public.shopping_products FOR DELETE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_products.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for meal_plans
DROP POLICY IF EXISTS "Users can view their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can view accessible meal plans"
ON public.meal_plans FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = meal_plans.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can create meal plans"
ON public.meal_plans FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = meal_plans.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can update accessible meal plans"
ON public.meal_plans FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = meal_plans.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can delete their own meal plans" ON public.meal_plans;
CREATE POLICY "Users can delete accessible meal plans"
ON public.meal_plans FOR DELETE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = meal_plans.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for shopping_list_items
DROP POLICY IF EXISTS "Users can view their own shopping list items" ON public.shopping_list_items;
CREATE POLICY "Users can view accessible shopping list items"
ON public.shopping_list_items FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_list_items.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create their own shopping list items" ON public.shopping_list_items;
CREATE POLICY "Users can create shopping list items"
ON public.shopping_list_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_list_items.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their own shopping list items" ON public.shopping_list_items;
CREATE POLICY "Users can update accessible shopping list items"
ON public.shopping_list_items FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_list_items.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can delete their own shopping list items" ON public.shopping_list_items;
CREATE POLICY "Users can delete accessible shopping list items"
ON public.shopping_list_items FOR DELETE
USING (
  (auth.uid() = user_id)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = shopping_list_items.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for tags to include family access
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
CREATE POLICY "Users can view accessible tags"
ON public.tags FOR SELECT
USING (
  (created_by IS NULL) -- Global tags
  OR (auth.uid() = created_by)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = tags.family_id
    AND fm.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON public.tags;
CREATE POLICY "Users can create tags"
ON public.tags FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    created_by = auth.uid()
    OR (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = tags.family_id
      AND fm.user_id = auth.uid()
    ))
  )
);

-- Add delete policy for tags (family members can delete family tags)
CREATE POLICY "Users can delete accessible tags"
ON public.tags FOR DELETE
USING (
  (auth.uid() = created_by)
  OR (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = tags.family_id
    AND fm.user_id = auth.uid()
  ))
);

-- Update RLS for recipe_tags to include family recipes
DROP POLICY IF EXISTS "Users can view recipe tags for accessible recipes" ON public.recipe_tags;
CREATE POLICY "Users can view recipe tags for accessible recipes"
ON public.recipe_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
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
        SELECT 1 FROM cookiers c
        WHERE c.status = 'accepted'
        AND (
          (c.cookier_id = auth.uid() AND c.user_id = recipes.owner_id AND c.user_shares_recipes = true)
          OR (c.user_id = auth.uid() AND c.cookier_id = recipes.owner_id AND c.cookier_shares_recipes = true)
        )
      ))
    )
  )
);

DROP POLICY IF EXISTS "Users can manage tags on accessible recipes" ON public.recipe_tags;
CREATE POLICY "Users can manage tags on accessible recipes"
ON public.recipe_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_shares
        WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id
        AND ls.shared_with = auth.uid()
        AND ls.permission = 'editor'
      ))
    )
  )
);

-- Update RLS for ingredients to include family recipes
DROP POLICY IF EXISTS "Users can view ingredients for accessible recipes" ON public.ingredients;
CREATE POLICY "Users can view ingredients for accessible recipes"
ON public.ingredients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = ingredients.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
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
    )
  )
);

DROP POLICY IF EXISTS "Users can manage ingredients on accessible recipes" ON public.ingredients;
CREATE POLICY "Users can manage ingredients on accessible recipes"
ON public.ingredients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = ingredients.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_shares
        WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id
        AND ls.shared_with = auth.uid()
        AND ls.permission = 'editor'
      ))
    )
  )
);

-- Update RLS for steps to include family recipes
DROP POLICY IF EXISTS "Users can view steps for accessible recipes" ON public.steps;
CREATE POLICY "Users can view steps for accessible recipes"
ON public.steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = steps.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
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
    )
  )
);

DROP POLICY IF EXISTS "Users can manage steps on accessible recipes" ON public.steps;
CREATE POLICY "Users can manage steps on accessible recipes"
ON public.steps FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = steps.recipe_id
    AND (
      (recipes.owner_id = auth.uid())
      OR (recipes.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipes.family_id
        AND fm.user_id = auth.uid()
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_shares
        WHERE recipe_shares.recipe_id = recipes.id
        AND recipe_shares.shared_with = auth.uid()
        AND recipe_shares.permission = 'editor'
      ))
      OR (EXISTS (
        SELECT 1 FROM recipe_list_items rli
        JOIN list_shares ls ON ls.list_id = rli.list_id
        WHERE rli.recipe_id = recipes.id
        AND ls.shared_with = auth.uid()
        AND ls.permission = 'editor'
      ))
    )
  )
);

-- Update RLS for recipe_list_items to include family lists
DROP POLICY IF EXISTS "Users can view items in accessible lists" ON public.recipe_list_items;
CREATE POLICY "Users can view items in accessible lists"
ON public.recipe_list_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipe_lists
    WHERE recipe_lists.id = recipe_list_items.list_id
    AND (
      (recipe_lists.owner_id = auth.uid())
      OR (recipe_lists.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipe_lists.family_id
        AND fm.user_id = auth.uid()
      ))
      OR (EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = recipe_lists.id
        AND list_shares.shared_with = auth.uid()
      ))
    )
  )
);

DROP POLICY IF EXISTS "Users can manage items in their lists" ON public.recipe_list_items;
CREATE POLICY "Users can manage items in accessible lists"
ON public.recipe_list_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipe_lists
    WHERE recipe_lists.id = recipe_list_items.list_id
    AND (
      (recipe_lists.owner_id = auth.uid())
      OR (recipe_lists.family_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = recipe_lists.family_id
        AND fm.user_id = auth.uid()
      ))
      OR (EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = recipe_lists.id
        AND list_shares.shared_with = auth.uid()
        AND list_shares.permission = 'editor'
      ))
    )
  )
);