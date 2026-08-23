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
  const VERSIONS_REGISTRY = [
    {
      version: '1.0.16',
      badge: 'Versi Terbaru 🚀',
      badgeColor: '#0284c7',
      pillTag: 'v1.0.16 🚀',
      releaseDate: 'Agustus 2026',
      title: 'Dual-Layer RAM Compression, Deep CPU Throttler & Clean Focus UI',
      tagline: 'Pembaruan v1.0.16: Arsitektur Dual-Layer State Retention dengan kompresi Working Set native Windows (psapi.dll!EmptyWorkingSet) untuk manuver instan puluhan tab tanpa reload pada RAM 2.0–2.5 GB, Deep Background CPU Throttler (1 FPS RAF & Video Freeze) agar laptop tetap dingin dan kipas senyap saat membuka hingga 40 tab, pembersihan total indikator daun/perisai yang mengganggu mata, konsolidasi status bar ringkas per toko, serta penguatan Automated V8 AST Compiler Guard.',
      highlights: [
        {
          icon: '⚡',
          iconBg: 'rgba(2, 132, 199, 0.15)',
          title: 'Dual-Layer State Retention & Instant Switch',
          desc: 'Manuver antar 20-40 tab chat marketplace berlangsung instan (< 30ms) tanpa reload atau blank screen, didukung kompresi memori kernel Windows Win32 EmptyWorkingSet.'
        },
        {
          icon: '❄️',
          iconBg: 'rgba(14, 165, 233, 0.15)',
          title: 'Deep CPU Throttler (40 Tab Silent & Cool)',
          desc: 'Mengurangi beban instruksi render tab latar belakang hingga 99% via pembatasan 1 FPS requestAnimationFrame dan auto-pause video TikTok/Shopee, menjaga laptop tetap dingin tanpa deru kipas.'
        },
        {
          icon: '🎯',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Clean Focus UI (Bebas Distraksi)',
          desc: 'Menghilangkan semua ikon daun hibernasi, perisai, dan teks status tidur yang mengganggu mata, menghadirkan antarmuka tab dan sidebar yang bersih, elegan, dan fokus untuk CS.'
        },
        {
          icon: '📊',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Konsolidasi Status Bar Toko & Tab',
          desc: 'Status bar ringkas dan informatif yang mengonsolidasikan daftar seluruh toko dan rincian tab aktif/terbuka dalam satu tooltip bersih tanpa meteran RAM yang membebani.'
        }
      ],
      categories: [
        {
          category: 'Arsitektur Memori Dual-Layer & Instant Tab-Switching',
          tag: 'Engine & RAM',
          color: '#0284c7',
          bgColor: 'rgba(2, 132, 199, 0.12)',
          items: [
            'Dual-Layer State Retention: Webview tetap dipertahankan utuh dalam DOM tanpa dihancurkan, sementara halaman memori V8 Heap dan DOM tree yang tidak aktif dipindahkan ke Native RAM Compression Store kernel Windows.',
            'Native Windows Working Set Trimmer: Integrasi psapi.dll!EmptyWorkingSet via memory-trimmer.service.js dan trim-memory.ps1 dengan throttling 30 detik untuk kompresi RAM otomatis.',
            'Chromium Process Pooling: Mengaktifkan switch --process-per-site dan --renderer-process-limit=8 untuk mengelompokkan domain yang sama ke renderer pool yang efisien.',
            'Safe V8 Heap Compaction: Alokasi heap aman --max-old-space-size=512 dan --expose-gc untuk pembersihan sampah memori berkala.'
          ]
        },
        {
          category: 'Optimasi Prosesor & Penjinak Kipas Laptop (Deep CPU Throttler)',
          tag: 'Performa & Baterai',
          color: '#0ea5e9',
          bgColor: 'rgba(14, 165, 233, 0.12)',
          items: [
            'Background Animation Throttling (1 FPS): Membatasi loop requestAnimationFrame pada tab latar belakang ke 1 frame per detik, memangkas ratusan interupsi CPU per detik.',
            'Auto-Pause Hardware Video Decoder: Elemen video/audio latar belakang pada TikTok Shop dan Shopee Video otomatis di-pause saat tab tidak dilihat dan di-resume seketika saat dibuka kembali.',
            'Zero-Delay Realtime Notifications: Jalur koneksi WebSocket chat pembeli tetap 100% aktif dan real-time tanpa penundaan sedikit pun.',
            'Throttled Background Pruning: Pembersihan memori hanya aktif saat ambang RAM mendekati 2.2 GB untuk mencegah lonjakan CPU dari proses anak.'
          ]
        },
        {
          category: 'Desain Antarmuka Bersih & Konsolidasi Status Bar',
          tag: 'UI & UX',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Pembersihan Indikator Distraksi: Menghilangkan badge daun hibernasi (🍃), lencana perisai (🛡️), tombol manual hibernasi, dan label teks tidur di sidebar maupun tab bar.',
            'Konsolidasi Status Bar Ringkas: Menghapus analitik meteran RAM yang membebani mata dan memindahkan rincian tab per toko ke dalam flyout tooltip Toko Dibuka.',
            'Highlight Tab Aktif: Tooltip status bar menampilkan indikator jelas [Aktif] pada tab yang sedang dibuka di layar saat ini.',
            'Preservasi Fitur Produktivitas CS: Timer durasi sesi CS (Sesi: HH:MM:SS) dan Smart Clipboard History (Clip: ...) tetap dipertahankan dengan performa optimal.'
          ]
        },
        {
          category: 'Penguatan Pipeline Anti-Regresi (V8 AST Compiler Guard)',
          tag: 'Keamanan & Stabilitas',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Automated V8 AST Compiler Guard: Seluruh berkas JavaScript frontend di folder js/, preload.js, dan webview-preload.js otomatis dikompilasi ke dalam mesin V8 saat pengujian Level 8 Smoke Tests.',
            'Pencegahan Runtime Syntax Error: Memastikan tidak ada kesalahan tanda baca atau kurung ekstra yang dapat lolos ke rilis produksi atau menyebabkan freeze startup.',
            '100% Regression-Free: Seluruh 25 test suite multi-level dan 17 tes katalog regresi tervalidasi lulus sempurna.'
          ]
        }
      ]
    },
    {
      version: '1.0.15',
      badge: 'Pembaruan UI & Layout 📌',
      badgeColor: '#64748b',
      pillTag: 'v1.0.15 📌',
      releaseDate: 'Agustus 2026',
      title: 'Floating Overlay Sidebar, Tab Micro-Animation & Smart Statusbar Suite',
      tagline: 'Pembaruan v1.0.15: Arsitektur sidebar mengambang (Floating Overlay) anti-lag tanpa re-layout webview tamu, sistem pin docking 240px, animasi mikro geser mulus tombol tab (🍃 hibernasi & ✕ tutup) dengan nama judul utuh saat idle, sinkronisasi presisi status 3-fase tab (⚡ Aktif, 🍃 Tidur, 💤 Idle), serta popup analitik RAM dan status tab dengan zero-gap hover bridge (220ms grace period) bebas scrollbar horizontal.',
      highlights: [
        {
          icon: '📌',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Floating Overlay & Pin-Docking Sidebar',
          desc: 'Sidebar default ramping 56px mengembang mulus 240px sebagai floating overlay tanpa memicu resize webview marketplace, dilengkapi tombol Pin untuk mengunci mode docked permanen.'
        },
        {
          icon: '✨',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Tab Title & Action Micro-Animation',
          desc: 'Judul tab tampil utuh maksimal saat idle, dan secara elegan bergeser ke kiri memunculkan tombol aksi hibernasi 🍃 dan tutup ✕ saat kursor mouse di-hover.'
        },
        {
          icon: '📊',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Akurasi Status Tab 3-Fase',
          desc: 'Pemisahan telemetri status tab yang akurat antara ⚡ Aktif (memori menyala), 🍃 Tidur (disuspensi hemat RAM), dan 💤 Idle (tab tersimpan belum dimuat, 0 MB RAM).'
        },
        {
          icon: '🖱️',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Smooth Tooltip Hover Bridge & Zero H-Scroll',
          desc: 'Akses ke popup statusbar sangat nyaman dengan grace delay 220ms dan jembatan tak terlihat, serta eliminasi total scrollbar horizontal dengan flexbox ellipsis.'
        }
      ],
      categories: [
        {
          category: 'Arsitektur Sidebar Anti-Lag & Mode Pin Docking',
          tag: 'Sidebar & Layout',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Floating Overlay on Hover: Sidebar default 56px melayang mulus di atas konten webview saat kursor diarahkan, mencegah lag akibat pemanggilan ViewMsg_Resize berulang pada proses webview marketplace.',
            'Pin-Docking Mode: Tombol Pin di header sidebar memungkinkan CS mengunci sidebar di posisi 240px (docked) yang mendorong webview secara diskret dan stabil.',
            'Hover Protection during Background Re-Render: Deteksi hover canggih dan pencegahan bubble mouseleave memastikan sidebar tidak pernah menutup mendadak saat terjadi auto-hibernasi atau notifikasi chat masuk.',
            'Penataan Ulang Header Sidebar: Posisi kolom pencarian dan tombol Pin ditata ergonomis berdampingan untuk kemudahan navigasi CS.'
          ]
        },
        {
          category: 'Tab Bar Experience & Micro-Interactions',
          tag: 'Tab Bar',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Full Tab Title Display: Judul tab memanfaatkan 100% ruang horizontal saat idle tanpa terpotong oleh tombol tersembunyi.',
            'Slide-in Action Buttons: Tombol hibernasi 🍃 dan tutup ✕ meluncur masuk dari kanan dengan transisi kurva cubic-bezier(0.16, 1, 0.3, 1) saat tab di-hover.',
            'Hover State Contrast: Indikator toko tertidur di sidebar memiliki kontras cerah (opacity 0.92) saat kursor mendekat.'
          ]
        },
        {
          category: 'Status Bar Intelligence & Tooltip Analytics Suite',
          tag: 'Status Bar',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Tipografi Konsisten: Menyeragamkan ukuran font statusbar 11px font-weight 600 pada indikator tidur dan toko.',
            'Klasifikasi Tab 3-Status: Statusbar membedakan secara jujur dan transparan antara tab ⚡ Aktif, 🍃 Tidur, dan 💤 Idle (belum dimuat ke RAM saat aplikasi baru dibuka).',
            'Zero-Gap Hover Bridge (220ms Grace Delay): Pengguna dapat menggerakkan kursor ke bawah menuju popup secara santai tanpa risiko popup tertutup sendiri.',
            'Diferensiasi Analitik RAM: Popup RAM fokus pada status kesehatan memori, batas ambang auto-hibernasi, estimasi RAM terhemat, dan Top 5 tab terberat.',
            'Eliminasi Scrollbar Horizontal: Kunci overflow-x hidden dan dynamic flexbox text ellipsis memastikan popup selalu proporsional dan bebas geser kanan-kiri.'
          ]
        }
      ]
    },
    {
      version: '1.0.14',
      badge: 'Stabil ⚡',
      badgeColor: '#10b981',
      pillTag: 'v1.0.14 ⚡',
      releaseDate: 'Agustus 2026',
      title: 'Smart Bulk Template Importer, WhatsApp Chat Stream & Scratchpad Suite',
      tagline: 'Pembaruan besar v1.0.14: Modal impor massal template pintar (Smart Bulk Importer) dengan auto-categorizer dan integrasi 1-klik dari Scratchpad, pencarian dedicated di dalam catatan (Ctrl+F) dengan backdrop mark oranye ala browser web, sistem percakapan Feedback Hub ramping ala WhatsApp dengan lightbox foto mandiri, dock Tools CS yang dapat di-drag bebas dengan mode auto-collapse transparan saat idle, serta arsitektur Direct Pull Telegram API bebas loop redirect 302.',
      highlights: [
        {
          icon: '📥',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Smart Bulk Template Importer',
          desc: 'Modal impor massal template pintar dengan parser auto-deteksi pemisah (===, ---, tag [Judul]), auto-categorizer (resi, komplain, produk, sapaan), dan fitur 1-klik tarik dari catatan aktif Scratchpad.'
        },
        {
          icon: '🔍',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Dedicated Scratchpad Search (Ctrl+F)',
          desc: 'Pencarian kata kunci khusus di dalam catatan dengan backdrop highlighter oranye ala browser web, live match counter, navigasi Enter/Shift+Enter, dan auto-scroll presisi.'
        },
        {
          icon: '💬',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'WhatsApp-Style Thread Stream',
          desc: 'Gelembung pesan ramping selebar teks dengan jam sejajar, dual-alignment CS (kanan) & Developer (kiri), pemisah tanggal otomatis, dan kartu lampiran gambar besar dengan lightbox.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Draggable Tools CS Dock',
          desc: 'Tombol terapung Tools CS dapat di-drag bebas ke mana saja dengan auto-collapse transparan (opacity 0.38) saat idle agar tidak menutupi tombol marketplace.'
        }
      ],
      categories: [
        {
          category: 'Overhaul Interaksi 2-Arah & WhatsApp Chat Stream',
          tag: 'Feedback Hub',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'WhatsApp-Style Fit Bubbles: Gelembung chat adaptif yang menciut pas selebar teks, menghilangkan ruang kosong berlebih pada balasan singkat.',
            'Dedicated Large Image Cards: Lampiran tangkapan layar tampil di kartu gambar tersendiri berukuran besar (280px × 240px) lengkap dengan timestamp overlay dan lightbox perbesaran layar penuh.',
            'Pemisah Tanggal Otomatis: Garis pemisah tanggal (e.g. 22 Agu 2026) muncul rapi di tengah timeline saat hari percakapan berganti.',
            'Dual Alignment Timeline: Pesan CS merapat rapi ke kanan dengan warna hijau lembut dan centang biru pengiriman; balasan developer merapat ke kiri dengan identitas nama dan badge Developer.'
          ]
        },
        {
          category: 'Draggable CS Productivity Dock & Scratchpad Suite',
          tag: 'Productivity & UX',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Smart Bulk Template Importer: Modal impor massal pintar untuk memigrasi puluhan template catatan CS sekaligus dari berbagai format teks (pemisah ===, tag [Judul], atau paragraf) dengan deteksi kategori otomatis (order, komplain, produk, sapaan).',
            'One-Click Pull dari Catatan: Tombol "Tarik dari Catatan Aktif" di modal dan tombol "Ke Template ⚡" di footer Scratchpad memungkinkan CS mengekspor seluruh template catatan ke Quick Reply dalam 1 klik.',
            'Dedicated Scratchpad Search (Ctrl+F): Fitur pencarian kata kunci khusus di dalam jendela Scratchpad Catatan dengan shortcut Ctrl+F, live match counter, navigasi Enter/Shift+Enter, dan auto-scroll textarea ke posisi kata.',
            'Bebas Digeser (Draggable Dock): Tombol Tools CS dapat di-drag & drop ke posisi mana pun di layar sehingga tidak pernah menghalangi tombol kirim chat marketplace / WhatsApp.',
            'Auto-Collapse & Idle Translucency: Saat idle, tombol menciut menjadi ikon lingkaran ramping dengan transparansi (opacity 0.38) dan langsung membesar kembali saat didekati kursor.',
            'Smart Popover Direction: Menu speed dial otomatis terbuka ke bawah saat dock berada di bagian atas layar, dan merapat ke kanan saat dock berada di sisi kiri layar.',
            'Double-Click Reset: Klik ganda pada tombol Tools CS untuk mengembalikan posisi dock seketika ke sudut kanan bawah default.'
          ]
        },
        {
          category: 'Arsitektur Direct Pull Telegram & Stabilitas GAS',
          tag: 'Telegram API',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Direct Pull Telegram getUpdates: Mengganti webhook eksternal dengan penarikan on-demand langsung dari Google Apps Script, mengeliminasi error HTTP 302 Found.',
            'Zero Webhook Quota Drain: Bot Telegram tidak lagi memicu trigger eksekusi Apps Script berulang-ulang saat idle, menghemat kuota GAS 100%.',
            'Auto-Delivery Confirmation: Saat CS membuka modal atau menyegarkan tiket, sistem otomatis mengirimkan konfirmasi pengiriman balik ke Telegram bot.'
          ]
        },
        {
          category: 'Sistem Pengujian & Anti-Regression Guard',
          tag: 'Quality Assurance',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Dedicated Regression Tests (REG-009 s/d REG-014): Penambahan katalog pengujian permanen untuk event-driven sync, direct pull Telegram, WhatsApp bubble styling, draggable dock persistence, Scratchpad dedicated search engine, dan Smart Bulk Template Importer parser.',
            '25-File Multi-Level Test Suite (Level 1–8): Seluruh rangkaian tes multi-layer terverifikasi 100% pass tanpa regresi.'
          ]
        }
      ]
    },
    {
      version: '1.0.13',
      badge: 'Stabil ⚡',
      badgeColor: '#64748b',
      pillTag: 'v1.0.13',
      releaseDate: 'Agustus 2026',
      title: 'Native Find in Page Engine, OCR Context Menu Suite & Modular Architecture Refactor',
      tagline: 'Pembaruan besar: Arsitektur pencarian kata instan (Ctrl+F) berbasis single-channel IPC Chromium dengan auto-scroll & navigasi keyboard, menu konteks klik kanan komprehensif (OCR Ekstraksi Teks Gambar Offline, Salin Gambar, Save As), refactoring arsitektur backend modular 8-tier, serta fondasi Anti-Regression Guard Zero-Defect.',
      highlights: [
        {
          icon: '🔍',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Real-time Find in Page (Ctrl+F)',
          desc: 'Pencarian kata instan di semua webview dengan highlight oranye/kuning real-time, live match badge counter, dan auto-scroll ke posisi kata saat navigasi.'
        },
        {
          icon: '📋',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Right-Click Context Menu & OCR',
          desc: 'Menu konteks klik kanan lengkap dengan ekstraksi teks dari gambar (OCR offline Bahasa Indonesia & Inggris), simpan/salin gambar, dan copy link.'
        },
        {
          icon: '🏗️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Modular Service Architecture',
          desc: 'Refactoring arsitektur backend Electron menjadi modul-modul servis terpisah (Auth, Storage, Session, IPC, Context Menu, System, Updater).'
        },
        {
          icon: '🛡️',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: '8-Tier Anti-Regression Guard',
          desc: 'Rangkaian test otomatis 24 file (Unit, Security RBAC HMAC, Storage Atomic Write, Preload Surface, Regression Catalog) menjamin keandalan zero-defect.'
        }
      ],
      categories: [
        {
          category: 'Pencarian Kata Instan (Ctrl+F) & Floating Search Bar',
          tag: 'Find In Page',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Single-Path IPC Search Execution: Mengubah arsitektur pencarian dari dual-execution (DOM+IPC) menjadi single-path IPC native ke WebContents, mengeliminasi race condition request ID yang membuat mark oranye terkunci.',
            'Real-time Active Match Highlighting: Mengaktifkan mode findNext: true pada event ketikan user sehingga Chromium langsung mengaktifkan match pertama, menghitung jumlah kata (misal 1/41), dan menggambar highlight secara instan.',
            'Auto-Scroll & Keyboard Navigation: Tombol Atas/Bawah serta shortcut keyboard (Enter, Shift+Enter, F3, Shift+F3, ArrowUp, ArrowDown) otomatis men-scroll halaman webview ke target teks yang dituju.',
            'Idempotent Result Binding: Menghubungkan IPC found-in-page-result langsung ke controller UI counter, memastikan badge pencarian selalu sinkron di seluruh tab.'
          ]
        },
        {
          category: 'Menu Konteks Klik Kanan & Ekstraksi Gambar (OCR)',
          tag: 'Context Menu & OCR',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'OCR Image-to-Text Offline: Ekstraksi teks dari gambar invoice, resi, atau bukti transfer langsung via menu klik kanan menggunakan engine Tesseract dengan model bahasa Bahasa Indonesia (ind) dan Inggris (eng).',
            'Image Utility Suite: Fitur Buka Gambar di Tab Baru, Salin Gambar, Salin Alamat Gambar, Simpan Gambar Sebagai..., serta Pembuat QR Code Gambar.',
            'Editing Shortcuts & Native Actions: Operasi standar teks (Cut, Copy, Paste, Select All) yang responsif di seluruh halaman marketplace.'
          ]
        },
        {
          category: 'Refactoring Backend Modular & Keamanan',
          tag: 'Architecture & Security',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Modular Service Separation: Pemisahan main.js menjadi arsitektur modular di src/main/ (config, ipc, auth, storage, session, updater, context-menu).',
            'Atomic Storage & Backup Auto-Recovery: Penyimpanan data toko dengan mekanisme atomic write (.tmp -> target) dan auto-backup .bak otomatis untuk mencegah korupsi data akibat crash sistem.',
            'RBAC Integrity & Tamper Guard: Pengamanan role user Super Admin vs CS dengan enkripsi HMAC SHA-256 dan perlindungan terhadap brute force / IDOR.'
          ]
        },
        {
          category: 'Sistem Pengujian & Anti-Regression Guard',
          tag: 'Quality Assurance',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Pre-Start Anti-Regression Guard: Script validasi otomatis (scripts/anti-regression-guard.js) yang memverifikasi integritas versi, changelog, dan keamanan sebelum aplikasi dijalankan atau dibuild.',
            '24-File Test Suite (Level 1–8): Cakupan pengujian menyeluruh mencakup unit logic, security crypto, storage migration, IPC contracts, renderer state, dan regression catalog [REG-001] s/d [REG-008].'
          ]
        }
      ]
    },
    {
      version: '1.0.12',
      badge: 'Stabil ⚡',
      badgeColor: '#64748b',
      pillTag: 'v1.0.12',
      releaseDate: 'Agustus 2026',
      title: 'Tab Address Bar Focus Stability & Universal Link Opener Hotfix',
      tagline: 'Hotfix darurat: Penyelesaian tuntas masalah fokus berkedip (focus bouncing/flickering) pada textbox address bar tab, pencegahan re-render destruktif DOM, serta perbaikan pembukaan tab baru otomatis saat mengklik nomor resi, invoice, dan link pesanan di chat marketplace.',
      highlights: [
        {
          icon: '🔍',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Address Bar Persistent Shell',
          desc: 'Arsitektur shell tetap pada tab bar mencegah pembongkaran DOM textbox dan tombol navigasi saat ada pembaruan chat/status.'
        },
        {
          icon: '🛡️',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Eliminasi Rogue Focus Theft',
          desc: 'Pembersihan pemanggilan paksa webview.focus() menghilangkan loop perebutan fokus, kedipan textbox, dan tombol yang macet.'
        },
        {
          icon: '📦',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Resi & Invoice Link Opener',
          desc: 'Penyelarasan IPC handler dan intersepsi klik link memastikan nomor resi, invoice, dan target="_blank" langsung membuka tab baru.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Protected User Input State',
          desc: 'Proteksi editan aktif mencegah teks URL yang sedang diketik tertimpa oleh URL latar belakang, dilengkapi shortcut tombol Escape.'
        }
      ],
      categories: [
        {
          category: 'Stabilisasi Fokus & Arsitektur Persistent Tab Bar',
          tag: 'Focus & Navigation',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Persistent Shell Architecture: Mengisolasi kontrol navigasi statis (Back, Forward, Refresh, Home) dan textbox URL agar tidak dihancurkan dari DOM setiap kali terjadi event background (update judul, unread badge, sinkronisasi WA).',
            'Eliminasi Rogue Webview Focus: Menghapus pemanggilan paksa entry.webview.focus() pada lifecycle window focus, menyelesaikan loop perebutan fokus bolak-balik yang menyebabkan textbox berkedip-kedip (flickering) dan tombol dashboard tidak responsif.',
            'Safe Active Input Guard: Menjaga teks yang sedang diketik CS di address bar agar tidak ditimpa URL lama saat document.activeElement sedang fokus pada textbox.',
            'Smooth Selection & Escape Handling: Seleksi teks otomatis saat pertama kali fokus tanpa timer berbenturan, serta penambahan tombol Escape untuk membatalkan editan URL seketika.'
          ]
        },
        {
          category: 'Universal Link Opener & Integrasi Pesanan / Resi',
          tag: 'Link Interceptor',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Penyelarasan IPC New Tab API: Menyelaraskan registrasi listener onWebviewOpenNewTab dan onOpenNewTab antara preload.js dan app.js sehingga sinyal setWindowOpenHandler diproses seketika.',
            'Perbaikan Handler Event new-window: Memperbaiki referensi variabel URL pada listener new-window di webview.js sehingga link popup/window.open langsung membuka tab baru di toko terkait.',
            'In-Page Link Click Interceptor: Menambahkan penangkap klik DOM di webview-preload.js untuk link invoice, nomor resi pengiriman, target="_blank", serta kombinasi Ctrl+Click / Middle-Click.'
          ]
        }
      ]
    },
    {
      version: '1.0.11',
      badge: 'Stabil 🚀',
      badgeColor: '#64748b',
      pillTag: 'v1.0.11',
      releaseDate: 'Agustus 2026',
      title: 'Universal OAuth SSO Engine, Smart Password Autofill & reCAPTCHA Compatibility',
      tagline: 'Pembaruan stabilitas: Integrasi otentikasi login Google SSO & Universal OAuth (GitHub, Chatwoot, Biteship, OMS, Microsoft, Apple) dengan partisi native, sistem perekaman & pengisian otomatis akun/password (Smart Autofill Dual-Theme), perbaikan kompatibilitas Google reCAPTCHA di tab web, serta sinkronisasi storage flush berkala.',
      highlights: [
        {
          icon: '🌐',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Universal OAuth SSO & Shared Partition',
          desc: 'Pewarisan partisi sesi native pada dialog OAuth popup (GitHub, Chatwoot, Biteship, Microsoft, Apple ID) dengan eliminasi bug pembatalan 302 redirect.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Smart Form History & Password Autofill',
          desc: 'Perekaman & pengisian otomatis username/email dan password di formulir login dengan floating dropdown interaktif berdesain native CS Dashboard (Dark & Light).'
        },
        {
          icon: '🛡️',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Google reCAPTCHA Frame Consistency Guard',
          desc: 'Penyelarasan inisialisasi User-Agent webview memastikan frame induk dan sub-iframe reCAPTCHA v2/v3/Enterprise 100% konsisten, menyelesaikan error validasi captcha.'
        },
        {
          icon: '💾',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Persistent Storage & SQLite Flush Guard',
          desc: 'Auto-flush data cookies, localStorage, dan tanda centang "Remember Me" secara berkala ke disk fisik setiap 30s dan saat aplikasi ditutup.'
        }
      ],
      categories: [
        {
          category: 'Universal OAuth SSO & Domain-Aware Network Identity',
          tag: 'SSO & Auth',
          color: '#ea4335',
          bgColor: 'rgba(234, 67, 53, 0.12)',
          items: [
            'Sinkronisasi WebContents User-Agent Dinamis: Event listener did-start-navigation menyinkronkan User-Agent pada level WebContents (HTTP Header + DOM navigator.userAgent) secara simultan tanpa menginterupsi in-flight 302 redirect.',
            'Pencegahan Pembatalan Redirect 302: Menghapus listener setUserAgent pada event will-redirect sehingga alur consent OAuth (GitHub, Chatwoot, Biteship, Google) tidak dibatalkan oleh engine Chromium.',
            'Pewarisan Partisi Sesi Nativ pada Popup: Jendela popup otentikasi OAuth (Google, Microsoft, Apple, GitHub, GitLab, OAuth2) otomatis mewarisi session partition toko pembuka secara utuh tanpa terisolasi ke defaultSession.',
            'Deteksi Universal Parameter OAuth: Pencocokan pola menyeluruh untuk client_id=, response_type=code, /oauth/, /authorize, /sso/, login.microsoftonline.com, appleid.apple.com, dan facebook.com.',
            'Isolasi Otentikasi Google: Domain accounts.google.com dilayani dengan profil Firefox 128.0 murni dan penghapusan seluruh Client Hints (Sec-CH-UA) sehingga terbebas dari deteksi Botguard Chromium.'
          ]
        },
        {
          category: 'Smart Form History & Password Autofill Engine',
          tag: 'Password Manager',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Perekaman Otomatis Kredensial Login: Menangkap pasangan username/email dan password saat formulir login disubmit, tersimpan terobfuskasi di partisi lokal toko.',
            'Dual-Field Auto-Fill: Memilih akun dari dropdown otomatis mengisi kolom username/email sekaligus kolom password (••••••••) dan memicu event input/change untuk framework modern (React/Vue).',
            'Floating Dropdown Bertema Dashboard: Tampilan melayang elegan beraksen CS Magenta (#df1683), avatar akun melingkar, indikator status password hijau, dan tombol hapus individual (✕).',
            'Dukungan Penuh Dark & Light Mode: Gaya dropdown otomatis menyesuaikan tema aktif dashboard CS (gelap #131826 atau terang #ffffff).',
            'Auto-Populate Remembered User: Otomatis mengisi data login yang terakhir diingat saat membuka kembali halaman login website.'
          ]
        },
        {
          category: 'Kompatibilitas Google reCAPTCHA & Ketahanan Penyimpanan (Storage Flush)',
          tag: 'Security & Storage',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Konsistensi Fingerprint reCAPTCHA: Mengoreksi inisialisasi tag webview agar hanya menggunakan User-Agent Firefox pada halaman Google Auth, sehingga website eksternal (Speedtest, portal CS) menjalankan frame induk dan iframe reCAPTCHA v2/v3/Enterprise dalam mode Chrome Desktop 100% konsisten.',
            'Persistent Storage Flush Guard: Fungsi flushAllSessions() memanggil sess.flushStorageData() secara berkala setiap 30 detik serta pada event before-quit dan window-all-closed, memastikan cookies login dan centang "Remember Me" tersimpan permanen di disk fisik.'
          ]
        }
      ]
    },
    {
      version: '1.0.10',
      badge: 'Hotfix v1.0.10 🔥',
      badgeColor: '#ef4444',
      pillTag: 'Hotfix 🔥',
      releaseDate: 'Agustus 2026',
      title: 'Anti-Crash Resilience, Shopee Webchat Integration & Editable Store URLs',
      tagline: 'Hotfix besar: Pencegahan layar blank (Zero-Blank Self-Healing Crash Guard & Chromium Anti-Discarding), integrasi klik Webchat Shopee langsung sebagai tab berdampingan, pembaruan URL resmi Shopee (Bebas 404), serta input URL target toko yang fleksibel.',
      highlights: [
        {
          icon: '🛡️',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Zero-Blank Self-Healing Crash Guard',
          desc: 'Deteksi otomatis render-process-gone, killed, oom, dan crashed pada tag webview dengan rekonstruksi instan tanpa kehilangan sesi login toko.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Chromium Anti-Discarding & Throttling Guard',
          desc: 'Switch CLI AutomaticTabDiscarding off, disable-backgrounding-occluded-windows, dan webPreferences backgroundThrottling: false.'
        },
        {
          icon: '💬',
          iconBg: 'rgba(249, 115, 22, 0.15)',
          title: 'Shopee Webchat Tab Berdampingan',
          desc: 'Klik Webchat di Shopee Seller Centre otomatis membuka tab baru tepat di sebelah tab aktif di dalam dashboard tanpa jendela popup OS liar.'
        },
        {
          icon: '🛍️',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          title: 'Pembaruan URL Resmi Shopee (Bebas 404)',
          desc: 'Pembaruan URL default Shopee ke https://seller.shopee.co.id/ dengan auto-migrasi otomatis untuk data toko & riwayat tab lama.'
        },
        {
          icon: '✏️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Input URL Target Toko Fleksibel',
          desc: 'Kolom "URL yang akan dibuka" di modal Tambah/Edit Toko kini dapat diedit bebas untuk mendukung link cabang, subdomain, atau portal khusus.'
        },
        {
          icon: '📑',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Multi-Tab Persistence Auto-Save',
          desc: 'Daftar tab, URL terakhir, judul, dan tingkat zoom tersimpan otomatis per user & per toko, tidak akan hilang saat aplikasi ditutup.'
        },
        {
          icon: '⌨️',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Emergency Hard Recreate (Ctrl+Shift+R)',
          desc: 'Shortcut keyboard dan tombol refresh cerdas untuk merekonstruksi tab aktif secara total tanpa perlu force-restart aplikasi.'
        },
        {
          icon: '🔄',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Window Focus & Visibility Lifecycle',
          desc: 'Verifikasi kesehatan webview dan auto-nudge render surface begitu CS beralih fokus kembali dari Google Chrome.'
        }
      ],
      categories: [
        {
          category: 'Integrasi Webchat & Manajemen Tab Berdampingan',
          tag: 'Webchat & Tabs',
          color: '#f97316',
          bgColor: 'rgba(249, 115, 22, 0.12)',
          items: [
            'Pencegahan Popup Window OS Liar: Pemanggilan e.preventDefault() pada event listener new-window webview mencegah Electron membuka jendela OS mengambang ber-menu bar bawaan.',
            'Penyisipan Tab Berdampingan (Adjacent Placement): Tab baru yang dipicu oleh klik Webchat atau link target=_blank otomatis disisipkan tepat di sebelah kanan tab yang sedang aktif (menggunakan splice) dan langsung difokuskan.',
            'Store ID Webview Association: Penambahan storeId dan tabId pada seluruh entri webviewMap untuk routing akurat saat IPC webview-open-new-tab diterima.'
          ]
        },
        {
          category: 'Pembaruan URL Marketplace & Fleksibilitas Pengaturan Toko',
          tag: 'Stores & Config',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Pembaruan URL Default Shopee: Mengubah link bawaan Shopee menjadi https://seller.shopee.co.id/ menggantikan URL lama /portal/chat yang sudah tidak aktif (404).',
            'Auto-Migration Sesi & Tab Lama: Fungsi readStores dan pemulihan persistentStoreTabs otomatis memigrasikan URL toko/tab lama yang mengarah ke /portal/chat ke URL resmi.',
            'Kolom URL Target Toko Dapat Diedit: Konversi elemen URL preview pada modal Tambah & Edit Toko menjadi input teks interaktif yang terisi otomatis namun bebas diubah pengguna.'
          ]
        },
        {
          category: 'Ketahanan Memori & Anti-Discarding Engine (Chromium & Windows OS)',
          tag: 'Performance & Memory',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Chromium AutomaticTabDiscarding Disabled: Menonaktifkan fitur internal Chromium yang mematikan webview di background saat alokasi RAM dipangkas Windows (Working Set Trimming).',
            'Window Background Anti-Throttling: Mengatur backgroundThrottling: false pada BrowserWindow webPreferences untuk mencegah pembekuan JS loop dan render surface saat tertutup jendela Chrome.',
            'Anti-Occlusion & Background Timer Switch: Penambahan switch disable-backgrounding-occluded-windows dan disable-background-timer-throttling.',
            'Host Window Renderer Crash Guard: Handler render-process-gone otomatis pada jendela utama dashboard untuk mencegah freeze total aplikasi.'
          ]
        },
        {
          category: 'Self-Healing Webview Crash Guard & Auto-Recovery',
          tag: 'Crash Guard & Webview',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Event Listener render-process-gone & crashed: Memonitor seluruh event penghentian renderer anak (killed, oom, crashed, gpu-process-crashed) pada setiap tag webview toko.',
            'Rekonstruksi Webview Instan: Otomatis membersihkan elemen mati dan membangun ulang webview baru dengan partisi login dan URL tujuan yang utuh dalam < 250ms.',
            'Smart Wake-up Deadlock Prevention: Fungsi showTab() memeriksa kesehatan webview (isCrashed) sebelum soft-wake, mencegah tampilan kanvas putih.',
            'Emergency Hard Recreate Utility: Tombol Nav Refresh (Shift/Ctrl+Click) dan shortcut Ctrl+Shift+R / Ctrl+F5 untuk memicu rekonstruksi instan tanpa restart.'
          ]
        },
        {
          category: 'Sistem Tab Persisten & Manajemen Sesi Toko',
          tag: 'Persistent Tabs & Stores',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'State Multi-Tab Tersimpan Permanen: Seluruh tab yang dibuka CS di dalam 1 toko otomatis tersimpan ke storage dan langsung direstore persis saat aplikasi dibuka kembali.',
            'Sinkronisasi URL & Judul Real-time: Perubahan navigasi URL, zoom factor, dan pergantian tab aktif langsung tercatat otomatis dengan proteksi debounce.'
          ]
        }
      ]
    },
    {
      version: '1.0.9',
      badge: 'Stabil ✨',
      badgeColor: '#10b981',
      releaseDate: 'Agustus 2026',
      title: 'Screenshot Bug Feedback, Unified Floating Dock, 81 Telemetry Events & Security Guard',
      tagline: 'Sistem pelaporan bug & saran berlampirkan multi-screenshot dengan kompresi GPU dual-engine dan auto-tagging, tata letak terpadu floating bottom dock dengan mutual awareness, ekspansi telemetri operasional penuh (81 event), penguatan keamanan partisi Chromium (Anti Path-Traversal), dan optimasi performa ketik via search debounce 180ms.',
      highlights: [
        {
          icon: '📸',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Multi-Screenshot Bug Feedback',
          desc: 'Paste Ctrl+V langsung dari clipboard, kompresi otomatis Canvas GPU Dual-Engine (~150-250 KB), auto-insert tag [Gambar 1] ke kursor, dan One-Click Screen Capture.'
        },
        {
          icon: '⚓',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Unified Floating Bottom Dock',
          desc: 'Sistem tata letak melayang terpadu di pojok kanan bawah untuk Tools CS, Draf Feedback, dan Checklist Onboarding dengan kesadaran timbal-balik (mutual awareness).'
        },
        {
          icon: '📊',
          iconBg: 'rgba(139, 92, 246, 0.15)',
          title: 'Ekspansi Telemetri Penuh (81 Event)',
          desc: 'Pelacakan analitik operasional 81 event lengkap tanpa overhead latensi (Quick Reply, Scratchpad, Case Converter, Super Admin, Multi-tab, Autolock, dan Jaringan).'
        },
        {
          icon: '🔐',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          title: 'Anti-Traversal Partition Guard',
          desc: 'Validasi ketat isValidPartition regex whitelisting pada seluruh IPC handler partisi untuk mencegah manipulasi dan penghapusan direktori host.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Anti-Thrashing Search Debounce',
          desc: 'Utilitas debounce 180ms pada pencarian sidebar, quick reply, dan catatan pembeli untuk eliminasi freeze dan kelancaran ketikan 60 FPS.'
        },
        {
          icon: '♿',
          iconBg: 'rgba(56, 189, 248, 0.15)',
          title: 'Aksesibilitas Standar WCAG 2.1',
          desc: 'Label aria-label eksplisit pada tombol navigasi tab bar, address bar, dan daftar tab aktif toko untuk pengalaman pembaca layar tanpa hambatan.'
        }
      ],
      categories: [
        {
          category: 'Pembaruan Fitur Laporan Bug & Saran (Multi-Screenshot & Floating Dock Pill)',
          tag: 'Feedback & Support',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Dukungan Multi-Lampiran Gambar: Mengirim hingga 4 screenshot atau berkas gambar per laporan bug ke Google Apps Script dan bot Telegram via album foto (sendMediaGroup).',
            'Kompresi GPU Dual-Engine Klien: Mengintegrasikan createImageBitmap hardware decode dengan fallback FileReader stream (mereduksi resolusi ke max 1280px dan kompresi JPEG kualitas 80% dari ~5 MB menjadi ~150–250 KB).',
            'Auto-Paste (Ctrl + V) & Auto-Tagging: Menangkap screenshot clipboard secara instan dan menyisipkan penanda [Gambar 1], [Gambar 2], dst. tepat di posisi kursor pengetikan pengguna.',
            'Tangkap Layar Dashboard Satu-Klik: Tombol "Tangkap Layar Dashboard" memanfaatkan native Electron webContents.capturePage() untuk memotret jendela dashboard aktif secara bersih.',
            'Mode Minimize & Floating Dock Pill: Form feedback dapat diminimize ke floating pill di sudut kanan bawah (#feedback-dock-pill), menjaga teks dan lampiran gambar tetap utuh saat CS mengambil screenshot dari aplikasi lain.',
            'Lightbox Full Preview: Membuka perbesaran gambar lampiran secara interaktif dengan backdrop gelap dan informasi dimensi/ukuran file.'
          ]
        },
        {
          category: 'Sistem Tata Letak Mengambang Terpadu (Unified Floating Dock & Mutual Awareness)',
          tag: 'Floating Dock & UI',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Penyatuan Kontainer Melayang (.floating-bottom-dock): Mengkoordinasikan tombol Tools CS FAB, Draf Feedback Pill, dan Onboarding Checklist Widget dalam satu flexbox row-reverse terpadu.',
            'Kesadaran Timbal Balik (Mutual Awareness): Membuka menu popover Tools CS otomatis mengecilkan (collapse) checklist onboarding, dan memperbesar checklist otomatis menutup menu popover Tools CS.',
            'Transisi Meluncur Halus (Fluid Glide Transition): Menggeser widget ke kiri/kanan secara proporsional saat draf feedback muncul atau dihilangkan tanpa risiko tumpang tindih.',
            'Penyempurnaan Integrasi Backend & Active Stores: Menyertakan daftar toko aktif (storesConfig) terformat bullet point rapi di Telegram, dengan fallback otomatis ke sesi user backend main.js.'
          ]
        },
        {
          category: 'Ekspansi Analitik & Pelacakan Telemetri Terintegrasi (Full 81-Event Coverage)',
          tag: 'Telemetry & Analytics',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Integrasi pelacakan telemetri menyeluruh (81 event operasional) tanpa overhead latensi, mencakup autentikasi (login, logout, pergantian PIN, reset pertanyaan keamanan, dan profil update).',
            'Pelacakan modul Super Admin (pembuatan user admin, demosi role, reset PIN CS, penghapusan user, dan pembersihan sesi terpusat).',
            'Pelacakan CS Toolkit & Smart Productivity (penggunaan Smart Quick Reply via shortcut/klik, reset template, ekspor/impor/copy/insert Scratchpad, copy/insert Smart Case Converter, dan riwayat clipboard).',
            'Pelacakan siklus multi-tab, sleep/hibernasi toko, navigasi address bar (refresh/home), status jaringan internet, backup/restore konfigurasi toko, dan interaksi Onboarding Guided Tour.'
          ]
        },
        {
          category: 'Keamanan Kriptografi & Proteksi Partisi Host (Security Guard)',
          tag: 'Security',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          items: [
            'Implementasi helper keamanan isValidPartition(partition) dengan regex whitelisting ketat (^persist:[a-zA-Z0-9_-]{1,120}$) di main.js.',
            'Proteksi celah Path Traversal pada IPC handlers session.fromPartition() dan safeDeletePartitionDisk() (clear-store-cache, deep-clean-store, deep-clean-all, dan admin session handlers).',
            'Pencegahan akses, manipulasi, atau penghapusan direktori di luar direktori partisi resmi aplikasi oleh renderer/XSS payload.'
          ]
        },
        {
          category: 'Aksesibilitas & Standar WAI-ARIA (Screen Reader Support)',
          tag: 'Accessibility',
          color: '#38bdf8',
          bgColor: 'rgba(56, 189, 248, 0.12)',
          items: [
            'Pemberian atribut aria-label eksplisit pada seluruh tombol navigasi tab bar (Kembali, Maju, Refresh, Beranda Toko, Buka URL, dan Tambah Tab Baru).',
            'Label dinamis pembaca layar pada tombol Tutup Tab ("Tutup tab [Nama Tab]") dan Hibernasi Tab ("Hibernasi tab [Nama Tab] untuk hemat RAM").',
            'Pemberian aria-label="Alamat URL web atau pencarian" pada input Mini Address Bar per tab toko.',
            'Penambahan atribut role="toolbar" pada kontrol navigasi serta role="tablist" dan role="tab" (dengan aria-selected) pada daftar tab aktif toko.'
          ]
        },
        {
          category: 'Optimasi Performa DOM & Kecepatan Pengetikan (Debounce)',
          tag: 'Performance',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          items: [
            'Integrasi utilitas global debounce(func, 180) pada js/utils.js untuk menunda kalkulasi filter dan rekonstruksi DOM berulang saat pengguna mengetik cepat.',
            'Penerapan debounce pada pencarian daftar toko sidebar (app.js), template smart reply (quickreply.js), dan catatan khusus pembeli (tools.js).',
            'Pengurangan beban eksekusi DOM innerHTML dan Garbage Collector (GC) browser hingga 80-90% saat pengetikan aktif, menghasilkan pengalaman ketik 60 FPS tanpa stutter.'
          ]
        },
        {
          category: 'Optimasi Vektor & Stabilitas Antarmuka',
          tag: 'SVG & Engine',
          color: '#06b6d4',
          bgColor: 'rgba(6, 182, 212, 0.12)',
          items: [
            'Injeksi atribut aria-hidden="true" dan focusable="false" pada seluruh elemen <svg> tombol kontrol dan badge sinkronisasi.',
            'Pencegahan ghost focus dan redundant speech pada assistive technology pembaca layar (NVDA, Narrator, JAWS).',
            'Pembaruan manifest versi dan release guard terintegrasi v1.0.9.'
          ]
        }
      ]
    },
    {
      version: '1.0.8',
      badge: 'Bugfix & Stability 🛡️',
      badgeColor: '#3b82f6',
      releaseDate: 'Agustus 2026',
      title: 'Shopee Traffic Fix, Pure Chrome UA, Gemini Scroll Affordance & Root Popover',
      tagline: 'Perbaikan komprehensif verifikasi traffic Shopee, standardisasi User-Agent Google Chrome murni & masking anti-bot, scroll affordance mask-image tanpa scrollbar fisik, micro-bounce scroll peek, root popover profil, dan stabilitas modal CS.',
      highlights: [
        {
          icon: '🛡️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          title: 'Fix Verifikasi Traffic Shopee',
          desc: 'Standarisasi Chrome User-Agent murni, masking navigator.webdriver, dan auto-healing portal chat Shopee dari error traffic.'
        },
        {
          icon: '✨',
          iconBg: 'rgba(223, 22, 131, 0.15)',
          title: 'Scroll Affordance & Micro-Bounce',
          desc: 'CSS mask-image transparan alami menggantikan scrollbar fisik pada sidebar collapsed, plus animasi halus scroll peek & full wheel passthrough.'
        },
        {
          icon: '👤',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          title: 'Popover Profil Bebas Terpotong',
          desc: 'Menu profil user dipindahkan ke root layout dengan koordinat fixed dinamis dan dismissal backdrop pada seluruh modal CS.'
        },
        {
          icon: '⚡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          title: 'Stabilitas Webview, Tabs & Sync',
          desc: 'Fix sinkronisasi live template/tema, fix tombol muat ulang retryTab spesifik, dan fix stacking z-index tombol tutup modal.'
        }
      ],
      categories: [
        {
          category: 'Ketahanan Webview & Bypass Verifikasi Traffic Shopee',
          tag: 'Webview & Security',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          items: [
            'Fix Shopee Traffic Verification Error (/verify/traffic/error & shopee.co.id/verify): Menghapus User-Agent Firefox dan menerapkan User-Agent Google Chrome resmi murni yang sinkron dengan Chromium engine.',
            'Anti-Automation & Bot Detection Masking: Menyuntikkan masking navigator.webdriver pada webview-preload untuk mencegah pemblokiran WAF Shopee, Tokopedia, dan WA Web.',
            'Auto-Healing Portal Chat Shopee: Menambahkan filter keamanan otomatis yang mengembalikan tab Shopee dari halaman error atau katalog belanja umum langsung ke portal resmi Shopee Seller Chat.'
          ]
        },
        {
          category: 'Penyempurnaan Navigasi Sidebar & Scroll Affordance',
          tag: 'Sidebar & UI',
          color: '#df1683',
          bgColor: 'rgba(223, 22, 131, 0.12)',
          items: [
            'Scroll Affordance Sidebar Tanpa Scrollbar Fisik: Menghilangkan scrollbar fisik yang memotong layout 56px collapsed sidebar, digantikan oleh CSS mask-image transparan alami yang bekerja sempurna di Dark & Light theme.',
            'Fitur Micro-Bounce Scroll Peek / Nudge: Animasi geser naik halus ~28px otomatis memamerkan daftar toko yang tersembunyi saat aplikasi baru dibuka atau toko bertambah banyak.',
            'Full Wheel Passthrough: Memutar roda mouse di area header maupun footer sidebar otomatis meneruskan scroll ke daftar toko.'
          ]
        },
        {
          category: 'Tata Letak Antarmuka & CS Toolkit Modals',
          tag: 'UI & Modals',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          items: [
            'Fix Pemotongan Popover Profil Pengguna: Memindahkan elemen #user-popover-menu ke layout root dan menerapkan koordinat fixed dinamis, menghilangkan kendala menu terpotong oleh overflow layout saat sidebar collapsed.',
            'Backdrop Dismissal pada Seluruh Modal Tools CS: Pengguna kini dapat menutup modal Catatan Pelanggan, Form Catatan, WhatsApp Direct Linker, Case Converter, dan Tambah User Super Admin dengan mengklik area gelap di luar modal.',
            'Fix Scratchpad Tab Dragging Conflict: Mengatasi benturan event mousedown tombol [+] pada header Scratchpad agar tidak memicu dragging jendela.'
          ]
        },
        {
          category: 'Stabilitas Sistem, Multi-Tab & Sinkronisasi',
          tag: 'Stability & Engine',
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.12)',
          items: [
            'Fix Sinkronisasi Template & Tema Webview: Mengatasi ReferenceError pada broadcastTemplatesToWebviews() sehingga template, tema, dan clipboard langsung tersinkronisasi live ke semua webview aktif.',
            'Fix Tombol Close Modal Changelog / Info Sistem: Menyelesaikan isu stacking z-index pada tombol silang [X] dan menambahkan inline fallback handler yang aman.',
            'Fix Tombol Muat Ulang Webview Error: Memastikan tombol reload pada error overlay menargetkan tab spesifik pada toko yang memiliki banyak tab (retryTab).',
            'Pembaruan manifest versi dan release guard terintegrasi v1.0.8.'
          ]
        }
      ]
    },
    {
      version: '1.0.7',
      badge: 'Gemini & Smart CS 🚀',
      badgeColor: '#10b981',
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
