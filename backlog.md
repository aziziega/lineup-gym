# Lineup Gym - Development Roadmap & Backlog

Dokumen ini berisi rangkuman kebutuhan dari interview owner, hasil brainstorming, dan rencana pengembangan fitur untuk menyelesaikan pain point yang ada.

## 📋 Pain Points Utama (Hasil Interview)
1. **Data Tercecer**: Data member tersebar di Excel (400+ orang), Buku Manual, dan Google Form.
2. **Loss Revenue**: Banyak member yang expired tapi tetap masuk karena pengecekan manual sering terlewat.
3. **Pencatatan Manual**: Keuangan (pengeluaran) masih di buku, sulit menghitung profit bersih.
4. **Assessment Fisik**: Form kesehatan/target member masih pakai kertas (sulit tracking progres).
5. **Reminder Manual**: Owner harus cek satu-satu siapa yang mau habis dan chat manual.

---

## 🚀 Rencana Fitur & Brainstorming (Fix)

### 1. Personal Training (PT) Separated Package (Prioritas 1)
Mengubah cara sistem menangani PT agar berbeda dari membership gym biasa, tapi tetap dalam satu profil member (Member tidak perlu multiply paket, cukup satu ID member dengan info lengkap).

*   **Database (Skema)**:
    *   Tabel `memberships`: Tambahkan kolom `category` (Pilihan: `gym` atau `pt`).
    *   Tabel `memberships`: Tambahkan kolom `total_sessions` (Opsional, khusus untuk PT).
    *   Tabel `subscriptions`: Tambahkan kolom `remaining_sessions` (Sisa sesi).
*   **Workflow UI (Tambah Member & Pembayaran)**:
    *   Owner tetap menambahkan master paket PT secara manual di menu "Paket", dan memilih kategori "PT" saat membuatnya.
    *   Di form **Tambah Member**, akan ada **2 Dropdown terpisah**:
        1.  `Pilih Paket Gym` (Wajib) -> Hanya menampilkan paket berkategori `gym`.
        2.  `Pilih Paket PT (Opsional)` -> Hanya menampilkan paket berkategori `pt`.
    *   Jika dua-duanya dipilih, sistem akan memproses 2 pembayaran secara berbarengan untuk 1 member tersebut.
*   **Standarisasi UI Dropdown**:
    *   Semua dropdown untuk memilih member atau paket di seluruh aplikasi (terutama di dalam *Dialog / Modal*) akan disamakan menggunakan model **MemberCombobox (Search & Select)** seperti di menu Tambah Pembayaran. Hal ini untuk memastikan dropdown bisa di-klik dan dicari dengan mudah di desktop.

### 2. Automated WhatsApp Reminder via Fonnte (Prioritas 1)
Otomatisasi pengiriman pesan tagihan/pengingat untuk H-3 dan H-0.

*   **Workflow & Simulasi**:
    *   Mengingat **belum ada API Key Fonnte**, kita akan membangun sistem simulasi terlebih dahulu.
    *   Sistem akan memiliki tombol **"Kirim Semua Reminder Hari Ini"**.
    *   Saat diklik, sistem akan mengecek member yang `H-3` dan `H-0`, lalu memunculkan notifikasi sukses (Toast) dan men-console log detail pesan (Seolah-olah API Fonnte berhasil dipanggil).
    *   Jika nanti API Key sudah ada, kita hanya perlu menempelkan key tersebut ke dalam kode yang sudah disiapkan.

### 3. Expense Management & Dashboard Revenue (Prioritas 2)
Melengkapi pencatatan pemasukan yang sudah ada dengan pencatatan pengeluaran, serta memperbaiki grafik revenue.

*   **Kategori Pengeluaran (Default)**: 
    *   Akan dibuatkan kategori default: `operasional` (listrik, air), `maintenance` (servis alat), dan `gaji`.
    *   Kategori ini bisa ditambah secara custom oleh owner.
*   **Laporan Keuangan**: 
    *   Tab "Finance" akan dirombak untuk menampilkan pemasukan (dari member) vs pengeluaran (operasional).
    *   Grafik "Revenue 1 Bulan Terakhir" yang saat ini tidak muncul akan di-*fix* dengan memperbaiki query/view di database.

### 4. Digital Assessment & Progress Tracking (Nanti)
Menggantikan form kertas dengan input digital saat member mendaftar. (Dikerjakan setelah Prioritas 1 & 2 selesai).

### 5. Check-In Optimization (Nanti)
Menggantikan Google Form sepenuhnya dengan sistem internal yang bisa otomatis memotong sisa sesi PT saat member datang. (Dikerjakan setelah Prioritas 1 & 2 selesai).

### 6. Bulk Data Importer (Excel to Database) (Nanti)
Solusi cepat untuk memindahkan 400+ data member lama ke sistem baru. (Dikerjakan setelah Prioritas 1 & 2 selesai).

---

## 🛠️ Urutan Pengerjaan Terkini (Draft Eksekusi)

**Langkah 1 (Database & API)**
- Update tabel `memberships` & `subscriptions`.
- Update View Database agar mendukung grafik revenue dan profil dengan 2 paket.

**Langkah 2 (Frontend - Fitur PT & UI)**
- Rombak form Add Member agar memiliki 2 dropdown terpisah.
- Terapkan standar UI `Combobox` pada semua dropdown di aplikasi.

**Langkah 3 (Reminder & Finance)**
- Buat logic tombol Simulasi Fonnte (H-3 & H-0).
- Buat form tambah pengeluaran (Expenses) dan perbaiki grafik Revenue.
