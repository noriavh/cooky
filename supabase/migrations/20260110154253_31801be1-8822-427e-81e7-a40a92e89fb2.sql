-- Enable RLS on origins and units tables (read-only reference data)
ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read origins and units (they are reference data)
CREATE POLICY "Origins are viewable by everyone" ON public.origins FOR SELECT USING (true);
CREATE POLICY "Units are viewable by everyone" ON public.units FOR SELECT USING (true);