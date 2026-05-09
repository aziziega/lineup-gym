-- File: supabase/settings.sql
-- Silakan jalankan kode ini di SQL Editor Supabase Anda

-- 1. Buat tabel settings jika belum ada
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matikan RLS untuk settings agar mudah diakses
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Masukkan data default jika belum ada
INSERT INTO settings (id, logo_url) 
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', null)
ON CONFLICT (id) DO NOTHING;

-- 2. Buat storage bucket untuk logo
-- Pastikan ekstensi uuid-ossp aktif (sudah ada di schema utama)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Beri akses public ke bucket logos agar bisa dibaca semua orang
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

-- Beri akses insert/update/delete (tanpa RLS/auth restriction untuk kemudahan pengembangan)
CREATE POLICY "Allow All Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow All Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'logos');

CREATE POLICY "Allow All Delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'logos');
