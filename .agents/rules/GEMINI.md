# 🤖 Mandatory AI Agent Engineering Guardrails & Coding Rules
# Project: marketplace-cs-dashboard

Sebagai AI Coding Agent yang bekerja pada codebase ini, Anda WAJIB mematuhi seluruh aturan dan batasan teknis berikut pada setiap perubahan kode:

---

## 🎯 1. Prinsip Operasi Bedah (Surgical Diff Only)
- **Minimal Invasive Changes**: Hanya ubah baris kode yang secara langsung terkait dengan instruksi user.
- **Dilarang Rewrite Monolitik**: DILARANG menulis ulang seluruh fungsi besar atau seluruh file jika hanya perlu memperbaiki beberapa baris.
- **Preservasi Logika Eksisting**: Pertahankan seluruh komentar, validasi batas (null checks), error handling, event listener, class CSS, dan data-attribute yang sudah ada kecuali jika diminta secara eksplisit oleh user untuk diubah.

---

## 🔍 2. Verifikasi Area Dampak (Blast Radius Containment)
- **Cek Dependensi Antar File**: Sebelum mengubah nama fungsi, nama variabel global, atau ID elemen DOM, WAJIB lakukan `grep_search` di seluruh folder `js/`, `src/`, dan `tests/` untuk memastikan tidak ada pemanggil yang rusak.
- **Konsistensi Tipe Data**: Jika mengubah bentuk parameter (misal dari `string URL` menjadi `object { url, postBody, referrer }`), pastikan seluruh tempat pemanggilan (`app.js`, `tabs.js`, `webview.js`, `split-view.js`, dll.) telah disesuaikan secara simetris.

---

## 🧱 3. Integritas Struktur Layout & DOM
- **Pemisahan Elemen Fixed vs Scrollable**:
  - DILARANG memasukkan tombol aksi permanen (seperti Add Tab `+`, Split View `◫`, Search `🔍`, Close `×`) ke dalam kontainer yang memiliki `overflow-x: auto` (seperti `.tab-items-container` atau `.scratchpad-tabs`).
  - Tombol aksi wajib berada di dalam wadah terpisah (`.tab-bar-actions`, `.scratchpad-header-actions`) agar posisinya tetap terkunci di layar saat tab di-scroll.
- **Flexbox Scrollable Children**:
  - Setiap kontainer fleksibel yang memiliki `overflow-x: auto` wajib memiliki properti `min-width: 0;` dan `scrollbar-width: none;`.
  - Setiap item tab di dalamnya wajib memiliki `flex-shrink: 0;` agar tidak gepeng/tertekan saat jumlah tab bertambah banyak.
  - Wajib menyediakan event listener `wheel` untuk mendukung penggeseran horizontal via roda mouse (*mouse wheel*).

---

## 🌐 4. Standar Webview & Mimikri Chromium
- **Atribut Wajib `<webview>`**:
  - Setiap elemen `<webview>` yang dibuat wajib memiliki `allowpopups="true"` dan `webpreferences="backgroundThrottling=...,sandbox=false,plugins=true"`.
- **Dukungan Protokol Dokumen**:
  - Filter navigasi dan `setWindowOpenHandler` wajib mengizinkan skema `http:`, `https:`, `about:`, `blob:`, dan `data:` agar dokumen faktur/PDF tidak diblokir.
- **Preservasi POST Body & Referrer**:
  - Data form POST (`postBody.data`, `contentType`) dan HTTP `referrer` dari `setWindowOpenHandler` wajib diteruskan ke `loadURL(url, loadOpts)` saat membuka tab baru.

---

## 🧪 5. Kewajiban Menjalankan Anti-Regression Guard
- **Validasi Wajib Sebelum Selesai**:
  - Setiap kali selesai melakukan edit kode, AI Agent WAJIB menjalankan:
    ```bash
    node tests/run-all-tests.js
    ```
  - Jika ada tes yang gagal (gagal assert / error), AI Agent WAJIB memperbaiki error tersebut secara mandiri (*self-healing*) sampai seluruh 8 layer pengujian lulus 100% sebelum menyerahkan hasil ke user.
- **Penambahan Test Kasus Baru**:
  - Setiap perbaikan bug baru wajib disertai penambahan unit/regression test di `tests/regression/regression-catalog.test.js` (`[REG-XXX]`).
