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
    
2. **Digital Assessment & Progress Tracking**
   - **Target V2:** Menu baru di profil member untuk mencatat perkembangan fisik bulanan (Berat Badan, Lingkar Perut, Body Fat, dan Target).

3. **Integrasi Barcode/QR Check-In Kiosk**
   - **Target V2:** Member tidak perlu mengetikkan nomor atau nama di layar Kiosk. Mereka cukup men-*scan* *barcode* ID card mereka ke kamera iPad/Laptop untuk melakukan absen gym atau memotong jatah sesi PT.

4. **Multi-Coach PT Support**
   - **Catatan:** Saat ini sistem mengasumsikan hanya ada 1 Personal Trainer (conflict check 1 sesi per jam global).
   - **Target V2:** Tambah field `trainer_id` di tabel `pt_sessions`, UI dropdown pilih trainer, conflict check per-trainer sehingga 2 coach bisa latih member berbeda di jam yang sama.
   - **Trigger:** Fitur ini diaktifkan saat Line Up Gym menambah coach kedua.

5. **Server-Side Pagination**
   - **Target V2:** Halaman Keuangan dan log check-in perlu dipaginate saat data sudah ribuan.
   - **Estimasi trigger:** Saat total transaksi > 2000 atau load time terasa lambat.

6. **Role-Based Access (Admin vs Staff)**
   - **Alasan ditunda:** Menunggu feedback dari owner terkait kebutuhan staff dan pembagian akses.
   - **Konsep:** Admin akses penuh (termasuk Keuangan), Staff akses semua kecuali Revenue.
   - **Implementasi:** Field `role` di Supabase Auth user metadata + guard di halaman finance.

7. **Full-Auto Kwitansi via API (Fonnte/Wablas)**
   - **Alasan ditunda:** Butuh langganan API berbayar (~Rp100-200k/bulan) dan risiko nomor WA di-ban jika terdeteksi bot.
   - **Status Saat Ini:** Menggunakan Opsi Semi-Auto (generate link `wa.me` dengan teks kwitansi) yang sudah berjalan di V1.
   - **Target V2:** Server secara otomatis mengirim WA ke member tanpa admin perlu klik — begitu pembayaran selesai, kwitansi terkirim langsung.


9. **Pendaftaran Member Full-Digital (Paperless)**
    - **Target V2:** Menggantikan formulir kertas manual dengan sistem pendaftaran langsung di tablet/website. Member bisa input data diri lengkap (termasuk Tempat & Tanggal Lahir).
    - **Fitur Khusus:** Notifikasi otomatis dan pemberian diskon perpanjangan otomatis bagi member yang sedang berulang tahun.

10. **Security Hardening (Supabase RPC for Critical Logic)**
    - **Tujuan:** Mencegah manipulasi data dari sisi browser (Console).
    - **Requirement:** Memindahkan logika krusial seperti pembuatan pembayaran (payment) dan approval visitor ke fungsi database (PostgreSQL RPC).
    - **Mekanisme:** Database akan menghitung sendiri harga paket dan tanggal aktif berdasarkan data internal, bukan berdasarkan kiriman angka dari browser.

11. **Modul Keuangan Mendalam (Intelligence Dashboard)**
    - **Tujuan:** Memberikan wawasan strategis bagi Owner untuk pengambilan keputusan bisnis.
    - **Requirement:**
        - **Dashboard P&L (Laba/Rugi):** Visualisasi otomatis pendapatan bersih (Pemasukan - Pengeluaran Operasional).
        - **Forecasting:** Proyeksi pendapatan bulan depan berdasarkan jumlah member aktif yang akan expired.
        - **Peak Time Analysis:** Grafik waktu/hari tersibuk untuk optimasi penggunaan AC/Listrik atau jadwal staff.
        - **Expense Categorization:** Pengelompokan biaya operasional (Gaji, Listrik, Maintenance) untuk melihat kebocoran dana.



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

---

## 📝 NOTE UNTUK OWNER GYM
Berikut adalah daftar informasi penting yang harus diketahui dan dijalankan oleh Owner Gym agar sistem berjalan lancar:

1. **Paket Wajib "DAY"**: Sistem approval visitor harian bergantung pada adanya paket membership bernama **"DAY"** (atau mengandung kata "DAY") di database. Harap pastikan paket ini sudah dibuat di menu **Paket Membership** dengan harga yang sesuai (misal: Rp 20.000). Jika paket ini tidak ada, tombol "Izinkan & Absen" di notifikasi akan gagal.
2. **Nomor WhatsApp Admin**: Pastikan nomor WhatsApp yang digunakan untuk mengirim struk/reminder sudah benar di file konfigurasi `.env`.
3. **Pemberian Izin (Approval)**: Notifikasi visitor baru harus segera diproses agar data laporan keuangan dan absensi tercatat secara real-time. Jika visitor ditolak, datanya akan terhapus permanen dari sistem.
4. **Keamanan Data (RLS)**: Pastikan kebijakan keamanan (RLS) sudah diaktifkan di dashboard Supabase menggunakan script yang telah disediakan pengembang agar data member tidak bisa diakses orang luar.
5. **Konfirmasi Real-time**: Jika notifikasi tidak muncul secara otomatis, pastikan koneksi internet stabil dan fitur Real-time sudah diaktifkan di tabel `notifications` melalui Supabase.
