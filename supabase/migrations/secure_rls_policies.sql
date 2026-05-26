-- =========================================================================
-- SUPABASE SECURITY HARDENING: ENABLE RLS & SECURE KIOSK LOOKUP
-- =========================================================================
-- Petunjuk: Salin seluruh isi file ini, buka Dashboard Supabase Anda,
-- masuk ke menu SQL Editor, buat Query baru, tempel kode ini, lalu klik Run.

-- 1. AKTIFKAN RLS PADA SEMUA TABEL UTAMA
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_sessions ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada untuk mencegah duplikasi
DROP POLICY IF EXISTS "Admin full access on memberships" ON memberships;
DROP POLICY IF EXISTS "Admin full access on members" ON members;
DROP POLICY IF EXISTS "Admin full access on subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admin full access on payments" ON payments;
DROP POLICY IF EXISTS "Admin full access on attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Admin full access on expenses" ON expenses;
DROP POLICY IF EXISTS "Admin full access on classes" ON classes;
DROP POLICY IF EXISTS "Admin full access on class_bookings" ON class_bookings;
DROP POLICY IF EXISTS "Admin full access on pt_sessions" ON pt_sessions;
DROP POLICY IF EXISTS "Allow public read memberships" ON memberships;
DROP POLICY IF EXISTS "Allow kiosk insert attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "Allow kiosk insert notifications" ON notifications;

-- 2. BUAT KEBIJAKAN AKSES UNTUK ADMIN (USER AUTHENTICATED)
-- Pengguna yang login (Admin) memiliki akses penuh (CRUD) ke semua tabel
CREATE POLICY "Admin full access on memberships" ON memberships FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on members" ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on subscriptions" ON subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on attendance_logs" ON attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on expenses" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on classes" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on class_bookings" ON class_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on pt_sessions" ON pt_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. KEBIJAKAN UNTUK PENGUNJUNG UMUM (ANON)
-- Anonim hanya boleh membaca Paket Gym yang aktif untuk halaman Landing Page Price
CREATE POLICY "Allow public read memberships" ON memberships FOR SELECT TO anon USING (is_active = true);

-- Kiosk Check-In / Registrasi Visitor Harian (Anonim hanya boleh melakukan INSERT data absensi & notifikasi)
CREATE POLICY "Allow kiosk insert attendance_logs" ON attendance_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow kiosk insert notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);


-- 4. BUAT FUNCTION SECURE LOOKUP UNTUK KIOSK (Bypass RLS secara Aman & Terbatas)
-- Fungsi ini berjalan dengan hak akses SECURITY DEFINER (sebagai Admin) untuk melihat View,
-- tetapi membatasi hasilnya hanya EXACT MATCH berdasarkan nomor member atau nomor hp dan hanya 1 baris (LIMIT 1).
-- Hal ini mencegah hacker melakukan listing seluruh isi database via API publik.
CREATE OR REPLACE FUNCTION public.kiosk_checkin_lookup(p_search_val TEXT)
RETURNS TABLE (
    member_id UUID,
    gym_id TEXT,
    full_name TEXT,
    phone TEXT,
    member_no TEXT,
    emergency_contact TEXT,
    notes TEXT,
    photo_url TEXT,
    membership_name TEXT,
    price NUMERIC,
    subscription_id UUID,
    start_date DATE,
    end_date DATE,
    days_remaining INT,
    status TEXT,
    pt_membership_name TEXT,
    pt_subscription_id UUID,
    pt_start_date DATE,
    pt_end_date DATE,
    pt_remaining_sessions INT,
    pt_total_sessions INT,
    pt_status TEXT,
    last_check_in_at TIMESTAMP WITH TIME ZONE -- Kolom tambahan untuk cek anti-spam
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.member_id,
        v.gym_id,
        v.full_name,
        v.phone,
        v.member_no,
        v.emergency_contact,
        v.notes,
        v.photo_url,
        v.membership_name,
        v.price,
        v.subscription_id,
        v.start_date,
        v.end_date,
        v.days_remaining,
        v.status,
        v.pt_membership_name,
        v.pt_subscription_id,
        v.pt_start_date,
        v.pt_end_date,
        v.pt_remaining_sessions,
        v.pt_total_sessions,
        v.pt_status,
        (SELECT l.check_in_at 
         FROM public.attendance_logs l 
         WHERE l.member_id = v.member_id 
         ORDER BY l.check_in_at DESC 
         LIMIT 1) AS last_check_in_at
    FROM active_subscriptions_view v
    WHERE (v.member_no = p_search_val OR v.phone = p_search_val)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- 5. BUAT FUNCTION SECURE CEK NOMOR TELEPON (Untuk mencegah kebocoran data saat registrasi visitor baru)
-- Fungsi ini mengembalikan nilai boolean TRUE jika nomor telepon sudah terdaftar di database,
-- tanpa membocorkan detail profil siapa pemilik nomor tersebut.
CREATE OR REPLACE FUNCTION public.check_existing_phone(p_phone TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members 
        WHERE phone = p_phone
    );
END;
$$ LANGUAGE plpgsql;
