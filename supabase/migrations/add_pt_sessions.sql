-- ============================================
-- MIGRATION: Line Up Gym - Jalankan di Supabase SQL Editor
-- Tanggal: 29 April 2026
-- ============================================

-- 1. Create pt_sessions table (Jadwal Sesi PT)
CREATE TABLE IF NOT EXISTS pt_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS untuk pt_sessions
ALTER TABLE pt_sessions DISABLE ROW LEVEL SECURITY;

-- 3. Tambah kolom member_no jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'members' AND column_name = 'member_no'
    ) THEN
        ALTER TABLE members ADD COLUMN member_no TEXT;
    END IF;
END $$;

-- 4. Jadikan member_no UNIQUE (hapus constraint lama jika ada, lalu buat baru)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'members_member_no_unique'
    ) THEN
        ALTER TABLE members ADD CONSTRAINT members_member_no_unique UNIQUE (member_no);
    END IF;
END $$;
