# 🚀 Developer Hub - Telegram Mini App (TMA)
**Marketplace CS Dashboard • Feedback Hub & Telemetry Analytics**

Telegram Mini App (TMA) visual dan interaktif untuk tim Developer / Admin. Mengelola feedback tiket dari Customer Service (CS), membaca riwayat percakapan thread 2-arah, melihat bukti screenshot dalam resolusi tinggi, membalas laporan CS dengan template cepat, serta memantau analitik telemetri penggunaan aplikasi secara *real-time* langsung di dalam aplikasi Telegram di ponsel atau desktop.

---

## 🌟 Fitur Utama

1. **🏷️ Visual Feedback Ticket Manager:**
   * Filter tiket berdasarkan status (*All, Open, In Progress, Need Info, Resolved, Closed*) dan kolom pencarian (*search*).
   * Badge tipe laporan (*🐛 Bug, 💡 Saran, ❓ Pertanyaan*) dan waktu pembaruan otomatis.
2. **💬 WhatsApp-Style Thread Conversation:**
   * Tampilan gelembung chat antara CS dan Developer.
   * *Quick Reply Templates* (Template balasan cepat 1-klik).
   * Lightbox foto resolusi tinggi dengan kemampuan *zoom*.
   * Dropdown pengubah status tiket langsung ke server cloud.
3. **📊 Telemetry & Product Analytics Dashboard:**
   * KPI Metric: Total Sesi CS, CS Aktif, Total Toko Terhubung, Rata-rata Durasi.
   * Grafik Batang: Frekuensi Penggunaan Fitur CS (Quick Reply, Scratchpad, OCR, dll.).
   * Diagram Donat: Distribusi Toko Marketplace (Shopee, Tokopedia, Lazada, TikTok Shop).
   * Diagram Donat: Adopsi Versi Aplikasi CS.
   * Tabel Log Riwayat Sesi Detail.
4. **🎨 Native Telegram WebApp SDK Integration:**
   * Adaptasi otomatis tema Telegram (*Dark/Light Mode*).
   * Haptic Feedback (getaran sentuh pada ponsel).
   * Tombol *Back* native Telegram.

---

## 🌐 Panduan Deployment 100% GRATIS (Pilih Salah Satu)

Telegram Mini App memerlukan URL dengan protokol **HTTPS (SSL)**. Seluruh opsi di bawah ini **100% Gratis Selamanya**:

---

### 🥇 Opsi 1: GitHub Pages (Sangat Direkomendasikan - Paling Mudah)

Karena repositori proyek ini sudah berada di GitHub (`shandia-k/marketplace-cs-dashboard`), Anda dapat langsung mengaktifkan GitHub Pages tanpa perlu registrasi akun baru:

1. **Buka Repositori di GitHub:** Buka `https://github.com/shandia-k/marketplace-cs-dashboard`.
2. **Masuk ke Menu Settings:**
   * Klik tab **Settings** di pojok kanan atas repositori.
   * Pada menu bilah kiri, klik **Pages** (di bawah bagian *Code and automation*).
3. **Konfigurasi Build and Deployment:**
   * **Source:** Pilih `Deploy from a branch`.
   * **Branch:** Pilih branch utama (`main` atau `master`).
   * **Folder:** Jika Anda ingin root atau subfolder, atau letakkan folder `telegram-mini-app/` ke root branch `gh-pages` / `docs`.
   * *(Atau buat repository baru khusus mini app `cs-dashboard-tma` lalu push isi folder `telegram-mini-app/` ke sana).*
4. **Selesai!** GitHub akan memberikan URL HTTPS gratis, misalnya:
   `https://shandia-k.github.io/marketplace-cs-dashboard/telegram-mini-app/` (atau `https://shandia-k.github.io/cs-dashboard-tma/`).

---

### 🥈 Opsi 2: Cloudflare Pages (Super Cepat & Global Edge)

1. Buka [pages.cloudflare.com](https://pages.cloudflare.com) (gratis).
2. Login / Daftar akun Cloudflare.
3. Klik **Create a project** > **Direct Upload** (atau Hubungkan ke GitHub).
4. Drag & drop folder `telegram-mini-app/`.
5. Klik **Deploy**.
6. Anda langsung mendapatkan URL HTTPS gratis, misalnya:
   `https://cs-dashboard-dev.pages.dev`

---

### 🥉 Opsi 3: Vercel

1. Buka [vercel.com](https://vercel.com) dan login dengan GitHub.
2. Klik **Add New Project** > Import repository GitHub Anda.
3. Set *Root Directory* ke `telegram-mini-app`.
4. Klik **Deploy**.
5. Anda langsung mendapatkan URL HTTPS gratis, misalnya:
   `https://cs-dashboard-tma.vercel.app`

---

## 🤖 Menghubungkan Mini App ke Bot Telegram via @BotFather

Setelah mendapatkan URL HTTPS (contoh: `https://shandia-k.github.io/cs-dev-hub/`), hubungkan ke bot Telegram Anda:

### 1. Menambahkan Tombol Menu Bawah Bot (Menu Button)
1. Buka Telegram dan chat ke [@BotFather](https://t.me/BotFather).
2. Kirim perintah `/setmenubutton`.
3. Pilih bot Telegram Anda.
4. Masukkan URL Mini App HTTPS Anda (misal: `https://shandia-k.github.io/cs-dev-hub/`).
5. Masukkan teks judul tombol: `🚀 Dev Hub`.
6. Sekarang di pojok kiri bawah chat bot Telegram akan muncul tombol `🚀 Dev Hub` yang dapat diklik langsung untuk membuka Mini App!

### 2. Membuat Perintah / Miniapp Shortcut
1. Di [@BotFather](https://t.me/BotFather), kirim perintah `/newapp`.
2. Pilih bot Anda.
3. Masukkan judul: `Marketplace CS Dev Hub`.
4. Masukkan deskripsi singkat: `Dashboard tiket feedback dan telemetri CS`.
5. Upload icon 640x360 px (opsional).
6. Masukkan URL HTTPS Mini App Anda.
7. Masukkan *short name* (misal: `devhub`).
8. BotFather akan memberikan link langsung seperti `https://t.me/YourBotUsername/devhub`.

---

## ⚙️ Menghubungkan ke Backend Google Apps Script

1. Buka Mini App di browser atau Telegram.
2. Buka tab **Server (⚙️)**.
3. Masukkan URL Google Apps Script Web App Anda (berakhiran `/exec`).
4. Klik **💾 Simpan Konfigurasi** lalu klik **🔄 Tes Koneksi**.
5. Mini App akan langsung terhubung ke database Google Sheets secara *real-time*!
