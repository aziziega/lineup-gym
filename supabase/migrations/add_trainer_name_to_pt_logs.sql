-- =========================================================================
-- MIGRATION: Tambah Kolom trainer_name ke tabel pt_progress_logs
-- =========================================================================
-- Tanggal: 13 Oktober 2026
-- Deskripsi: Menambahkan kolom trainer_name untuk mencatat nama pelatih/coach
--            yang menangani sesi latihan live member PT.
-- =========================================================================

ALTER TABLE public.pt_progress_logs
ADD COLUMN IF NOT EXISTS trainer_name TEXT;

-- Komentar dokumentasi kolom
COMMENT ON COLUMN public.pt_progress_logs.trainer_name IS 'Nama Personal Trainer / Coach yang memimpin sesi live workout (input fleksibel bebas)';
