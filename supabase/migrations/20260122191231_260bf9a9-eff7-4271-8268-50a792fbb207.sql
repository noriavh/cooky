-- Fix 1: Make recipe-images bucket private and require authentication
-- This prevents unauthenticated access and file enumeration

UPDATE storage.buckets 
SET public = false 
WHERE id = 'recipe-images';

-- Update view policy to require authentication
DROP POLICY IF EXISTS "Anyone can view recipe images" ON storage.objects;

CREATE POLICY "Authenticated users can view recipe images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'recipe-images');

-- Fix 2: Restrict profile visibility to connected users only
-- This protects dietary preferences from bulk enumeration

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can view their own profile, or profiles of:
-- - Their cookiers (friends)
-- - Their family members
-- - Users they've shared recipes with
CREATE POLICY "Users can view connected profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id  -- Own profile
  OR EXISTS (  -- Friend (cookier)
    SELECT 1 FROM public.cookiers 
    WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND cookier_id = profiles.id)
        OR (cookier_id = auth.uid() AND user_id = profiles.id))
  )
  OR EXISTS (  -- Pending friend request (to see who sent request)
    SELECT 1 FROM public.cookiers 
    WHERE status = 'pending'
      AND ((user_id = auth.uid() AND cookier_id = profiles.id)
        OR (cookier_id = auth.uid() AND user_id = profiles.id))
  )
  OR EXISTS (  -- Family member
    SELECT 1 FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = profiles.id
  )
  OR EXISTS (  -- Family invitation (to see inviter/invitee)
    SELECT 1 FROM public.family_invitations
    WHERE (invited_user_id = auth.uid() AND invited_by = profiles.id)
       OR (invited_by = auth.uid() AND invited_user_id = profiles.id)
  )
  OR EXISTS (  -- Recipe sharer
    SELECT 1 FROM public.recipe_shares
    WHERE (shared_by = profiles.id AND shared_with = auth.uid())
       OR (shared_with = profiles.id AND shared_by = auth.uid())
  )
  OR EXISTS (  -- List sharer
    SELECT 1 FROM public.list_shares
    WHERE (shared_by = profiles.id AND shared_with = auth.uid())
       OR (shared_with = profiles.id AND shared_by = auth.uid())
  )
);