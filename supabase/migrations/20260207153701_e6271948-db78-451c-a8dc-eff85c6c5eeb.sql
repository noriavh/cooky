-- Table for user module access (shared between Cooky and Seedy)
CREATE TABLE public.user_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module TEXT NOT NULL CHECK (module IN ('cooky', 'seedy')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, module)
);

-- Enable RLS
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Users can view their own modules
CREATE POLICY "Users can view their own modules"
ON public.user_modules
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own modules (for self-registration to modules)
CREATE POLICY "Users can insert their own modules"
ON public.user_modules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all modules
CREATE POLICY "Admins can manage all modules"
ON public.user_modules
FOR ALL
USING (public.is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_user_modules_user_id ON public.user_modules(user_id);
CREATE INDEX idx_user_modules_module ON public.user_modules(module);

-- ===============================
-- SEEDY TABLES
-- ===============================

-- Plant families (botanical families)
CREATE TABLE public.plant_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - public read, admin write
ALTER TABLE public.plant_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plant families"
ON public.plant_families
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plant families"
ON public.plant_families
FOR ALL
USING (public.is_admin(auth.uid()));

-- Plant categories enum
CREATE TYPE public.plant_category AS ENUM (
    'legume', 'fruit', 'aromate', 'fleur', 'arbuste', 'arbre', 'autre'
);

-- Light requirement enum
CREATE TYPE public.light_requirement AS ENUM (
    'plein_soleil', 'mi_ombre', 'ombre'
);

-- Zone types for garden
CREATE TYPE public.garden_zone_type AS ENUM (
    'potager', 'plantation', 'verger', 'serre', 'pelouse', 
    'terrasse', 'maison', 'allee', 'compost', 'point_eau', 'personnalise'
);

-- Global plants catalog
CREATE TABLE public.plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scientific_name TEXT,
    image_url TEXT,
    category plant_category NOT NULL DEFAULT 'legume',
    family_id UUID REFERENCES public.plant_families(id) ON DELETE SET NULL,
    compatible_zones garden_zone_type[] NOT NULL DEFAULT '{potager}',
    width_cells INTEGER NOT NULL DEFAULT 1 CHECK (width_cells >= 1),
    height_cells INTEGER NOT NULL DEFAULT 1 CHECK (height_cells >= 1),
    light_requirement light_requirement NOT NULL DEFAULT 'plein_soleil',
    watering_frequency TEXT,
    treatments TEXT,
    indoor_sowing_start INTEGER CHECK (indoor_sowing_start >= 1 AND indoor_sowing_start <= 12),
    indoor_sowing_end INTEGER CHECK (indoor_sowing_end >= 1 AND indoor_sowing_end <= 12),
    outdoor_sowing_start INTEGER CHECK (outdoor_sowing_start >= 1 AND outdoor_sowing_start <= 12),
    outdoor_sowing_end INTEGER CHECK (outdoor_sowing_end >= 1 AND outdoor_sowing_end <= 12),
    harvest_start INTEGER CHECK (harvest_start >= 1 AND harvest_start <= 12),
    harvest_end INTEGER CHECK (harvest_end >= 1 AND harvest_end <= 12),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - public read, admin write
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plants"
ON public.plants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plants"
ON public.plants
FOR ALL
USING (public.is_admin(auth.uid()));

-- Plant companionship (positive and negative)
CREATE TABLE public.plant_companions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    companion_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    is_positive BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(plant_id, companion_id)
);

-- Enable RLS
ALTER TABLE public.plant_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plant companions"
ON public.plant_companions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage plant companions"
ON public.plant_companions
FOR ALL
USING (public.is_admin(auth.uid()));

-- Plant addition requests from users
CREATE TYPE public.plant_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.plant_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scientific_name TEXT,
    image_url TEXT,
    category plant_category NOT NULL DEFAULT 'legume',
    family_id UUID REFERENCES public.plant_families(id) ON DELETE SET NULL,
    compatible_zones garden_zone_type[] NOT NULL DEFAULT '{potager}',
    width_cells INTEGER NOT NULL DEFAULT 1,
    height_cells INTEGER NOT NULL DEFAULT 1,
    light_requirement light_requirement NOT NULL DEFAULT 'plein_soleil',
    watering_frequency TEXT,
    treatments TEXT,
    indoor_sowing_start INTEGER,
    indoor_sowing_end INTEGER,
    outdoor_sowing_start INTEGER,
    outdoor_sowing_end INTEGER,
    harvest_start INTEGER,
    harvest_end INTEGER,
    notes TEXT,
    status plant_request_status NOT NULL DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plant_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON public.plant_requests
FOR SELECT
USING (auth.uid() = requested_by OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create requests"
ON public.plant_requests
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins can manage all requests"
ON public.plant_requests
FOR ALL
USING (public.is_admin(auth.uid()));

-- Gardens table
CREATE TABLE public.gardens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    width_meters DECIMAL(6,2) NOT NULL CHECK (width_meters > 0),
    height_meters DECIMAL(6,2) NOT NULL CHECK (height_meters > 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gardens"
ON public.gardens
FOR SELECT
USING (
    auth.uid() = user_id 
    OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can create gardens"
ON public.gardens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gardens"
ON public.gardens
FOR UPDATE
USING (
    auth.uid() = user_id 
    OR (family_id IS NOT NULL AND public.is_family_member(auth.uid(), family_id))
);

CREATE POLICY "Users can delete own gardens"
ON public.gardens
FOR DELETE
USING (auth.uid() = user_id);

-- Garden years (versions by year)
CREATE TABLE public.garden_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garden_id UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(garden_id, year)
);

-- Enable RLS
ALTER TABLE public.garden_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view garden years they have access to"
ON public.garden_years
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.gardens g
        WHERE g.id = garden_years.garden_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

CREATE POLICY "Users can manage garden years for their gardens"
ON public.garden_years
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.gardens g
        WHERE g.id = garden_years.garden_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

-- Garden zones
CREATE TABLE public.garden_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garden_id UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    zone_type garden_zone_type NOT NULL,
    color TEXT,
    cells JSONB NOT NULL DEFAULT '[]', -- Array of {x, y} coordinates
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garden_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view zones for their gardens"
ON public.garden_zones
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.gardens g
        WHERE g.id = garden_zones.garden_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

CREATE POLICY "Users can manage zones for their gardens"
ON public.garden_zones
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.gardens g
        WHERE g.id = garden_zones.garden_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

-- Garden plantings (plants placed in the garden)
CREATE TABLE public.garden_plantings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garden_year_id UUID NOT NULL REFERENCES public.garden_years(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES public.garden_zones(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    planted_at DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garden_plantings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view plantings for their gardens"
ON public.garden_plantings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.garden_years gy
        JOIN public.gardens g ON g.id = gy.garden_id
        WHERE gy.id = garden_plantings.garden_year_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

CREATE POLICY "Users can manage plantings for their gardens"
ON public.garden_plantings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.garden_years gy
        JOIN public.gardens g ON g.id = gy.garden_id
        WHERE gy.id = garden_plantings.garden_year_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

-- Planting yields (harvest tracking)
CREATE TABLE public.planting_yields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planting_id UUID NOT NULL REFERENCES public.garden_plantings(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    harvested_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planting_yields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view yields for their plantings"
ON public.planting_yields
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.garden_plantings gp
        JOIN public.garden_years gy ON gy.id = gp.garden_year_id
        JOIN public.gardens g ON g.id = gy.garden_id
        WHERE gp.id = planting_yields.planting_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

CREATE POLICY "Users can manage yields for their plantings"
ON public.planting_yields
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.garden_plantings gp
        JOIN public.garden_years gy ON gy.id = gp.garden_year_id
        JOIN public.gardens g ON g.id = gy.garden_id
        WHERE gp.id = planting_yields.planting_id
        AND (g.user_id = auth.uid() OR (g.family_id IS NOT NULL AND public.is_family_member(auth.uid(), g.family_id)))
    )
);

-- Rotation rules
CREATE TABLE public.rotation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = global rule
    family_id UUID REFERENCES public.plant_families(id) ON DELETE CASCADE,
    min_years INTEGER NOT NULL DEFAULT 3 CHECK (min_years >= 1),
    successor_family_id UUID REFERENCES public.plant_families(id) ON DELETE CASCADE,
    is_good_succession BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rotation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global rotation rules"
ON public.rotation_rules
FOR SELECT
TO authenticated
USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can manage their own rotation rules"
ON public.rotation_rules
FOR ALL
USING (user_id = auth.uid() OR (user_id IS NULL AND public.is_admin(auth.uid())));

-- Add updated_at triggers
CREATE TRIGGER update_plant_families_updated_at
BEFORE UPDATE ON public.plant_families
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plants_updated_at
BEFORE UPDATE ON public.plants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gardens_updated_at
BEFORE UPDATE ON public.gardens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garden_years_updated_at
BEFORE UPDATE ON public.garden_years
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garden_zones_updated_at
BEFORE UPDATE ON public.garden_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_garden_plantings_updated_at
BEFORE UPDATE ON public.garden_plantings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plant families
INSERT INTO public.plant_families (name, description) VALUES
('Solanacées', 'Tomates, poivrons, aubergines, pommes de terre'),
('Cucurbitacées', 'Courgettes, concombres, courges, melons'),
('Légumineuses', 'Haricots, pois, fèves, lentilles'),
('Brassicacées', 'Choux, brocolis, radis, navets'),
('Apiacées', 'Carottes, céleri, persil, fenouil'),
('Liliacées', 'Ail, oignon, poireau, échalote'),
('Astéracées', 'Laitue, chicorée, artichaut, tournesol'),
('Lamiacées', 'Basilic, menthe, thym, romarin, lavande'),
('Rosacées', 'Fraisier, framboisier, pommier, cerisier')
ON CONFLICT (name) DO NOTHING;