-- ============================================
-- MIGRATION v2: Line Up Gym - Jalankan di Supabase SQL Editor
-- Tanggal: 30 April 2026
-- ============================================

-- 1. Drop view lama lalu buat ulang dengan PT status session-based
DROP VIEW IF EXISTS active_subscriptions_view;
CREATE VIEW active_subscriptions_view AS
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
    m.member_no,
    m.emergency_contact,
    m.notes,
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
        WHEN p.pt_subscription_id IS NULL THEN 'inactive'
        WHEN p.pt_sub_status = 'expired' OR p.pt_sub_status = 'cancelled' THEN 'expired'
        WHEN p.remaining_sessions IS NOT NULL AND p.remaining_sessions <= 0 THEN 'expired'
        ELSE 'active'
    END AS pt_status

FROM members m
LEFT JOIN latest_gym g ON m.id = g.member_id
LEFT JOIN latest_pt p ON m.id = p.member_id;

-- 2. Re-activate PT subscriptions yang salah ter-expire (fix data lama)
UPDATE subscriptions s
SET status = 'active'
FROM memberships m
WHERE s.membership_id = m.id
  AND m.category = 'pt'
  AND s.status = 'expired'
  AND s.remaining_sessions IS NOT NULL
  AND s.remaining_sessions > 0;
