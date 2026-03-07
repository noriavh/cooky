-- Add status column to cookiers table for pending/accepted requests
ALTER TABLE public.cookiers 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'accepted'));

-- Update existing records to be accepted
UPDATE public.cookiers SET status = 'accepted' WHERE status = 'pending';

-- Drop existing policies to recreate them with status consideration
DROP POLICY IF EXISTS "Users can add cookiers" ON public.cookiers;
DROP POLICY IF EXISTS "Users can remove cookiers" ON public.cookiers;
DROP POLICY IF EXISTS "Users can view their own cookiers" ON public.cookiers;

-- Users can send friend requests (insert with their user_id)
CREATE POLICY "Users can send friend requests" 
ON public.cookiers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view cookiers they sent or received
CREATE POLICY "Users can view their cookiers" 
ON public.cookiers 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = cookier_id);

-- Users can update requests they received (to accept)
CREATE POLICY "Users can accept friend requests" 
ON public.cookiers 
FOR UPDATE 
USING (auth.uid() = cookier_id);

-- Users can delete their own requests or requests they received
CREATE POLICY "Users can remove cookiers" 
ON public.cookiers 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = cookier_id);