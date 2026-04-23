-- File: supabase/schema.sql
-- Keterangan: Anda dapat meng-copy kode ini seluruhnya dan menjalankannya di SQL Editor Supabase.

-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum untuk metode pembayaran
CREATE TYPE payment_method_enum AS ENUM ('cash', 'transfer', 'qris');

-- Enum untuk status subscription
CREATE TYPE subscription_status_enum AS ENUM ('active', 'expired', 'cancelled');

-- Enum untuk hari dalam kelas
CREATE TYPE day_of_week_enum AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');


-- ==========================================
-- 2. TABLES
-- ==========================================

-- Table: Memberships (Paket Gym)
CREATE TABLE memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01', -- Hardcoded secara default seperti konstanta di web
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Members
CREATE TABLE members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    emergency_contact TEXT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Subscriptions (Masa Aktif Member)
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status subscription_status_enum DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Payments (Pembayaran & Transaksi)
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method payment_method_enum DEFAULT 'cash',
    membership_type TEXT, -- Disimpan statis agar tidak hilang jika paket dihapus/berubah nama
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Table: Attendance Logs (Absensi/Check-In)
CREATE TABLE attendance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Classes (Jadwal Kelas)
CREATE TABLE classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    name TEXT NOT NULL,
    trainer_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER DEFAULT 10,
    day_of_week day_of_week_enum NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Class Bookings (Pendaftaran Kelas)
CREATE TABLE class_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    booked_date DATE NOT NULL,
    status TEXT DEFAULT 'booked',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, member_id, booked_date) -- 1 member hanya bisa 1x booking kelas yang sama di hari yang sama
);

-- Table: Activity Logs (Audit Trail Admin)
CREATE TABLE activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    admin_id UUID, -- Mereferensikan Auth User dari Supabase Auth
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 3. VIEWS (TAMPILAN DATA TERGABUNG)
-- ==========================================

-- View: Active Subscriptions View
-- Penjelasan: Sangat krusial untuk menghitung siapa yang belum/sudah bayar, dan menghitung sisa hari
CREATE OR REPLACE VIEW active_subscriptions_view AS
WITH latest_subscriptions AS (
    SELECT DISTINCT ON (member_id) 
        id, member_id, membership_id, start_date, end_date, status
    FROM subscriptions
    ORDER BY member_id, end_date DESC
)
SELECT 
    m.id AS member_id,
    m.gym_id,
    m.full_name,
    m.phone,
    m.photo_url,
    pkg.name AS membership_name,
    pkg.price,
    s.id AS subscription_id,
    s.start_date,
    s.end_date,
    (s.end_date - CURRENT_DATE) AS days_remaining,
    -- Menentukan Status: active, expiring_soon, critical, expired
    CASE 
        WHEN s.end_date < CURRENT_DATE THEN 'expired'
        WHEN (s.end_date - CURRENT_DATE) <= 3 THEN 'critical'
        WHEN (s.end_date - CURRENT_DATE) <= 7 THEN 'expiring_soon'
        ELSE 'active'
    END AS status
FROM members m
LEFT JOIN latest_subscriptions s ON m.id = s.member_id
LEFT JOIN memberships pkg ON s.membership_id = pkg.id;


-- ==========================================
-- 4. RLS (Row Level Security) - "Dimatikan"
-- ==========================================
-- Sesuai permintaan, RLS akan kita pastikan mati agar tidak menghalangi akses pengembangan.
-- Jika sudah aktif, matikan dengan kode berikut:

ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. SEED DATA DEFAULT (OPSIONAL)
-- ==========================================
-- Masukkan 1 paket default agar saat Anda tes, fiturnya sudah jalan
INSERT INTO memberships (name, duration_days, price, description)
VALUES ('Paket Bulanan (Promo)', 30, 250000, 'Akses penuh selama sebulan penuh (Tanpa PT)');
