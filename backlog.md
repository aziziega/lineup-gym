# Lineup Gym - Development Roadmap & Backlog

Dokumen ini berisi rangkuman kebutuhan dari interview owner, hasil brainstorming, dan status pengembangan fitur-fitur Line Up Gym.

---

## ✅ SELESAI (Status: Siap Digunakan)
Fitur-fitur utama penyokong operasional gym yang sudah beroperasi 100% di dalam Dashboard V1:

1. **Personal Training (PT) Separated Package**
   - Pemisahan paket Gym dan PT dalam satu profil member.
   - Perhitungan sisa sesi PT yang dinamis dan terpisah dari durasi aktif Gym.
   - Manajemen Jadwal PT dan penandaan sesi yang sudah diselesaikan.
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

---

## 🚧 SISA VERSI 1 (Segera Dikerjakan)
Fitur yang akan diselesaikan untuk menutup Versi 1 sebelum peluncuran resmi:

### 1. Landing Page Publik
Halaman depan website (tanpa perlu login) untuk menampilkan informasi Line Up Gym kepada calon pelanggan.
- **Tujuan:** Menarik minat pengunjung internet.
- **Isi:** Foto ruangan/alat gym, harga paket (diambil otomatis dari database jika memungkinkan), jam operasional, lokasi (Maps), dan link pendaftaran via WhatsApp.

### 2. Kirim Struk Kwitansi via WhatsApp
Fitur ringan untuk mengirim bukti transaksi digital kepada member.
- **Konsep:** Saat member selesai membayar paket, admin bisa menekan tombol "Kirim Struk".
- **Eksekusi:** Sistem tidak akan mengirim otomatis, melainkan *me-generate* teks struk rapi dan membuka link `wa.me/nomor-member?text=struk...`. Admin tinggal menekan tombol Kirim di aplikasi WA mereka.

---

## 🚀 BACKLOG VERSI 2 (Ditunda untuk Pengembangan Masa Depan)
Fitur-fitur *advanced* yang ditunda ke pembaruan sistem tahap selanjutnya (V2):

1. **Automated WhatsApp Reminder via Fonnte API**
   - **Alasan ditunda:** Belum ada API Key dan proses integrasi pihak ketiga butuh waktu khusus.
   - **Status Saat Ini:** Admin masih menggunakan tombol "Kirim WA Manual" dari halaman Expiry yang mengandalkan template `wa.me`.
   
2. **Bulk Data Importer (Excel ke Database)**
   - **Alasan ditunda:** Struktur kolom data asli di file Excel owner belum dapat dipastikan, dan kebutuhan pemindahan data massal disepakati untuk dilakukan manual sementara waktu.
   - **Target V2:** Form unggah `.csv` atau `.xlsx` yang akan me- *mapping* otomatis ke tabel member.

3. **Digital Assessment & Progress Tracking**
   - **Target V2:** Menu baru di profil member untuk mencatat perkembangan fisik bulanan (Berat Badan, Lingkar Perut, Body Fat, dan Target).

4. **Integrasi Barcode/QR Check-In Kiosk**
   - **Target V2:** Member tidak perlu mengetikkan nomor atau nama di layar Kiosk. Mereka cukup men- *scan* *barcode* ID card mereka ke kamera iPad/Laptop untuk melakukan absen gym atau memotong jatah sesi PT.
