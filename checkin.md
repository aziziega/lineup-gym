## Fitur: QR Code Member + Scanner Absensi + Audio Feedback

### Overview
Setiap member mendapat QR Code unik yang di-generate dari
kombinasi nomor member + nomor HP + secret key (hashed).
Digunakan untuk absensi check-in via scanner desktop 2D.

---

### 1. Generate QR Code per Member

- Algoritma: hash(no_member + no_hp + SECRET_KEY)
  menggunakan crypto atau uuid-based token
- QR disimpan di tabel members (kolom: qr_token)
- QR dapat ditampilkan di:
  - Halaman detail member di dashboard admin
  - Dikirim otomatis via WhatsApp saat registrasi (V2)
  - Dicetak sebagai kartu fisik opsional (export PNG/PDF)

---

### 2. Halaman Scan / Check-in Page

- Route khusus: /check-in (fullscreen, standalone)
- Bisa dibuka di tab tersendiri di komputer resepsionis
- Menerima input dari scanner USB HID (otomatis
  terbaca seperti keyboard input) — tidak perlu
  kamera, cukup scanner desktop
- Hardware rekomendasi:
  - Kassen KS-606 (hands-free, baca layar HP)
  - Postronix Table Scan (hands-free, baca layar HP)
  - Mode: hands-free continuous scan

---

### 3. Logika Validasi setelah Scan

IF qr_token valid AND membership aktif:
  → Tampilkan: nama, foto, status AKTIF ✅
  → Catat log kehadiran (tabel: attendance_logs)
  → Audio: putar suara SUCCESS

IF qr_token valid AND membership EXPIRED:
  → Tampilkan: nama, foto, status EXPIRED ❌
  → Tampilkan: tanggal expired + tombol "Perpanjang"
  → Audio: putar suara WARNING/DENIED

IF qr_token tidak dikenali:
  → Tampilkan: "QR tidak valid" ⚠️
  → Audio: putar suara ERROR

---

### 4. Audio Feedback System

Implementasi via HTMLAudioElement (Next.js client-side).
Tidak butuh library tambahan.

File audio yang dibutuhkan (simpan di /public/sounds/):
  - success.mp3  → beep pendek + voice "Selamat datang"
  - expired.mp3  → tone berbeda + voice "Membership habis"  
  - error.mp3    → beep error + voice "QR tidak dikenal"

Opsi suara:
  A. Text-to-Speech: window.speechSynthesis (id-ID)
     → Gratis, no asset, tapi suara robotic
  B. Audio file .mp3 custom
     → Lebih profesional, bisa rekam sendiri
  C. Kombinasi: beep .mp3 + TTS nama member
     → "BEEP — Selamat datang, [nama]!"
     → Paling direkomendasikan ✅

Contoh kombinasi (rekomendasi):
  success.mp3 (beep clean) diputar duluan,
  lalu TTS: "Selamat datang, {nama member}"

  expired.mp3 (tone peringatan) diputar,
  lalu TTS: "Maaf, membership {nama} sudah berakhir"

---

### 5. Tampilan Check-in Result (UI)

Setelah scan, layar menampilkan card besar selama 3 detik:

  ┌─────────────────────────────┐
  │  [FOTO MEMBER]              │
  │  Nama  : Budi Santoso       │
  │  No    : LG-0042            │
  │  Status: ✅ AKTIF           │
  │  Sisa  : 14 hari            │
  └─────────────────────────────┘

Warna background card:
  - Hijau = aktif
  - Merah = expired
  - Kuning = akan expired (≤ 7 hari)

Setelah 3 detik → otomatis reset ke halaman scan.

---

### 6. Log Kehadiran

Tabel: attendance_logs
Kolom:
  - id
  - member_id (FK ke members)
  - gym_id
  - scanned_at (timestamp)
  - status_at_scan (active/expired/unknown)
  - scanned_by (admin/scanner-device)

Terintegrasi ke dashboard:
  - Counter "Kunjungan Hari Ini" di overview
  - Riwayat kehadiran per member
  - Grafik peak hour (V2 BI Dashboard)

---

### 7. Keamanan QR

- QR token di-hash — tidak bisa di-reverse engineer
- Opsional V2: tambah expiring token (QR berubah
  tiap 24 jam) untuk cegah sharing QR antar teman
- Tampilkan foto member saat validasi → admin bisa
  cross-check visual

---

### Tech Stack

- QR Generate : qrcode npm package (Next.js)
- QR Display  : <Image> dari base64 atau URL
- Scanner     : USB HID input → onKeyDown / input ref
- Audio       : HTMLAudioElement + SpeechSynthesis API
- DB Log      : Supabase (tabel attendance_logs)
- Realtime    : Supabase Realtime untuk counter dashboard

---

### Estimasi Development

- Generate QR per member       : 0.5 MD
- Halaman /check-in + validasi : 1.5 MD
- Audio feedback system        : 0.5 MD
- Log kehadiran + dashboard    : 1 MD
- Testing + edge cases         : 0.5 MD
                          Total: 4 MD (32 manhour)

---

### Hardware yang dibutuhkan owner (beli sendiri)

- 2D QR Scanner Desktop hands-free
  Rekomendasi: Kassen KS-606 / Postronix Table Scan
  Harga: Rp 300.000 – 800.000 (Tokopedia/Shopee)
- Speaker kecil di meja resepsionis (opsional)
  Harga: Rp 50.000 – 200.000
- Total hardware: ± Rp 350.000 – 1.000.000