-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Allow system to insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify user when friend request is accepted
CREATE OR REPLACE FUNCTION public.notify_on_cookier_accepted()
RETURNS TRIGGER AS $$
DECLARE
  acceptor_username TEXT;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    -- Get the username of the person who accepted
    SELECT username INTO acceptor_username
    FROM public.profiles
    WHERE id = NEW.cookier_id;

    -- Create notification for the original requester
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'friend_accepted',
      'Demande acceptée !',
      COALESCE(acceptor_username, 'Un utilisateur') || ' a accepté votre demande de cookier',
      jsonb_build_object('cookier_id', NEW.cookier_id, 'cookier_relation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for friend request acceptance
CREATE TRIGGER on_cookier_accepted
AFTER UPDATE ON public.cookiers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_cookier_accepted();

-- Create function to notify when someone starts sharing recipes with you
CREATE OR REPLACE FUNCTION public.notify_on_recipe_sharing()
RETURNS TRIGGER AS $$
DECLARE
  sharer_id UUID;
  receiver_id UUID;
  sharer_username TEXT;
BEGIN
  -- Check if user_shares_recipes changed to true
  IF NEW.user_shares_recipes = true AND (OLD.user_shares_recipes IS NULL OR OLD.user_shares_recipes = false) THEN
    sharer_id := NEW.user_id;
    receiver_id := NEW.cookier_id;

    SELECT username INTO sharer_username FROM public.profiles WHERE id = sharer_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      receiver_id,
      'recipes_shared',
      'Nouvelles recettes partagées !',
      COALESCE(sharer_username, 'Un utilisateur') || ' partage maintenant ses recettes avec vous',
      jsonb_build_object('sharer_id', sharer_id, 'cookier_relation_id', NEW.id)
    );
  END IF;

  -- Check if cookier_shares_recipes changed to true
  IF NEW.cookier_shares_recipes = true AND (OLD.cookier_shares_recipes IS NULL OR OLD.cookier_shares_recipes = false) THEN
    sharer_id := NEW.cookier_id;
    receiver_id := NEW.user_id;

    SELECT username INTO sharer_username FROM public.profiles WHERE id = sharer_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      receiver_id,
      'recipes_shared',
      'Nouvelles recettes partagées !',
      COALESCE(sharer_username, 'Un utilisateur') || ' partage maintenant ses recettes avec vous',
      jsonb_build_object('sharer_id', sharer_id, 'cookier_relation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for recipe sharing
CREATE TRIGGER on_recipe_sharing
AFTER UPDATE ON public.cookiers
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_recipe_sharing();

-- Create indexes for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);