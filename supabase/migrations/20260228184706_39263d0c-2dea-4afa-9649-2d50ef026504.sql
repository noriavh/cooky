
-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS public.planting_yields CASCADE;
DROP TABLE IF EXISTS public.garden_plantings CASCADE;
DROP TABLE IF EXISTS public.garden_years CASCADE;
DROP TABLE IF EXISTS public.garden_zones CASCADE;
DROP TABLE IF EXISTS public.gardens CASCADE;
DROP TABLE IF EXISTS public.plant_companions CASCADE;
DROP TABLE IF EXISTS public.plant_requests CASCADE;
DROP TABLE IF EXISTS public.rotation_rules CASCADE;
DROP TABLE IF EXISTS public.plants CASCADE;
DROP TABLE IF EXISTS public.plant_families CASCADE;
DROP TABLE IF EXISTS public.user_modules CASCADE;

-- Drop enums used only by Seedy
DROP TYPE IF EXISTS public.garden_zone_type CASCADE;
DROP TYPE IF EXISTS public.light_requirement CASCADE;
DROP TYPE IF EXISTS public.plant_category CASCADE;
DROP TYPE IF EXISTS public.plant_request_status CASCADE;
