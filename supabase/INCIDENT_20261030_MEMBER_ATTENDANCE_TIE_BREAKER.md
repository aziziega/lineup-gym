# 📌 Dokumentasi Insiden & Solusi: Tie-Breaker Active Subscriptions View (30 Oktober 2026)

## 1. Kronologi & Gejala Masalah
- **Kasus:** Member No. **568** atas nama **Ramadhana Bagas Utama** memperpanjang paket gym *"SISWA/MAHASISWA PROMO SUMPAH PEMUDA"*, tetapi tidak bisa absen di mesin Kiosk/Check-in.
- **Gejala di Kiosk:** Kiosk mendeteksi status member sebagai `inactive` / `expired` meskipun baru saja membayar perpanjangan paket.

---

## 2. Analisis Akar Masalah (Root Cause)
1. **Submit Ganda di Kasir:**
   Pada tanggal 29 Oktober 2026 jam 12:05 WIB (05:05 UTC), perpanjangan paket ter-submit berulang kali dalam 2 detik (terbuat 9 baris subscription dengan `start_date: 2026-10-29` dan `end_date: 2026-11-28`).
   - 6 baris ter-update menjadi `expired` oleh fungsi perpanjangan.
   - 3 baris terbuat dengan status `active`.
2. **Kelemahan pada View Database (`active_subscriptions_view`):**
   Pada CTE `latest_gym`:
   ```sql
   ORDER BY s.member_id, s.end_date DESC
   ```
   Karena semua 9 baris langganan memiliki `end_date` yang identik (`2026-11-28`), PostgreSQL `DISTINCT ON (s.member_id)` memilih salah satu baris secara arbitrer, dan kebetulan memilih baris yang berstatus `expired`.
3. Akibatnya, `active_subscriptions_view` mengkalkulasikan status member menjadi `inactive`, sehingga Kiosk menolak absensi.

---

## 3. Tindakan Perbaikan

### A. Pembersihan Data Member 568
Menghapus baris duplikat yang expired dan menyisakan 1 baris active utama:
```sql
DELETE FROM public.subscriptions
WHERE member_id = '1bd332a6-dbf2-4093-aab3-6c5eed5eb00f'
  AND start_date = '2026-10-29'
  AND status = 'expired';

DELETE FROM public.subscriptions
WHERE id IN (
  '8b9f4863-00b2-4562-9175-f9901273c901', 
  '3eaa98f5-e2be-455c-a382-fe31b2e0ca23'
);
```

### B. Patch Permanen pada View (`active_subscriptions_view`)
Menambahkan tie-breaker prioritas `status = 'active'` dan `created_at DESC` pada `latest_gym`:
```sql
ORDER BY s.member_id, (s.status = 'active') DESC, s.end_date DESC, s.created_at DESC
```
File migrasi resmi tersimpan di:
`supabase/migrations/20261030_fix_active_subscriptions_view_gym_and_pt_tie_breaker.sql`
Master schema diperbarui di:
`supabase/schema.sql`
