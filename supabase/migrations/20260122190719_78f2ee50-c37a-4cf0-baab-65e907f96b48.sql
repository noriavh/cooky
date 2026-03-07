-- Remove the permissive INSERT policy on notifications table
-- The SECURITY DEFINER triggers (notify_on_cookier_accepted, notify_on_recipe_sharing) 
-- bypass RLS and will continue to work without this policy

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;