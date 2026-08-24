-- ==============================================================================
--                   DATABASE SCHEMA DOKUMENTASI & BLUEPRINT
--                             LINEUP GYM SYSTEM
-- ==============================================================================
-- File         : schema_clean.sql / supabase/schema.sql
-- Proyek       : Lineup Gym Management & Kiosk System
-- Database     : PostgreSQL (Supabase)
-- Versi        : 2.0 (Clean, Production Ready & Documented)
-- Keterangan   : Berisi seluruh struktur tabel, tipe enum, relasi, views,
--                fungsi trigger, dan security policies (RLS).
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS (Ekstensi Database)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ==============================================================================
-- 2. CUSTOM ENUMS (Tipe Data Kustom)
-- ==============================================================================

-- Role Pengguna Sistem
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Kategori Paket Membership
DO $$ BEGIN
    CREATE TYPE public.membership_category_enum AS ENUM ('gym', 'pt', 'class');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Status Langganan / Membership
DO $$ BEGIN
    CREATE TYPE public.subscription_status_enum AS ENUM ('active', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Metode Pembayaran Transaksi
DO $$ BEGIN
    CREATE TYPE public.payment_method_enum AS ENUM ('cash', 'transfer', 'qris');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Hari Penjadwalan Kelas
DO $$ BEGIN
    CREATE TYPE public.day_of_week_enum AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==============================================================================
-- 3. TABLES DEFINITION (Tabel Database)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1. PROFILES (Akun Pengguna: Admin & Staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role public.user_role DEFAULT 'staff'::public.user_role,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Menyimpan profil admin dan staf yang terintegrasi dengan Supabase Auth';

-- ------------------------------------------------------------------------------
-- 3.2. MEMBERS (Data Member Gym)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_no TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    emergency_contact TEXT,
    photo_url TEXT,
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.members IS 'Master data member fitness/gym';

-- ------------------------------------------------------------------------------
-- 3.3. MEMBERSHIPS (Master Paket Layanan: Gym, PT, Kelas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    name TEXT NOT NULL,
    category public.membership_category_enum DEFAULT 'gym'::public.membership_category_enum,
    duration_days INTEGER NOT NULL,
    total_sessions INTEGER, -- Jumlah sesi jika paket merupakan Personal Trainer (PT)
    price NUMERIC(15, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.memberships IS 'Katalog paket harga gym, personal trainer, dan kelas';

-- ------------------------------------------------------------------------------
-- 3.4. SUBSCRIPTIONS (Status Masa Aktif Langganan Member)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_sessions INTEGER, -- Sisa sesi untuk paket PT
    total_sessions_override INTEGER, -- Override batas total sesi jika ada bonus/tambahan sesi
    previous_end_date DATE, -- Menyimpan tanggal expired sebelumnya saat perpanjangan/topup
    status public.subscription_status_enum DEFAULT 'active'::public.subscription_status_enum,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.subscriptions IS 'Transaksi paket aktif yang dimiliki oleh masing-masing member';

-- ------------------------------------------------------------------------------
-- 3.5. PAYMENTS (Catatan Transaksi & Pembayaran)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method public.payment_method_enum DEFAULT 'cash'::public.payment_method_enum,
    membership_type TEXT, -- Nama paket saat dibayar (statis untuk keperluan audit laporan)
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);
COMMENT ON TABLE public.payments IS 'Riwayat pemasukan keuangan dari pendaftaran/perpanjangan paket';

-- ------------------------------------------------------------------------------
-- 3.6. ATTENDANCE_LOGS (Log Absensi Check-In Kiosk & Staff)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    notes TEXT,
    check_in_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.attendance_logs IS 'Catatan riwayat kehadiran check-in member di gym';

-- ------------------------------------------------------------------------------
-- 3.7. EXPENSES (Catatan Pengeluaran Operasional)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    category TEXT NOT NULL DEFAULT 'operasional', -- operasional, maintenance, gaji, marketing, dll
    amount NUMERIC(15, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.expenses IS 'Catatan pengeluaran biaya operasional gym';

-- ------------------------------------------------------------------------------
-- 3.8. CLASSES (Jadwal Kelas Gym)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    name TEXT NOT NULL,
    trainer_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER DEFAULT 10,
    day_of_week public.day_of_week_enum NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.classes IS 'Master jadwal kelas latihan bersama dan kapasitasnya';

-- ------------------------------------------------------------------------------
-- 3.9. CLASS_BOOKINGS (Pendaftaran Peserta Kelas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_bookings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    booked_date DATE NOT NULL,
    status TEXT DEFAULT 'booked',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT class_bookings_unique_booking UNIQUE (class_id, member_id, booked_date)
);
COMMENT ON TABLE public.class_bookings IS 'Daftar booking kehadiran member pada kelas tertentu';

-- ------------------------------------------------------------------------------
-- 3.10. PT_SESSIONS (Sesi Pertemuan Personal Trainer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pt_sessions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.pt_sessions IS 'Jadwal dan status penyelesaian sesi latihan tatap muka bersama Personal Trainer';

-- ------------------------------------------------------------------------------
-- 3.11. NOTIFICATIONS (Notifikasi Sistem & Kiosk)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id UUID NOT NULL DEFAULT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'utc')
);
COMMENT ON TABLE public.notifications IS 'Notifikasi real-time untuk admin saat member check-in atau mendekati masa kadaluarsa';

-- ------------------------------------------------------------------------------
-- 3.12. ACTIVITY_LOGS (Audit Trail Aktivitas Admin & Staf)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    admin_id UUID,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.activity_logs IS 'Log jejak rekam perubahan data oleh admin/staff';

-- ------------------------------------------------------------------------------
-- 3.13. SETTINGS (Konfigurasi & Pengaturan Gym)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'lineup-gym-01',
    logo_url TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.settings IS 'Pengaturan informasi gym, logo, dan galeri foto';


-- ==============================================================================
-- 4. VIEWS (Tampilan Data Agregasi & Terpadu)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 4.1. VIEW: ACTIVE_SUBSCRIPTIONS_VIEW
-- Tampilan terpadu status member: masa aktif paket Gym & kuota sesi PT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.active_subscriptions_view AS
WITH latest_gym AS (
    SELECT DISTINCT ON (s.member_id)
        s.id AS subscription_id,
        s.member_id,
        s.start_date,
        s.end_date,
        s.status AS sub_status,
        m.name AS membership_name,
        m.price
    FROM public.subscriptions s
    JOIN public.memberships m ON s.membership_id = m.id
    WHERE m.category = 'gym'::public.membership_category_enum
    ORDER BY s.member_id, CASE WHEN s.status = 'active' THEN 1 ELSE 2 END, s.end_date DESC
), 
latest_pt AS (
    SELECT DISTINCT ON (s.member_id)
        s.id AS pt_subscription_id,
        s.member_id,
        s.start_date AS pt_start_date,
        s.end_date AS pt_end_date,
        s.status AS pt_sub_status,
        s.remaining_sessions,
        s.total_sessions_override,
        m.name AS pt_membership_name,
        m.price AS pt_price,
        m.total_sessions
    FROM public.subscriptions s
    JOIN public.memberships m ON s.membership_id = m.id
    WHERE m.category = 'pt'::public.membership_category_enum
    ORDER BY s.member_id, CASE WHEN s.status = 'active' THEN 1 ELSE 2 END, s.end_date DESC
)
SELECT 
    m.id AS member_id,
    m.gym_id,
    m.full_name,
    m.phone,
    m.member_no,
    m.emergency_contact,
    m.notes,
    m.photo_url,
    m.last_contacted_at,
    
    -- Informasi Paket Gym
    g.membership_name,
    g.price,
    g.subscription_id,
    g.start_date,
    g.end_date,
    (g.end_date - CURRENT_DATE) AS days_remaining,
    CASE
        WHEN (g.end_date IS NOT NULL AND g.end_date >= CURRENT_DATE AND g.sub_status = 'active'::public.subscription_status_enum) THEN
            CASE
                WHEN (g.end_date - CURRENT_DATE) <= 3 THEN 'critical'
                WHEN (g.end_date - CURRENT_DATE) <= 7 THEN 'expiring_soon'
                ELSE 'active'
            END
        WHEN ((g.end_date IS NULL OR g.end_date < CURRENT_DATE) AND (p.pt_end_date >= CURRENT_DATE AND p.remaining_sessions > 0 AND p.pt_sub_status = 'active'::public.subscription_status_enum)) THEN 'active'
        WHEN (g.end_date < CURRENT_DATE) THEN 'expired'
        WHEN (g.end_date IS NULL AND p.pt_subscription_id IS NULL) THEN 'inactive'
        ELSE 'inactive'
    END AS status,
    
    -- Informasi Paket Personal Trainer (PT)
    p.pt_membership_name,
    p.pt_subscription_id,
    p.pt_start_date,
    p.pt_end_date,
    p.remaining_sessions AS pt_remaining_sessions,
    COALESCE(p.total_sessions_override, p.total_sessions) AS pt_total_sessions,
    p.total_sessions_override,
    CASE
        WHEN p.pt_subscription_id IS NULL THEN 'inactive'
        WHEN (p.pt_sub_status = 'expired'::public.subscription_status_enum OR p.pt_sub_status = 'cancelled'::public.subscription_status_enum) THEN 'expired'
        WHEN (p.remaining_sessions IS NOT NULL AND p.remaining_sessions <= 0) THEN 'expired'
        WHEN (p.pt_end_date < CURRENT_DATE) THEN 'expired'
        ELSE 'active'
    END AS pt_status
FROM public.members m
LEFT JOIN latest_gym g ON m.id = g.member_id
LEFT JOIN latest_pt p ON m.id = p.member_id;

-- ------------------------------------------------------------------------------
-- 4.2. VIEW: REVENUE_MONTHLY_VIEW
-- Rekap pendapatan bulanan untuk chart grafik dashboard
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.revenue_monthly_view WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('month', paid_at) AS month,
    TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') AS month_label,
    SUM(amount) AS total,
    COUNT(id) AS transaction_count
FROM public.payments
GROUP BY DATE_TRUNC('month', paid_at), TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY')
ORDER BY DATE_TRUNC('month', paid_at) ASC;


-- ==============================================================================
-- 5. STORED PROCEDURES & TRIGGERS (Fungsi Logika Database)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 5.1. Fungsi Cek Duplikasi Nomor Telepon
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_existing_phone(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members 
        WHERE phone = p_phone
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.2. Fungsi Lookup Cepat untuk Kiosk Check-In
-- ------------------------------------------------------------------------------
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
    days_remaining INTEGER,
    status TEXT,
    pt_membership_name TEXT,
    pt_subscription_id UUID,
    pt_start_date DATE,
    pt_end_date DATE,
    pt_remaining_sessions INTEGER,
    pt_total_sessions INTEGER,
    pt_status TEXT,
    last_check_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
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
        (
            SELECT l.check_in_at 
            FROM public.attendance_logs l 
            WHERE l.member_id = v.member_id 
            ORDER BY l.check_in_at DESC 
            LIMIT 1
        ) AS last_check_in_at
    FROM public.active_subscriptions_view v
    WHERE (v.member_no = p_search_val OR v.phone = p_search_val)
    LIMIT 1;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5.3. Trigger: Sinkronisasi Akun Auth Baru ke Tabel Profiles
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE 
      WHEN NEW.email = 'admin@lineupgym.com' THEN 'admin'::public.user_role
      ELSE 'staff'::public.user_role
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Staff Baru')
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = CASE 
      WHEN EXCLUDED.email = 'admin@lineupgym.com' THEN 'admin'::public.user_role
      ELSE public.profiles.role
    END;
  RETURN NEW;
END;
$$;

-- Trigger ke Supabase Auth (dijalankan otomatis saat user register/dibuat di auth)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5.4. Trigger: Proteksi Perubahan Role User (Hanya Admin yang Bisa Ubah Role)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preserve_role_on_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        NEW.role := OLD.role;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_preserve_role_on_user_update ON public.profiles;
CREATE TRIGGER tr_preserve_role_on_user_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.preserve_role_on_user_update();

-- ------------------------------------------------------------------------------
-- 5.5. Trigger: Update Waktu Terakhir Aktif (last_seen_at)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET last_seen_at = NOW()
    WHERE id = auth.uid();
    RETURN NEW;
END;
$$;


-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.1. Policies: Profiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles 
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Only admins can update roles" ON public.profiles;
CREATE POLICY "Only admins can update roles" ON public.profiles 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public.user_role)
    );

DROP POLICY IF EXISTS "Enable insert for system trigger" ON public.profiles;
CREATE POLICY "Enable insert for system trigger" ON public.profiles 
    FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6.2. Policies: General Access untuk Pengguna Login (Staff & Admin)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users full access - members" ON public.members;
CREATE POLICY "Authenticated users full access - members" ON public.members 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - memberships" ON public.memberships;
CREATE POLICY "Authenticated users full access - memberships" ON public.memberships 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - subscriptions" ON public.subscriptions;
CREATE POLICY "Authenticated users full access - subscriptions" ON public.subscriptions 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - payments" ON public.payments;
CREATE POLICY "Authenticated users full access - payments" ON public.payments 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - attendance_logs" ON public.attendance_logs;
CREATE POLICY "Authenticated users full access - attendance_logs" ON public.attendance_logs 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - expenses" ON public.expenses;
CREATE POLICY "Authenticated users full access - expenses" ON public.expenses 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - classes" ON public.classes;
CREATE POLICY "Authenticated users full access - classes" ON public.classes 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - class_bookings" ON public.class_bookings;
CREATE POLICY "Authenticated users full access - class_bookings" ON public.class_bookings 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - pt_sessions" ON public.pt_sessions;
CREATE POLICY "Authenticated users full access - pt_sessions" ON public.pt_sessions 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - activity_logs" ON public.activity_logs;
CREATE POLICY "Authenticated users full access - activity_logs" ON public.activity_logs 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - notifications" ON public.notifications;
CREATE POLICY "Authenticated users full access - notifications" ON public.notifications 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users full access - settings" ON public.settings;
CREATE POLICY "Authenticated users full access - settings" ON public.settings 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6.3. Policies: Akses Publik / Kiosk (Anonim)
-- ------------------------------------------------------------------------------
-- Publik bisa melihat paket membership yang aktif di website
DROP POLICY IF EXISTS "Public read active memberships" ON public.memberships;
CREATE POLICY "Public read active memberships" ON public.memberships 
    FOR SELECT TO anon USING (is_active = true);

-- Layar Kiosk absensi bisa mencatat check-in member tanpa perlu login staff
DROP POLICY IF EXISTS "Kiosk insert attendance_logs" ON public.attendance_logs;
CREATE POLICY "Kiosk insert attendance_logs" ON public.attendance_logs 
    FOR INSERT TO anon WITH CHECK (true);

-- Layar Kiosk bisa membaca data absensi untuk menampilkan konfirmasi
DROP POLICY IF EXISTS "Kiosk read attendance_logs" ON public.attendance_logs;
CREATE POLICY "Kiosk read attendance_logs" ON public.attendance_logs 
    FOR SELECT TO anon USING (true);

-- Layar Kiosk bisa memicu pembuatan notifikasi
DROP POLICY IF EXISTS "Kiosk insert notifications" ON public.notifications;
CREATE POLICY "Kiosk insert notifications" ON public.notifications 
    FOR INSERT TO anon WITH CHECK (true);


-- ==============================================================================
-- 7. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
-- Menyalakan listener realtime Supabase untuk halaman monitoring & absensi
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==============================================================================
-- 8. DEFAULT SEED DATA (Paket Standar Lineup Gym)
-- ==============================================================================
INSERT INTO public.memberships (name, category, duration_days, total_sessions, price, description) VALUES
    ('DAY',                'gym', 1,    NULL, 15000,  'Akses Gym 1 Hari Penuh'),
    ('SAUNA',              'gym', 1,    NULL, 25000,  'Akses Fasilitas Sauna 15 Menit'),
    ('COUPLE',             'gym', 30,   NULL, 300000, 'Akses Penuh 1 Bulan (2 Orang)'),
    ('SISWA/MAHASISWA',    'gym', 30,   NULL, 125000, 'Akses Penuh 1 Bulan (Pelajar/Mahasiswa)'),
    ('UMUM',               'gym', 30,   NULL, 150000, 'Akses Penuh 1 Bulan'),
    ('PELAJAR 3 BULAN',    'gym', 90,   NULL, 300000, 'Akses Penuh 3 Bulan'),
    ('UMUM 3 BULAN',       'gym', 90,   NULL, 375000, 'Akses Penuh 3 Bulan'),
    ('PERSONAL TRAINER 4', 'pt',  30,   4,    300000, 'Paket PT 4 Kali Pertemuan'),
    ('PERSONAL TRAINER 8', 'pt',  30,   8,    500000, 'Paket PT 8 Kali Pertemuan'),
    ('PERSONAL TRAINER 16','pt',  60,   16,   750000, 'Paket PT 16 Kali Pertemuan')
ON CONFLICT DO NOTHING;

-- Inisialisasi Data Settings Default jika belum ada
INSERT INTO public.settings (id, logo_url, gallery)
VALUES ('lineup-gym-01', NULL, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
--                              SELESAI
-- ==============================================================================
