ALTER TABLE public.garden_zones 
ADD COLUMN real_width_cells integer NOT NULL DEFAULT 10,
ADD COLUMN real_height_cells integer NOT NULL DEFAULT 10;