-- =========================================================================
-- MIGRATION: Fix Active Subscriptions View Gym & PT Tie-Breaker
-- Tanggal: 30 Oktober 2026
-- 
-- Masalah yang diatasi:
-- Ketika kasir/admin memproses perpanjangan (renewal) paket dan terjadi submit berulang
-- dalam hitungan detik, beberapa baris subscription terbuat dengan end_date yang sama.
-- View sebelumnya hanya melakukan 'ORDER BY s.member_id, s.end_date DESC' pada latest_gym.
-- Hal ini membuat PostgreSQL memilih baris berstatus 'expired' secara acak ketika end_date identik,
-- sehingga member yang sah (seperti Member No. 568 Ramadhana Bagas Utama) terhitung 'inactive'
-- dan gagal absen di Kiosk.
--
-- Solusi:
-- 1. Tambahkan tie-breaker: (s.status = 'active') DESC dan s.created_at DESC pada latest_gym.
-- 2. Pertahankan tie-breaker: (s.remaining_sessions > 0) DESC dan s.created_at DESC pada latest_pt.
-- =========================================================================

DROP VIEW IF EXISTS public.active_subscriptions_view CASCADE;

CREATE VIEW public.active_subscriptions_view AS
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
    WHERE m.category = 'gym'
    -- KUNCI PERBAIKAN: Prioritaskan paket active, lalu end_date terlama, lalu paket terbaru
    ORDER BY s.member_id, (s.status = 'active') DESC, s.end_date DESC, s.created_at DESC
),
latest_pt AS (
    SELECT DISTINCT ON (s.member_id)
        s.id AS pt_subscription_id,
        s.member_id,
        s.start_date AS pt_start_date,
        s.end_date AS pt_end_date,
        s.status AS pt_sub_status,
        s.remaining_sessions,
        m.name AS pt_membership_name,
        m.price AS pt_price,
        COALESCE(s.total_sessions_override, m.total_sessions) AS total_sessions
    FROM public.subscriptions s
    JOIN public.memberships m ON s.membership_id = m.id
    WHERE m.category = 'pt'
    -- KUNCI PERBAIKAN: Prioritaskan paket yang masih punya kuota (>0), lalu paket terbaru
    ORDER BY s.member_id, (s.remaining_sessions > 0) DESC, s.created_at DESC
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
    g.membership_name,
    g.price,
    g.subscription_id,
    g.start_date,
    g.end_date,
    (g.end_date - CURRENT_DATE) AS days_remaining,
    CASE
        WHEN g.end_date IS NOT NULL AND g.end_date >= CURRENT_DATE AND g.sub_status = 'active' THEN
            CASE
                WHEN (g.end_date - CURRENT_DATE) <= 3 THEN 'critical'
                WHEN (g.end_date - CURRENT_DATE) <= 7 THEN 'expiring_soon'
                ELSE 'active'
            END
        WHEN (p.remaining_sessions IS NOT NULL AND p.remaining_sessions > 0 AND p.pt_sub_status = 'active')
        THEN 'active'
        WHEN g.end_date < CURRENT_DATE THEN 'expired'
        WHEN g.end_date IS NULL AND p.pt_subscription_id IS NULL THEN 'inactive'
        ELSE 'inactive'
    END AS status,
    p.pt_membership_name,
    p.pt_subscription_id,
    p.pt_start_date,
    p.pt_end_date,
    p.remaining_sessions AS pt_remaining_sessions,
    p.total_sessions AS pt_total_sessions,
    CASE
        WHEN p.pt_subscription_id IS NULL THEN 'inactive'
        WHEN p.pt_sub_status = 'expired' OR p.pt_sub_status = 'cancelled' THEN 'expired'
        WHEN p.remaining_sessions IS NOT NULL AND p.remaining_sessions <= 0 THEN 'expired'
        ELSE 'active'
    END AS pt_status
FROM public.members m
LEFT JOIN latest_gym g ON m.id = g.member_id
LEFT JOIN latest_pt p ON m.id = p.member_id;

COMMENT ON VIEW public.active_subscriptions_view IS 'View status aktif member dengan tie-breaker aman untuk gym (active status) dan PT (sisa kuota sesi > 0).';
