# Lineup Gym - Development Roadmap & Backlog

Dokumen ini berisi rangkuman kebutuhan dari interview owner, hasil brainstorming, dan status pengembangan fitur-fitur Line Up Gym.

---

## ✅ SELESAI (Status: Siap Digunakan)
Fitur-fitur utama penyokong operasional gym yang sudah beroperasi 100% di dalam Dashboard V1:

1. **Personal Training (PT) Separated Package**
   - Pemisahan paket Gym dan PT dalam satu profil member.
   - Perhitungan sisa sesi PT yang dinamis dan terpisah dari durasi aktif Gym.
   - Manajemen Jadwal PT dan penandaan sesi yang sudah diselesaikan.
   - Searchable combobox untuk pilih member PT + live data sinkronisasi.
2. **Expense Management & Laporan Keuangan**
   - Pencatatan pemasukan (pembayaran paket) dan pengeluaran (operasional, gaji, maintenance).
   - Grafik Revenue yang membandingkan pemasukan kotor dan pengeluaran bersih per bulan.
3. **Manajemen Visitor Harian (Day Pass)**
   - Pendaftaran pengunjung harian via Kiosk.
   - Fitur "Approve & Izinkan" oleh admin dengan harga dinamis.
   - Perpanjangan otomatis dari Visitor menjadi Member Reguler.
4. **Perbaikan Flow Manajemen Member**
   - Form penambahan dan perpanjangan yang opsional (Bisa beli PT saja atau Gym saja).
   - Penghapusan data yang aman tanpa menyangkut *foreign key constraint* (menghapus riwayat transaksi/PT sekaligus).
5. **Template WhatsApp Reminder**
   - Pesan kontekstual berdasarkan status (aktif, hari ini, sudah expired).
   - Emoji dihapus karena menyebabkan karakter `?` di WhatsApp.
   - Menggunakan *bold text* (`*...*`) yang didukung WhatsApp formatting.

---

## 🚧 SISA VERSI 1 (Segera Dikerjakan)
Fitur yang akan diselesaikan untuk menutup Versi 1 sebelum peluncuran resmi:

### 1. Landing Page Publik
Halaman depan website (tanpa perlu login) untuk menampilkan informasi Line Up Gym kepada calon pelanggan.
- **Tujuan:** Menarik minat pengunjung internet.
- **Isi:** Foto ruangan/alat gym, harga paket (diambil otomatis dari database jika memungkinkan), jam operasional, lokasi (Maps), dan link pendaftaran via WhatsApp.

### 2. ~~Kirim Struk Kwitansi via WhatsApp~~ ✅ SELESAI
Fitur ringan untuk mengirim bukti transaksi digital kepada member.
- **Eksekusi (Semi-Auto):** Setelah berhasil menambah member baru atau perpanjangan, muncul dialog preview kwitansi dengan tombol "Kirim ke WA" yang membuka `wa.me` dengan teks struk rapi (nama, paket, harga, tanggal, metode bayar).
- **Status:** Sudah diimplementasi di halaman Manajemen Member.

### 3. SOP Paket Group (Couple, Trio, Squad)
Sistem *workaround* jenius dari owner tanpa perlu mengubah kode database:
- **Konsep:** Owner membuat 2 jenis paket di menu Manajemen Paket.
  1. `COUPLE (Utama)` — Harga Rp 300.000
  2. `COUPLE (Anggota)` — Harga Rp 0
- **Pendaftaran:** Orang pertama didaftarkan pakai paket Utama (uang masuk ke sistem). Orang kedua didaftarkan pakai paket Anggota (gratis).
- **Keuntungan:** Kedua orang punya nomor member masing-masing, bisa check-in mandiri, dapat reminder WA, tapi uang pemasukan di laporan keuangan tidak double/kacau.
- **Tindakan (Selesai):** Fitur ini 100% menggunakan sistem yang sudah ada. Tidak perlu koding tambahan.

### 4. Keamanan — Aktifkan Row Level Security (RLS)
- **Status:** SEMUA tabel saat ini RLS dinonaktifkan (CRITICAL di Supabase dashboard).
- **Wajib sebelum deploy ke production** agar data tidak bisa diakses publik.
- **Target:** Minimal policy `authenticated` untuk semua tabel.

---

## 🚀 BACKLOG VERSI 2 (Ditunda untuk Pengembangan Masa Depan)
Fitur-fitur *advanced* yang ditunda ke pembaruan sistem tahap selanjutnya (V2):

1. **Automated WhatsApp Reminder via Fonnte API**
   - **Alasan ditunda:** Belum ada API Key dan proses integrasi pihak ketiga butuh waktu khusus.
   - **Status Saat Ini:** Admin masih menggunakan tombol "Kirim WA Manual" dari halaman Expiry yang mengandalkan template `wa.me`.
    
2. **Bulk Data Importer (Excel ke Database)**
   - **Alasan ditunda:** Struktur kolom data asli di file Excel owner belum dapat dipastikan, dan kebutuhan pemindahan data massal disepakati untuk dilakukan manual sementara waktu.
   - **Target V2:** Form unggah `.csv` atau `.xlsx` yang akan me-*mapping* otomatis ke tabel member.

3. **Digital Assessment & Progress Tracking**
   - **Target V2:** Menu baru di profil member untuk mencatat perkembangan fisik bulanan (Berat Badan, Lingkar Perut, Body Fat, dan Target).

4. **Integrasi Barcode/QR Check-In Kiosk**
   - **Target V2:** Member tidak perlu mengetikkan nomor atau nama di layar Kiosk. Mereka cukup men-*scan* *barcode* ID card mereka ke kamera iPad/Laptop untuk melakukan absen gym atau memotong jatah sesi PT.

5. **Multi-Coach PT Support**
   - **Catatan:** Saat ini sistem mengasumsikan hanya ada 1 Personal Trainer (conflict check 1 sesi per jam global).
   - **Target V2:** Tambah field `trainer_id` di tabel `pt_sessions`, UI dropdown pilih trainer, conflict check per-trainer sehingga 2 coach bisa latih member berbeda di jam yang sama.
   - **Trigger:** Fitur ini diaktifkan saat Line Up Gym menambah coach kedua.

6. **Server-Side Pagination**
   - **Target V2:** Halaman Keuangan dan log check-in perlu dipaginate saat data sudah ribuan.
   - **Estimasi trigger:** Saat total transaksi > 2000 atau load time terasa lambat.

7. **Role-Based Access (Admin vs Staff)**
   - **Alasan ditunda:** Menunggu feedback dari owner terkait kebutuhan staff dan pembagian akses.
   - **Konsep:** Admin akses penuh (termasuk Keuangan), Staff akses semua kecuali Revenue.
   - **Implementasi:** Field `role` di Supabase Auth user metadata + guard di halaman finance.

8. **Full-Auto Kwitansi via API (Fonnte/Wablas)**
   - **Alasan ditunda:** Butuh langganan API berbayar (~Rp100-200k/bulan) dan risiko nomor WA di-ban jika terdeteksi bot.
   - **Status Saat Ini:** Menggunakan Opsi Semi-Auto (generate link `wa.me` dengan teks kwitansi) yang sudah berjalan di V1.
   - **Target V2:** Server secara otomatis mengirim WA ke member tanpa admin perlu klik — begitu pembayaran selesai, kwitansi terkirim langsung.

9. **Validasi Anti-Spam Check-In (Double Scan Protection)**
   - **Target V2:** Member hanya bisa melakukan check-in 1x dalam kurun waktu 2-3 jam untuk mencegah kecurangan (misal QR code di-screenshot dan dikirim ke teman).


---

## 📝 CATATAN TEKNIS

### Supabase Free Tier — Limitasi yang Perlu Diperhatikan
| Resource | Limit Free | Estimasi Pemakaian Saat Ini |
|----------|-----------|---------------------------|
| Database Size | 500 MB | ~10-20 MB (aman) |
| API Requests | 500K/bulan | ~50-100K/bulan (aman) |
| Realtime Connections | 200 concurrent | ~1-5 (aman) |
| Storage | 1 GB | Tidak dipakai (aman) |
| Auth Users | Unlimited | ~2-5 admin (aman) |
| **Auto Backup** | ❌ Tidak ada | ⚠️ Manual backup direkomendasikan |

**Kesimpulan:** Dengan 400-500 member dan 1 gym, free tier **masih cukup** untuk 1-2 tahun ke depan. Upgrade ke paid ($25/bulan) direkomendasikan hanya jika:
- Butuh auto-backup (peace of mind)
- API request mendekati limit
- Butuh custom domain untuk Supabase (vanity URL)

### Deploy ke Vercel
- Push repository ke GitHub
- Connect GitHub repo di vercel.com
- Set environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **WAJIB:** Aktifkan RLS sebelum deploy
- Domain custom bisa ditambahkan di Vercel settings
