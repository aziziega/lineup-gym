# 📊 Analisis Valuasi & Penawaran Sistem: LineUp Gym

Dokumen ini disusun sebagai instrumen negosiasi profesional untuk menetapkan nilai ekonomi project dan rencana keberlanjutan pasca-masa trial.

---

## 1. 💰 Opsi Kerja Sama (Pricing Strategy)

*Catatan: Harga di bawah mengacu pada standar industri software custom di Indonesia untuk segmen Fitness & Health.*

### Opsi A: Managed Service (Monthly SaaS)
*Cocok untuk owner yang ingin terima beres tanpa memikirkan biaya server & maintenance.*

| Plan | Biaya | Cakupan Layanan |
| :--- | :--- | :--- |
| **Standard (V1.1)** | **Rp 450.000 / bln** | Dashboard Admin, Keuangan, Database Member, Cloud Hosting & Support. |
| **Professional (V2)** | **Rp 850.000 / bln** | Semua Fitur V1 + WhatsApp CRM + Auto Reminder + Registrasi & Pembayaran Mandiri + Self-Service Visitor Check-in. |

### Opsi B: Full Buyout (Kepemilikan Penuh)
*Cocok untuk investasi jangka panjang (Capex) tanpa biaya langganan software.*

*   **Investment:** **Rp 17.500.000 - Rp 25.000.000** (Tergantung modul V2 yang disertakan).
*   **Cakupan:** Penyerahan Source Code, Setup ke Server Mandiri, & Garansi Perbaikan 3-6 Bulan.
*   **Benefit:** Aset digital menjadi milik penuh LineUp Gym, meningkatkan valuasi bisnis gym jika suatu saat dijual.

---

## 🛠️ 2. Technical Breakdown & Project Effort
Mengapa angka di atas sangat relevan? Berikut adalah rincian usaha (*effort*) yang telah diinvestasikan:

| Tahapan Kerja | Estimasi Jam | Deskripsi |
| :--- | :---: | :--- |
| **Analysis & Requirement** | 16 Jam | observasi flow operasional gym, Wawancara dan pendataan pain points. |
| **System Architecture** | 40 Jam | Schema DB, RLS Security, Flow UX (Theme Red/Neon). |
| **Implementation** | 100 Jam | Core Dashboard, Analytic Engine, Storage Integration, Finance Mapping. |
| **Testing & Deployment** | 15 Jam | Cross-browser testing, Sync Timezone, Setup Production. |
| **TOTAL EFFORT** | **171 Jam** | **Setara dengan ~21 Hari Kerja Efektif (8 jam/hari)** |

---

## 🚀 3. Mengapa Custom CRM (LineUp) > Software Massal?
Di pasar Indonesia banyak software kasir murah, namun sistem ini memberikan nilai lebih:

1.  **Mencegah Kebocoran Pendapatan:** 
    Sistem didesain spesifik untuk gym. Jika sistem mendeteksi 3 member "gratisan" (expired tapi tetap masuk) per bulan @Rp 200rb, owner hemat **Rp 7.200.000 / tahun**.
2.  **Custom Branding:** 
    Landing page dibuat khusus dengan foto fasilitas sendiri, bukan template standar. Ini meningkatkan kepercayaan calon member.
3.  **Efisiensi SDM (Automated Admin):** 
    Memangkas waktu rekap manual 1-2 jam/hari. Dalam setahun, owner menghemat **~400 jam kerja admin** yang bisa dialokasikan untuk marketing.
4.  **Data Privasi:** 
    Data member tidak "nebeng" di server vendor pihak ketiga secara umum, melainkan dikelola secara eksklusif.

---

## 📄 4. Poin-Poin Kontrak (Scope of Work)

### Ruang Lingkup Fitur (Validated V1.1)
1.  **Smart Member Management:** Filter real-time, auto-increment numbering, deteksi status otomatis.
2.  **Financial Dashboard:** Grafik pendapatan 6 bulan terakhir & distribusi paket.
3.  **Digital Asset Mgmt:** Galeri foto suasana gym yang dinamis untuk landing page.
4.  **Security:** Proteksi data member dengan Supabase Row Level Security.

### Tanggung Jawab & Hak Cipta
*   **Data:** 100% milik **LineUp Gym**. Developer wajib menjaga kerahasiaan.
*   **Kode:** Developer memegang hak cipta, kecuali pada Opsi B di mana hak cipta dialihkan sepenuhnya.

### Biaya Pihak Ketiga (Tanggung Jawab Owner)
*   Biaya API WhatsApp (Fonnte) untuk fitur Reminder (V2).
*   Biaya domain/hosting jika melampaui Free Tier pihak ketiga.

---

> [!TIP]
> **Saran Strategis:** Tawarkan **Opsi Berlangganan** sebagai rekomendasi utama. Ini memberikan ketenangan bagi owner (sistem selalu diurus ahli) dan memberikan arus kas rutin (*passive income*) bagi developer.

**Status Dokumen:** Penawaran Final (V1.1) & Roadmap V2
**Terakhir Diperbarui:** 11 Mei 2026 | Jam 13:05 WIB
