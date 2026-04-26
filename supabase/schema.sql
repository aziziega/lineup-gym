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

-- Enum untuk kategori paket
CREATE TYPE membership_category_enum AS ENUM ('gym', 'pt', 'class');

-- Enum untuk hari dalam kelas
CREATE TYPE day_of_week_enum AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');


-- ==========================================
-- 2. TABLES
-- ==========================================

-- Table: Memberships (Paket Gym & PT)
CREATE TABLE memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01', -- Hardcoded secara default seperti konstanta di web
    name TEXT NOT NULL,
    category membership_category_enum DEFAULT 'gym',
    duration_days INTEGER NOT NULL,
    total_sessions INTEGER, -- Null untuk paket gym biasa
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
    remaining_sessions INTEGER, -- Null jika bukan paket PT
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

-- Table: Expenses (Pengeluaran Gym)
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gym_id TEXT NOT NULL DEFAULT 'lineup-gym-01',
    category TEXT NOT NULL DEFAULT 'operasional', -- operasional, maintenance, gaji, marketing, dll
    amount NUMERIC(15, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- Penjelasan: Sangat krusial untuk menghitung siapa yang belum/sudah bayar, sisa hari, dan sisa sesi PT
CREATE OR REPLACE VIEW active_subscriptions_view AS
WITH latest_gym AS (
    SELECT DISTINCT ON (s.member_id) 
        s.id AS subscription_id, s.member_id, s.start_date, s.end_date, s.status AS sub_status,
        m.name AS membership_name, m.price
    FROM subscriptions s
    JOIN memberships m ON s.membership_id = m.id
    WHERE m.category = 'gym'
    ORDER BY s.member_id, s.end_date DESC
),
latest_pt AS (
    SELECT DISTINCT ON (s.member_id) 
        s.id AS pt_subscription_id, s.member_id, s.start_date AS pt_start_date, s.end_date AS pt_end_date, s.status AS pt_sub_status, s.remaining_sessions,
        m.name AS pt_membership_name, m.price AS pt_price, m.total_sessions
    FROM subscriptions s
    JOIN memberships m ON s.membership_id = m.id
    WHERE m.category = 'pt'
    ORDER BY s.member_id, s.end_date DESC
)
SELECT 
    m.id AS member_id,
    m.gym_id,
    m.full_name,
    m.phone,
    m.photo_url,
    
    -- Gym Info
    g.membership_name,
    g.price,
    g.subscription_id,
    g.start_date,
    g.end_date,
    (g.end_date - CURRENT_DATE) AS days_remaining,
    CASE 
        WHEN g.end_date IS NULL THEN 'inactive'
        WHEN g.end_date < CURRENT_DATE THEN 'expired'
        WHEN (g.end_date - CURRENT_DATE) <= 3 THEN 'critical'
        WHEN (g.end_date - CURRENT_DATE) <= 7 THEN 'expiring_soon'
        ELSE 'active'
    END AS status,

    -- PT Info
    p.pt_membership_name,
    p.pt_subscription_id,
    p.pt_start_date,
    p.pt_end_date,
    p.remaining_sessions AS pt_remaining_sessions,
    p.total_sessions AS pt_total_sessions,
    CASE
        WHEN p.pt_end_date IS NULL THEN 'inactive'
        WHEN p.remaining_sessions <= 0 THEN 'expired'
        WHEN p.pt_end_date < CURRENT_DATE THEN 'expired'
        ELSE 'active'
    END AS pt_status

FROM members m
LEFT JOIN latest_gym g ON m.id = g.member_id
LEFT JOIN latest_pt p ON m.id = p.member_id;

-- View: Revenue Monthly View
-- Penjelasan: Menggabungkan transaksi untuk grafik di dashboard
CREATE OR REPLACE VIEW revenue_monthly_view AS
SELECT 
    DATE_TRUNC('month', paid_at) as month,
    TO_CHAR(DATE_TRUNC('month', paid_at), 'Mon YYYY') as month_label,
    SUM(amount) as total,
    COUNT(id) as transaction_count
FROM payments
GROUP BY 1, 2
ORDER BY 1 ASC;
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
