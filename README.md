# 🏋️ Lineup Gym - Gym Management & Member Attendance System

**Lineup Gym** adalah platform manajemen operasional gym modern berbasis web yang dirancang khusus untuk mempermudah operasional harian fitness center, memantau kehadiran member secara real-time, mengelola keuangan, dan meningkatkan profesionalisme layanan gym. 

Aplikasi ini menggabungkan dashboard admin yang kaya akan data (analytics-driven) dengan antarmuka kiosk/landing page publik yang premium, dinamis, dan responsif.

---

## 🌟 Fitur Utama

### 1. 📋 Manajemen Member & Personal Training (PT)
* **Pemisahan Paket Mandiri:** Pemisahan paket Gym reguler dan paket latihan Personal Training (PT) dalam satu profil member.
* **Sesi PT Dinamis:** Pelacakan sisa sesi PT yang berkurang secara dinamis dan terpisah dari masa aktif Gym.
* **Manajemen Jadwal PT:** Penandaan sesi latihan yang sudah diselesaikan secara mudah oleh staf atau pelatih.
* **Filter Data Presisi:** Pencarian dan filter member berdasarkan kategori (Reguler, PT, atau Pengunjung Harian).

### 2. ⚡ Sistem Check-In & Absensi QR Code (Hands-Free)
* **QR Code Unik:** Setiap member mendapatkan QR Code digital yang di-generate secara aman dari kombinasi data terenkripsi.
* **Halaman Check-In Dedicated:** Halaman `/check-in` khusus fullscreen yang dirancang untuk dibaca oleh Scanner Desktop 2D (seperti *Kassen KS-606* atau *Postronix*) secara instan.
* **Visual Status Card:** Setelah di-scan, layar menampilkan kartu identitas member dengan indikator warna otomatis selama 3 detik:
  * 🟩 **Hijau:** Member aktif.
  * 🟨 **Kuning:** Kritis (masa aktif ≤ 7 hari).
  * 🟥 **Merah:** Kedaluwarsa (expired).
* **Audio & TTS Feedback:** Menggunakan kombinasi nada beep suara profesional dan *Text-to-Speech* (TTS) yang otomatis menyapa nama member secara personal (*"BEEP — Selamat datang, Budi Santoso!"*).

### 3. 🎫 Pendaftaran Pengunjung Harian (Day Pass / Visitor)
* **Kiosk Mandiri:** Pengunjung harian dapat mendaftar secara mandiri melalui antarmuka kiosk yang bersih.
* **Sistem Approval Admin:** Notifikasi real-time masuk ke dashboard admin untuk menyetujui kunjungan dengan nominal harga dinamis.
* **Upgrade ke Member:** Kemudahan mengubah status pengunjung harian menjadi member reguler tanpa perlu menginput ulang data dari awal.

### 4. 📈 Laporan Keuangan & Pengeluaran (Expense Management)
* **Pencatatan Keuangan:** Pencatatan otomatis untuk setiap transaksi masuk (pembayaran membership/PT/day pass) dan pencatatan manual untuk pengeluaran operasional (utilitas, gaji staf, pemeliharaan alat).
* **Visualisasi Grafik Keuangan:** Grafik pendapatan (*revenue chart*) interaktif yang membandingkan arus kas masuk dan pengeluaran secara bulanan.
* **Ekspor Data:** Kemudahan mengunduh rekapitulasi data transaksi dalam format file spreadsheet Excel (`.xlsx`).

### 5. 💬 Integrasi WhatsApp (Struk & Reminder)
* **Kwitansi Digital Instan:** Setelah transaksi berhasil, admin dapat langsung mengirimkan struk kwitansi digital terformat rapi ke nomor WhatsApp member dengan satu klik.
* **Pengingat Masa Aktif (Expiry Reminder):** Dashboard khusus yang mengelompokkan member berdasarkan tingkat urgensi masa aktif (Expired Hari Ini, Kritis ≤ 3 hari, Segera Expired ≤ 7 hari) dilengkapi dengan tombol kirim template reminder otomatis.

### 6. 🌐 Landing Page & Galeri Gym Dinamis
* **Company Profile Modern:** Landing page depan untuk publik yang menampilkan jam operasional, peta lokasi, daftar harga paket aktif, dan keunggulan gym.
* **Galeri Foto Terintegrasi:** Galeri suasana gym di landing page publik yang dapat diperbarui secara dinamis oleh admin melalui menu pengaturan di dashboard.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur modern untuk memastikan performa yang cepat, animasi yang mulus, dan antarmuka yang sangat premium:

* **Framework Utama:** [Next.js 14](https://nextjs.org/) (App Router) & [React 18](https://react.dev/)
* **Bahasa Pemrograman:** [TypeScript](https://www.typescriptlang.org/)
* **Styling & Desain:** [Tailwind CSS](https://tailwindcss.com/) dengan kombinasi [Framer Motion](https://www.framer.com/motion/) untuk animasi transisi premium dan interaktif.
* **Komponen UI:** [Shadcn UI](https://ui.shadcn.com/) & [Base UI](https://base-ui.com/) untuk standarisasi elemen antarmuka yang modern dan aksesibel.
* **Form & Validasi:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/) untuk penanganan form yang aman.
* **Visualisasi Data:** [Recharts](https://recharts.org/) untuk visualisasi bagan analitik keuangan yang interaktif.
* **Manajemen State & Cache:** [TanStack React Query](https://tanstack.com/query/latest) untuk sinkronisasi data yang cepat dan efisien.

---

## 📦 Struktur Project secara Umum

```text
├── app/                  # Struktur halaman Next.js App Router (Dashboard, Check-in, Landing, Auth)
├── components/           # Komponen UI reusable (layout, landing-page, charts, modal, dll)
├── hooks/                # Custom React hooks untuk logika fungsionalitas
├── lib/                  # Fungsi utilitas (format tanggal, ekspor excel, enkripsi token, dll)
├── public/               # Asset statis seperti gambar, logo, dan file sound feedback
├── supabase/             # Skema dan konfigurasi sinkronisasi backend/database
└── package.json          # File konfigurasi dependensi project
```

---

## 🚀 Memulai (Getting Started)

Ikuti langkah-langkah berikut untuk menjalankan project ini di lingkungan lokal Anda:

### 1. Clone Repository & Install Dependensi
```bash
# Install seluruh paket dependensi yang dibutuhkan
npm install
```

### 2. Konfigurasi Environment Variables
Buat sebuah file `.env` (atau salin dari `.env.example`) di direktori utama project dan lengkapi konfigurasi backend serta API yang dibutuhkan:
```env
# Contoh konfigurasi koneksi API dan Backend secara general
NEXT_PUBLIC_API_URL=https://api.yourbackend.com
NEXT_PUBLIC_ANON_KEY=your_public_anonymous_key
```

### 3. Jalankan Development Server
```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
```
Setelah server berjalan, buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya.

### 4. Build untuk Production
Untuk membuat kompilasi build yang optimal sebelum proses deployment:
```bash
npm run build
npm run start
```

---

## 🔒 Keamanan & Praktik Terbaik

* **Row Level Security (RLS):** Seluruh data sensitif terlindungi di sisi backend dan hanya dapat diakses oleh user yang memiliki otorisasi (Authenticated Admin/Staff).
* **High-Precision Client Calculations:** Perhitungan sisa masa aktif membership dilakukan dengan mempertimbangkan zona waktu lokal browser untuk menghindari selisih hari.
* **Enkripsi QR Token:** Kode QR member dibuat menggunakan fungsi hash searah untuk menghindari manipulasi fisik kartu member oleh pihak luar.
