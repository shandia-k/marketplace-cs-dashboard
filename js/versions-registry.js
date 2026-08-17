/**
 * js/versions-registry.js
 * Modular Version History & Release Changelog Registry
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📖 PANDUAN MENAMBAHKAN VERSI BARU SEBELUM RILIS (RELEASE WORKFLOW):
 * ═══════════════════════════════════════════════════════════════════════════════
 * 1. Tambahkan object versi baru di indeks paling atas [0] pada VERSIONS_REGISTRY.
 * 2. Lengkapi atribut wajib:
 *    - version     : '1.0.x' (harus sama persis dengan baris 3 di package.json)
 *    - badge       : 'Versi Terbaru 🚀' (atau Enterprise 🏢, Security 🛡️, dll)
 *    - badgeColor  : '#df1683' (atau kode warna hex tema versi)
 *    - releaseDate : 'Bulan Tahun' (misal: 'Agustus 2026')
 *    - title       : 'Judul Utama Pembaruan'
 *    - tagline     : 'Ringkasan visi rilis dan nilai tambah bagi pengguna CS'
 *    - highlights  : Array minimal 4 kartu highlight ({ icon, iconBg, title, desc })
 *    - categories  : Array grup changelog ({ category, tag, color, bgColor, items: [...] })
 * 3. Buka package.json dan ubah "version": "1.0.x" pada baris 3.
 * 4. Sistem Release Guard otomatis memvalidasi kelengkapan changelog saat `npm start` atau `npm run build`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js Environment (main.js & scripts/validate-version.js)
    module.exports = factory();
  } else {
    // Browser / Renderer Environment (index.html)
    root.VERSIONS_REGISTRY = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSIONS_REGISTRY = [
    {
      version: '1.0.7',
      badge: 'Versi Terbaru 🚀',
      badgeColor: '#df1683',
      releaseDate: 'Agustus 2026',
      title: 'Gemini Sidebar, Smart Customer Detection, Dynamic CS Profiles & Zero-Duplicate Engine',
      tagline: 'Desain sidebar ultra-mulus zero-jitter gaya Google Gemini, deteksi cerdas nama pembeli ({customer}), variabel personal CS ({cs}), registrasi berbasis nama lengkap, dan eliminasi duplikasi teks chat.',
      highlights: [
        {
          icon: '✨',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Sidebar Zero-Jitter Gaya Gemini',
          desc: 'Posisi icon navigasi toko tetap statis sempurna saat collapse/expand dengan animasi teks transparan yang halus dan pulse statusbar anti-stutter.'
        },
        {
          icon: '👤',
          iconBg: 'rgba(56, 189, 248, 0.15)',
          title: 'Deteksi Otomatis Nama Customer',
          desc: 'Smart Customer Name Detector di Shopee, Tokopedia, WhatsApp Web, TikTok Shop & Lazada via variabel {customer} dengan fallback otomatis "Kak".'
        },
        {
          icon: '🏷️',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Variabel CS & Login Nama Lengkap',
          desc: 'Variabel {cs} otomatis menampilkan nama CS aktif. Form login & pendaftaran user disederhanakan murni fokus pada Nama Lengkap CS dengan auto-slug.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Zero-Duplicate Insertion Engine',
          desc: 'Mesin pengetikan native Chromium tunggal yang menuntaskan duplikasi teks 3x di editor chatbox React, Slate.js, dan Draft.js.'
        },
        {
          icon: '🛠️',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Arsitektur CS Toolkit FAB Idempotent',
          desc: 'Single-handler architecture pada tombol terapung Tools CS & isolasi modal untuk akses alat cepat yang responsif tanpa benturan event.'
        }
      ],
      categories: [
        {
          category: 'Desain Antarmuka & Sidebar Zero-Jitter Gaya Google Gemini',
          tag: 'UI & Animation',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Implementasi layout sidebar ultra-presisi gaya Google Gemini: Posisi icon toko dan navigasi tetap statis (zero-jitter) saat sidebar di-expand atau di-collapse.',
            'Efek transisi teks nama toko dan badge unread yang bergeser ke kanan dengan opasitas bertingkat dan timing bezier modern.',
            'Penyelarasan visual tombol Collapse ◀ dan Extend ▶ agar memiliki ukuran, hover glow, dan sentuhan visual yang identik dengan icon lainnya.',
            'Optimasi animasi pulse statusbar dan avatar pengguna agar tetap berjalan mulus 60 FPS tanpa stutter saat statusbar diperluas.',
            'Konsolidasi menu Pengaturan ke dalam Widget Profil Pengguna, menyisakan tombol Tambah Toko yang bersih dan serasi di area sidebar.'
          ]
        },
        {
          category: 'Deteksi Cerdas Pelanggan & Template Chat Dinamis',
          tag: 'Smart Variables',
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.12)',
          items: [
            'Smart Customer Name Detector: Otomatis membaca nama pembeli / customer yang sedang aktif di ruang chat Shopee, Tokopedia, WhatsApp Web, TikTok Shop, dan Lazada.',
            'Dukungan variabel template {customer}, {pembeli}, dan {buyer} dengan fallback cerdas "Kak" jika berada di luar ruang percakapan.',
            'Pratinjau cerdas highlight biru langit (sky-blue) untuk variabel {customer} pada floating autocomplete (Ctrl+Space) sebelum dikirim.',
            'Tombol pill cepat {customer} pada modal editor template smart reply.'
          ]
        },
        {
          category: 'Profil Pengguna & Variabel Personal CS',
          tag: 'User & Profile',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Variabel {cs} dan {nama_cs} yang otomatis menginterpolasi nama panggilan/nama lengkap CS yang sedang aktif ke dalam template pesan.',
            'Penyederhanaan form pendaftaran CS & Super Admin: Menghapus kolom username teknis yang redundan, digantikan murni oleh Nama Lengkap / Panggilan CS dengan auto-slug generator di background.',
            'Tampilan kartu profil user login ultra-clean tanpa label @username teknis.'
          ]
        },
        {
          category: 'Penyempurnaan Mesin Pengetikan Webview',
          tag: 'Webview Engine',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 129, 0.12)',
          items: [
            'Zero-Duplicate Text Insertion: Mengadopsi pure single native execCommand(insertText) Chromium pada webview-preload, menuntaskan isu teks tersalin 3x pada editor React/Slate/Draft.js.',
            'Debounce & Lock Guard isInsertingTemplate untuk mencegah duplikasi eksekusi saat double-click atau penekanan tombol Enter cepat.',
            'Resolusi variabel instan saat pengiriman teks dari Host Drawer ke ruang chat webview aktif.'
          ]
        },
        {
          category: 'Perbaikan Antarmuka, FAB Tools CS & Stabilitas Sistem',
          tag: 'Bug Fix & Stability',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Idempotent Single-Handler pada tombol terapung Tools CS (#btn-cs-toolkit-fab), menjamin menu popover selalu responsif dibuka-tutup pada pergantian user mana pun.',
            'Pembersihan konflik selektor CSS .modal-overlay pointer-events: none yang sempat mengunci tombol floating.',
            'Pemberian guard flags isToolsEventsBound dan isQuickReplyEventsBound untuk mencegah kebocoran/duplikasi event listener di memory.',
            'Penyesuaian rute interaktif Onboarding Guide dan pencegahan deadlock state saat tombol pengaturan berpindah ke profil.',
            'Peningkatan Smart Title Parser pada background ping untuk mendeteksi unread email/chat pada web SPA berat (Gmail, Outlook, WhatsApp Web).',
            'Pembaruan manifest versi dan release guard terintegrasi v1.0.7.'
          ]
        }
      ]
    },
    {
      version: '1.0.6',
      badge: 'Security & Enterprise 🛡️',
      badgeColor: '#3b82f6',
      releaseDate: 'Agustus 2026',
      title: 'Security Hardening, Super Admin, WhatsApp Linker & Network SOP',
      tagline: 'Peningkatan keamanan kriptografis, otorisasi Super Admin terpusat, ketahanan jaringan live ping, dan ekspansi pusat alat CS.',
      highlights: [
        {
          icon: '🔐',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          title: 'Keamanan Kriptografi & Super Admin',
          desc: 'Enkripsi PIN dengan Salted PBKDF2/scrypt acak per user, Super Admin role & panel audit sesi global, serta Auto-Lock Screen inactivity.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'WhatsApp Linker & Case Converter',
          desc: 'Generator wa.me otomatis dari format HP Indonesia & smart clipboard, transformer teks chat instan, dan catatan warning COD.'
        },
        {
          icon: '🌐',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Real-time Net Ping & SOP Tethering',
          desc: 'Pemantauan online/offline setiap 20s dengan live latency check di avatar CS, offline alert banner, dan SOP 6 langkah tethering HP.'
        },
        {
          icon: '🛠️',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Webview React/Slate Engine & URL Bar',
          desc: 'Integrasi setNativeValue & InputEvents untuk stabilitas Quick Reply di Shopee/Tokopedia/WA, plus Mini Address Bar per tab.'
        }
      ],
      categories: [
        {
          category: 'Keamanan & Autentikasi Kriptografis',
          tag: 'Security',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          items: [
            'Enkripsi PIN berbasis Salted PBKDF2/scrypt acak per akun untuk proteksi kredensial tingkat tinggi.',
            'Sistem otorisasi berjenjang: Role Super Admin (👑) & Customer Service (👩‍💼) dengan kontrol hak akses.',
            'Fitur Kunci Layar Otomatis (Auto-Lock Inactivity) & proteksi Anti-Bruteforce PIN dengan rate-limiting.',
            'Webview Navigation Guard ketat: Blokir skema berbahaya (file:, javascript:, data:, vbscript:) dan filter popup window.'
          ]
        },
        {
          category: 'Pusat Alat Bantu & Produktivitas CS (Toolkit Baru)',
          tag: 'New Features',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'WhatsApp Direct Linker: Generator tautan cepat wa.me dengan normalisasi otomatis nomor HP Indonesia (08.., +62..) dan deteksi nomor instan dari Smart Clipboard.',
            'Smart Case Converter: Transformer teks chat instan (UPPERCASE, lowercase, Title Case, Sentence case, Bersihkan Spasi Ganda) dengan live character counter.',
            'Catatan Khusus Pelanggan / COD Warning: Sticky notes internal per pembeli untuk mencatat warning COD dan riwayat komplain.',
            'Mini Address Bar per Tab Toko: Input URL langsung di atas webview untuk navigasi cepat resi ekspedisi (cekresi) atau maps tanpa keluar dashboard.',
            'Smart Custom Store Search: Autocomplete pencarian URL toko cerdas terintegrasi Google Suggestions, Wikipedia API, dan 25+ preset platform resmi Indonesia.'
          ]
        },
        {
          category: 'Konektivitas & SOP Backup Jaringan',
          tag: 'Network & SOP',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Real-time Network Ping Monitor (20s) dengan live latency check (Cloudflare 1.1.1.1 & Google) dan indikator titik hijau/merah di avatar sidebar.',
            'Offline Warning Alert Banner interaktif saat koneksi terputus dengan tombol uji ulang koneksi instan.',
            'Modal Infografik SOP 6 Langkah Penambatan HP (USB/Wi-Fi Tethering) darurat lengkap dengan alat Live Network Tester.'
          ]
        },
        {
          category: 'Penyempurnaan Webview & Quick Reply',
          tag: 'Webview & Chat',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Integrasi setNativeValue & synthetic InputEvents pada webview-preload untuk menjamin Quick Reply terisi sempurna di React, Slate, dan Draft.js (Shopee, Tokopedia, WA Web, Lazada, TikTok Shop).',
            'Penyelarasan variabel smart clipboard global {clipboard}, {toko}, dan {waktu} secara serentak di inline dan modal.'
          ]
        },
        {
          category: 'Performa, Multi-Format Scratchpad & Pembaruan Sistem',
          tag: 'Performance & System',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Asynchronous non-blocking cache calculation (getDirSizeAsync) untuk mencegah freeze antarmuka.',
            'Deep Clean Session Partition: Pembersihan tuntas berkas direktori partisi toko di level disk.',
            'Scratchpad Multi-Format Office: Dukungan baca dan simpan berkas Excel (.xlsx) tabel multi-kolom dan Word (.docx).',
            'Auto-Updater berbasis electron-updater terintegrasi GitHub Releases dengan dialog pembaruan otomatis.',
            'Sanitasi data telemetri dan laporan bug sebelum dikirim ke Google Apps Script Proxy.'
          ]
        }
      ]
    },
    {
      version: '1.0.5',
      badge: 'Enterprise Edition 🏢',
      badgeColor: '#3b82f6',
      releaseDate: 'Agustus 2026',
      title: 'Smart Quick Reply, Interactive Onboarding & Telemetry Tracker',
      tagline: 'Rilis produksi masif dengan fokus akselerasi penanganan chat pelanggan, panduan interaktif, dan optimasi V8 heap.',
      highlights: [
        {
          icon: '💬',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Smart Quick Reply Engine',
          desc: 'Drawer template balasan cepat & floating Ctrl+Space dengan auto-replace variabel {clipboard}, {toko}, {waktu}.'
        },
        {
          icon: '🎯',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Interactive Guided Tour',
          desc: 'Tur spotlight 5 langkah interaktif dan checklist tugas setup untuk onboarding CS baru secara mandiri.'
        },
        {
          icon: '🍃',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Staggered Background Ping',
          desc: 'Polling 45s notifikasi pesan toko yang tidur tanpa membebani konsumsi memori RAM komputer.'
        },
        {
          icon: '📊',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Telemetri & Diagnostik Sesi',
          desc: 'Pelacakan event produktivitas dan logging diagnostik real-time tim CS untuk evaluasi performa kerja.'
        }
      ],
      categories: [
        {
          category: 'Smart Quick Reply & Chat Acceleration',
          tag: 'Quick Reply',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Drawer template balasan cepat dengan kategorisasi rapi (Salam, Produk, Pengiriman, Komplain).',
            'Floating Quick Reply (Ctrl+Space) untuk insert instan ke kolom input chat webview.',
            'Penyelarasan variabel dinamis {clipboard}, {toko}, dan {waktu} (Pagi/Siang/Sore/Malam).'
          ]
        },
        {
          category: 'Interactive Onboarding & Guided Tour',
          tag: 'Onboarding',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Modal selamat datang dengan rangkuman arsitektur sistem dan catatan rilis.',
            'Guided Tour Spotlight 5 langkah memandu elemen navigasi dashboard CS.',
            'Interactive Checklist Setup Tasks dengan deteksi otomatis status konfigurasi toko.'
          ]
        },
        {
          category: 'Optimasi Memori & Background Sync',
          tag: 'Memory Saver',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Staggered Background Ping 45 detik untuk toko tidur guna memantau badge pesan baru.',
            'Optimalisasi V8 Heap (1024 MB) untuk kelancaran sinkronisasi chat marketplace.',
            'Proteksi draft pesan saat tab toko tertidur otomatis.'
          ]
        },
        {
          category: 'Aksesibilitas & Dual Theme',
          tag: 'UI & Theme',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Integrasi tema Dark & Light mode adaptif dengan transisi visual ultra-halus.',
            'Peningkatan navigasi keyboard dan shortcut aksesibilitas (A11y).'
          ]
        }
      ]
    },
    {
      version: '1.0.4',
      badge: 'Security & Multi-User 🛡️',
      badgeColor: '#10b981',
      releaseDate: 'Agustus 2026',
      title: 'Multi-User CS Profile, PIN Security & Automatic Updater Engine',
      tagline: 'Manajemen multi-profil pengguna CS dalam 1 PC, proteksi PIN 6-digit, dan integrasi pembaruan otomatis.',
      highlights: [
        {
          icon: '👥',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Multi-User Profile System',
          desc: 'Manajemen login banyak akun CS dalam 1 PC dengan proteksi PIN 6-digit & security recovery questions.'
        },
        {
          icon: '🔄',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Automatic Update Manager',
          desc: 'Pengecekan pembaruan otomatis saat startup dan opsi cek manual via menu Pengaturan.'
        },
        {
          icon: '💾',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Ekspor & Impor Konfigurasi Toko',
          desc: 'Backup konfigurasi toko per-user (stores.json) untuk kemudahan migrasi atau pemulihan data.'
        },
        {
          icon: '🎨',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'High-Res Desktop Icon Suite',
          desc: 'Dukungan ikon instalasi Windows .ico kualitas tinggi dan branding terpadu.'
        }
      ],
      categories: [
        {
          category: 'Autentikasi Multi-User CS',
          tag: 'Auth & PIN',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Sistem autentikasi PIN 6-digit per akun CS untuk keamanan akses lokal.',
            'Fitur Pertanyaan Keamanan (Security Question) untuk pemulihan lupa PIN.',
            'Penyimpanan terisolasi konfigurasi toko per pengguna aktif.'
          ]
        },
        {
          category: 'Pembaruan Otomatis (Auto-Updater)',
          tag: 'Updater',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Dialog notifikasi update otomatis saat aplikasi dinyalakan.',
            'Tombol Cek Pembaruan manual pada tab Pengaturan.',
            'Integrasi electron-updater untuk download paket rilis baru.'
          ]
        },
        {
          category: 'Cadangan & Pemulihan Data',
          tag: 'Backup',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Fitur Ekspor konfigurasi daftar toko ke berkas JSON.',
            'Fitur Impor daftar toko untuk memulihkan konfigurasi secara cepat.'
          ]
        }
      ]
    },
    {
      version: '1.0.3',
      badge: 'Cloud Proxy & Telemetry ⚡',
      badgeColor: '#f59e0b',
      releaseDate: 'Agustus 2026',
      title: 'Google Apps Script Proxy & Version Synchronization',
      tagline: 'Penyempurnaan infrastruktur pelaporan feedback, logging telemetri, dan stabilitas koneksi cloud.',
      highlights: [
        {
          icon: '☁️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'GAS Proxy Integration',
          desc: 'Sentralisasi pelaporan feedback & error logging melalui proxy Google Apps Script terpusat.'
        },
        {
          icon: '🛡️',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Bypass Batasan CORS',
          desc: 'Mengatasi kendala koneksi lintas origin pada pelaporan feedback dan telemetri sistem.'
        },
        {
          icon: '📐',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Sinkronisasi Tata Letak',
          desc: 'Penataan ulang grid flexbox antarmuka agar adaptif di berbagai resolusi layar PC.'
        },
        {
          icon: '🧹',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Pembersihan Dependensi',
          desc: 'Optimasi modul package.json dan pengurangan ukuran bundle instalasi aplikasi.'
        }
      ],
      categories: [
        {
          category: 'Infrastruktur Cloud & Pelaporan',
          tag: 'Cloud & API',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Integrasi Google Apps Script Web App untuk menerima saran dan laporan bug.',
            'Format payload terstandarisasi untuk ringkasan sistem dan info error.',
            'Bypass kebijakan CORS browser pada komunikasi eksternal.'
          ]
        },
        {
          category: 'Tata Letak & Responsivitas',
          tag: 'Layout',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Perbaikan CSS flex layout pada main panel dan sidebar toko.',
            'Penyesuaian batas scrollable area pada modal dialog.'
          ]
        }
      ]
    },
    {
      version: '1.0.2',
      badge: 'Multi-Tab & Memory 🍃',
      badgeColor: '#10b981',
      releaseDate: 'Agustus 2026',
      title: 'Multi-Tab Per Toko, Custom Titlebar & Smart Auto-Hibernation',
      tagline: 'Peningkatan efisiensi konsumsi memori dengan Smart Auto-Hibernation dan sistem multi-tab per toko.',
      highlights: [
        {
          icon: '🍃',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Smart Auto-Hibernation',
          desc: 'Menidurkan tab toko yang tidak aktif saat RAM > 2GB untuk menjaga PC CS tetap ringan.'
        },
        {
          icon: '📑',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Multi-Tab Per Toko',
          desc: 'Membuka banyak tab (Chat, Pesanan, Produk) per marketplace dengan tombol Back/Forward/Reload.'
        },
        {
          icon: '🖥️',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Custom Titlebar & Status Bar',
          desc: 'Kontrol jendela frameless dan pemantauan penggunaan RAM komputer (MB/GB) real-time.'
        },
        {
          icon: '🛡️',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Whitelist Proteksi Toko',
          desc: 'Toko prioritas berstatus 🛡️ tidak akan ditidurkan otomatis oleh sistem.'
        }
      ],
      categories: [
        {
          category: 'Manajemen Memori & Hibernasi',
          tag: 'Memory Saver',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Sistem penidur webview otomatis berbasis ambang batas RAM 2GB.',
            'Opsi tidur manual (🍃) pada tiap tab toko.',
            'Toko dengan tanda perlindungan (🛡️) dikecualikan dari auto-hibernasi.'
          ]
        },
        {
          category: 'Navigasi Multi-Tab Toko',
          tag: 'Tabs',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Membuka hingga puluhan tab dalam satu toko terpisah.',
            'Tombol navigasi Back (Alt+←), Forward (Alt+→), dan Reload.',
            'Tombol tambah tab baru [+] per toko.'
          ]
        },
        {
          category: 'Status Bar & Arsitektur CSS Modular',
          tag: 'UI & CSS',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Live Status Bar menampilkan konsumsi RAM (MB/GB) dan durasi sesi kerja.',
            'Pemecahan style.css menjadi 6 modul CSS terpisah (layout, sidebar, tabs, modal, components, variables).'
          ]
        }
      ]
    },
    {
      version: '1.0.1',
      badge: 'Modular Architecture 🧩',
      badgeColor: '#8b5cf6',
      releaseDate: 'Agustus 2026',
      title: 'Modular JavaScript Architecture & Custom Typography',
      tagline: 'Refactoring arsitektur kode monolitik menjadi modul JavaScript terstruktur dan tipografi Nexa.',
      highlights: [
        {
          icon: '🧩',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Modular JS Refactoring',
          desc: 'Pemecahan monolith renderer.js (1.285 baris) menjadi 9 modul terpisah yang bersih dan terisolasi.'
        },
        {
          icon: '🔤',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Nexa Typography Suite',
          desc: 'Integrasi paket font modern Nexa Light, Regular, dan Bold untuk kenyamanan membaca tim CS.'
        },
        {
          icon: '🖼️',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Branding & Aset Visual',
          desc: 'Penambahan aset logo icon.png dan perapihan elemen antarmuka dashboard.'
        },
        {
          icon: '📝',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Floating Scratchpad Awal',
          desc: 'Modul catatan mengambang dasar untuk menyimpan teks catatan CS sementara.'
        }
      ],
      categories: [
        {
          category: 'Refactoring Kode & Modularisasi',
          tag: 'Refactor',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Pemisahan berkas menjadi app.js, config.js, modal.js, scratchpad.js, sidebar.js, state.js, tabs.js, utils.js, webview.js.',
            'Peningkatan struktur state management terpusat.'
          ]
        },
        {
          category: 'Tipografi & Desain Visual',
          tag: 'Design',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Integrasi font Nexa (Light, Regular, Bold).',
            'Peningkatan kontras teks dan hierarki tipografi dashboard.'
          ]
        }
      ]
    },
    {
      version: '1.0.0',
      badge: 'Initial Release 📦',
      badgeColor: '#6b7280',
      releaseDate: 'Agustus 2026',
      title: 'Single Window Multi-Marketplace Dashboard (MVP Release)',
      tagline: 'Rilis perdana pusat komando Customer Service Multi-Marketplace dalam 1 jendela kerja terpadu.',
      highlights: [
        {
          icon: '🛍️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Single Window Workspace',
          desc: 'Buka Shopee, Tokopedia, Lazada, Bukalapak, Blibli dalam 1 jendela kerja terpadu.'
        },
        {
          icon: '🔒',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Isolasi Partisi Sesi',
          desc: 'Setiap toko berjalan di cookies partisi mandiri tanpa tumpang tindih login akun.'
        },
        {
          icon: '🚀',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Batch Launcher Suite',
          desc: 'Skrip pembantu peluncuran aplikasi mudah tanpa perlu membuka CMD manual.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Electron Desktop Engine',
          desc: 'Aplikasi desktop berbasis Electron dengan integrasi webview marketplace terisolasi.'
        }
      ],
      categories: [
        {
          category: 'Fitur Utama Rilis Perdana',
          tag: 'Core MVP',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Dukungan multi-webview marketplace dalam 1 aplikasi.',
            'Isolasi partisi persist cookies mandiri per toko.',
            'Manajemen daftar toko sederhana (Tambah & Hapus Toko).',
            'Peluncur batch Windows untuk kemudahan operasional CS.'
          ]
        }
      ]
    }
  ];

  // ── Helper Registry API ────────────────────────────────────────────────────
  return {
    getAllVersions() {
      return VERSIONS_REGISTRY;
    },

    getLatestVersion() {
      return VERSIONS_REGISTRY[0] || null;
    },

    getVersion(versionStr) {
      if (!versionStr) return null;
      const cleanVer = String(versionStr).replace(/^v/i, '').trim();
      return VERSIONS_REGISTRY.find(v => v.version === cleanVer) || null;
    },

    hasVersion(versionStr) {
      return !!this.getVersion(versionStr);
    },

    /**
     * Validasi ketat apakah versi yang dideklarasikan di package.json
     * memiliki catatan changelog yang valid di VERSIONS_REGISTRY.
     * @param {string} targetVersion Versi dari package.json (misal: '1.0.6')
     * @throws {Error} Jika changelog belum ditambahkan atau data tidak lengkap
     */
    validateVersion(targetVersion) {
      if (!targetVersion) {
        throw new Error('[Release Guard] Parameter targetVersion tidak boleh kosong!');
      }

      const cleanTarget = String(targetVersion).replace(/^v/i, '').trim();
      const latest = this.getLatestVersion();

      if (!latest) {
        throw new Error('[Release Guard] VERSIONS_REGISTRY di js/versions-registry.js kosong!');
      }

      const found = this.getVersion(cleanTarget);

      if (!found) {
        throw new Error(
          `\n╔════════════════════════════════════════════════════════════════════════════════════════╗\n` +
          `║ 🚨 [RELEASE GUARD ERROR] CHANGELOG BELUM DITAMBAHKAN!                                  ║\n` +
          `╠════════════════════════════════════════════════════════════════════════════════════════╣\n` +
          `║ Versi di package.json ("${cleanTarget}") BELUM memiliki catatan changelog!               ║\n` +
          `║                                                                                        ║\n` +
          `║ 👉 Silakan buka: js/versions-registry.js                                               ║\n` +
          `║ 👉 Tambahkan blok changelog versi "${cleanTarget}" pada indeks paling atas [0].          ║\n` +
          `║    Lengkapi: version, badge, releaseDate, title, tagline, highlights (4), & categories.║\n` +
          `╚════════════════════════════════════════════════════════════════════════════════════════╝\n`
        );
      }

      // Validasi urutan (versi di package.json harus berada di paling atas / rilis terbaru)
      if (latest.version !== cleanTarget) {
        throw new Error(
          `\n[Release Guard] Versi package.json ("${cleanTarget}") bukan versi teratas di js/versions-registry.js (teratas: "${latest.version}").\n` +
          `Pastikan versi "${cleanTarget}" ditaruh di posisi paling atas [0] pada VERSIONS_REGISTRY.\n`
        );
      }

      // Validasi kelengkapan data rilis
      const missingFields = [];
      if (!found.title) missingFields.push('title');
      if (!found.releaseDate) missingFields.push('releaseDate');
      if (!found.tagline) missingFields.push('tagline');
      if (!Array.isArray(found.highlights) || found.highlights.length < 4) {
        missingFields.push('highlights (minimal 4 kartu highlight)');
      }
      if (!Array.isArray(found.categories) || found.categories.length === 0) {
        missingFields.push('categories (minimal 1 kategori rincian)');
      }

      if (missingFields.length > 0) {
        throw new Error(
          `\n[Release Guard] Data changelog versi "${cleanTarget}" di js/versions-registry.js belum lengkap!\n` +
          `Atribut yang hilang/kurang: ${missingFields.join(', ')}\n`
        );
      }

      return {
        valid: true,
        version: cleanTarget,
        entry: found
      };
    }
  };
}));
