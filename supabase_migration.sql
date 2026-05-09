-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gym_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'visitor_approval', 'subscription_expiry'
    is_read BOOLEAN DEFAULT false,
    related_member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (Admins)
CREATE POLICY "Enable read/write for admins" ON public.notifications
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anonymous users to INSERT ONLY (for kiosk visitor registration)
CREATE POLICY "Enable insert for kiosk" ON public.notifications
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Create index for faster querying
CREATE INDEX idx_notifications_gym_id ON public.notifications(gym_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
