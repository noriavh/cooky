-- Create enum types
CREATE TYPE public.recipe_type AS ENUM ('apero', 'entree', 'soupe', 'plat', 'dessert', 'boisson');
CREATE TYPE public.difficulty_level AS ENUM ('facile', 'moyen', 'difficile');
CREATE TYPE public.price_level AS ENUM ('1', '2', '3');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create origins table (20 most common)
CREATE TABLE public.origins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT
);

INSERT INTO public.origins (name, emoji) VALUES
  ('Française', '🇫🇷'),
  ('Italienne', '🇮🇹'),
  ('Mexicaine', '🇲🇽'),
  ('Chinoise', '🇨🇳'),
  ('Japonaise', '🇯🇵'),
  ('Indienne', '🇮🇳'),
  ('Thaïlandaise', '🇹🇭'),
  ('Espagnole', '🇪🇸'),
  ('Grecque', '🇬🇷'),
  ('Marocaine', '🇲🇦'),
  ('Libanaise', '🇱🇧'),
  ('Américaine', '🇺🇸'),
  ('Belge', '🇧🇪'),
  ('Vietnamienne', '🇻🇳'),
  ('Coréenne', '🇰🇷'),
  ('Portugaise', '🇵🇹'),
  ('Turque', '🇹🇷'),
  ('Allemande', '🇩🇪'),
  ('Britannique', '🇬🇧'),
  ('Brésilienne', '🇧🇷');

-- Create units table (20 most common)
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT
);

INSERT INTO public.units (name, abbreviation) VALUES
  ('gramme', 'g'),
  ('kilogramme', 'kg'),
  ('litre', 'L'),
  ('centilitre', 'cL'),
  ('millilitre', 'mL'),
  ('cuillère à soupe', 'c.s.'),
  ('cuillère à café', 'c.c.'),
  ('pincée', 'pincée'),
  ('pièce', 'pce'),
  ('tranche', 'tr.'),
  ('gousse', 'gousse'),
  ('brin', 'brin'),
  ('feuille', 'feuille'),
  ('tasse', 'tasse'),
  ('verre', 'verre'),
  ('boîte', 'boîte'),
  ('sachet', 'sachet'),
  ('bouquet', 'bouquet'),
  ('poignée', 'poignée'),
  ('noix', 'noix');

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags are viewable by everyone" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  recipe_type recipe_type NOT NULL DEFAULT 'plat',
  origin_id UUID REFERENCES public.origins(id),
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  price_level price_level DEFAULT '2',
  difficulty difficulty_level DEFAULT 'moyen',
  servings INTEGER DEFAULT 4,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Create recipe_tags junction table
CREATE TABLE public.recipe_tags (
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity DECIMAL,
  unit_id UUID REFERENCES public.units(id),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Create steps table
CREATE TABLE public.steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  content TEXT NOT NULL
);

ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

-- Create recipe_lists table
CREATE TABLE public.recipe_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_lists ENABLE ROW LEVEL SECURITY;

-- Create recipe_list_items junction table
CREATE TABLE public.recipe_list_items (
  list_id UUID NOT NULL REFERENCES public.recipe_lists(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, recipe_id)
);

ALTER TABLE public.recipe_list_items ENABLE ROW LEVEL SECURITY;

-- Create recipe_shares table (for sharing recipes)
CREATE TABLE public.recipe_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, shared_with)
);

ALTER TABLE public.recipe_shares ENABLE ROW LEVEL SECURITY;

-- Create list_shares table (for sharing lists)
CREATE TABLE public.list_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.recipe_lists(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (list_id, shared_with)
);

ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Create cookiers table (friends/contacts)
CREATE TABLE public.cookiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cookier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, cookier_id)
);

ALTER TABLE public.cookiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can view their own recipes" ON public.recipes 
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can view shared recipes" ON public.recipes 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipe_shares WHERE recipe_id = recipes.id AND shared_with = auth.uid())
  );
CREATE POLICY "Users can create recipes" ON public.recipes 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own recipes" ON public.recipes 
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own recipes" ON public.recipes 
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for recipe_tags
CREATE POLICY "Users can view recipe tags for accessible recipes" ON public.recipe_tags 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.recipe_shares WHERE recipe_id = recipes.id AND shared_with = auth.uid())))
  );
CREATE POLICY "Users can manage tags on their recipes" ON public.recipe_tags 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND owner_id = auth.uid())
  );

-- RLS Policies for ingredients
CREATE POLICY "Users can view ingredients for accessible recipes" ON public.ingredients 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.recipe_shares WHERE recipe_id = recipes.id AND shared_with = auth.uid())))
  );
CREATE POLICY "Users can manage ingredients on their recipes" ON public.ingredients 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND owner_id = auth.uid())
  );

-- RLS Policies for steps
CREATE POLICY "Users can view steps for accessible recipes" ON public.steps 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.recipe_shares WHERE recipe_id = recipes.id AND shared_with = auth.uid())))
  );
CREATE POLICY "Users can manage steps on their recipes" ON public.steps 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND owner_id = auth.uid())
  );

-- RLS Policies for recipe_lists
CREATE POLICY "Users can view their own lists" ON public.recipe_lists 
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can view shared lists" ON public.recipe_lists 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.list_shares WHERE list_id = recipe_lists.id AND shared_with = auth.uid())
  );
CREATE POLICY "Users can create lists" ON public.recipe_lists 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own lists" ON public.recipe_lists 
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own lists" ON public.recipe_lists 
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for recipe_list_items
CREATE POLICY "Users can view items in accessible lists" ON public.recipe_list_items 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recipe_lists WHERE id = list_id AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.list_shares WHERE list_id = recipe_lists.id AND shared_with = auth.uid())))
  );
CREATE POLICY "Users can manage items in their lists" ON public.recipe_list_items 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.recipe_lists WHERE id = list_id AND owner_id = auth.uid())
  );

-- RLS Policies for shares
CREATE POLICY "Users can view shares they created or received" ON public.recipe_shares 
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);
CREATE POLICY "Users can share their own recipes" ON public.recipe_shares 
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND 
    EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND owner_id = auth.uid())
  );
CREATE POLICY "Users can delete shares they created" ON public.recipe_shares 
  FOR DELETE USING (auth.uid() = shared_by);

CREATE POLICY "Users can view list shares they created or received" ON public.list_shares 
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);
CREATE POLICY "Users can share their own lists" ON public.list_shares 
  FOR INSERT WITH CHECK (
    auth.uid() = shared_by AND 
    EXISTS (SELECT 1 FROM public.recipe_lists WHERE id = list_id AND owner_id = auth.uid())
  );
CREATE POLICY "Users can delete list shares they created" ON public.list_shares 
  FOR DELETE USING (auth.uid() = shared_by);

-- RLS Policies for cookiers
CREATE POLICY "Users can view their own cookiers" ON public.cookiers 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add cookiers" ON public.cookiers 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove cookiers" ON public.cookiers 
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recipe_lists_updated_at BEFORE UPDATE ON public.recipe_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;

-- Trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();