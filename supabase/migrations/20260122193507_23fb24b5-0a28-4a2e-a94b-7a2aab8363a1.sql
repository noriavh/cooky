-- Revert recipe-images bucket to public for proper image display
-- RLS policies still control upload/delete access for authenticated users
-- Public buckets can still have RLS for INSERT/UPDATE/DELETE operations

UPDATE storage.buckets 
SET public = true 
WHERE id = 'recipe-images';

-- Update the view policy - public buckets allow SELECT for all
-- But keep the authenticated upload/delete policies for security
DROP POLICY IF EXISTS "Authenticated users can view recipe images" ON storage.objects;

-- Anyone can view recipe images (bucket is public)
CREATE POLICY "Anyone can view recipe images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'recipe-images');