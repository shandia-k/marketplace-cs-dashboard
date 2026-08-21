# 🛡️ PANDUAN PENCEGAHAN REGRESI & PIRAMIDA AUTOMATED TESTING
### Marketplace Customer Service Dashboard

Dokumen ini adalah standar operasional arsitektur pengujian piramida lengkap (*Full Testing Pyramid*) untuk mencegah terbentuknya bug baru saat memperbaiki bug lama maupun membuka kembali bug lama saat menambah fitur baru (*Zero-Regression Policy*).

---

## 1. Arsitektur Lengkap Piramida Pengujian (*Full Testing Pyramid*)

```
             /  E2E Testing  \       -> Playwright for Electron (Peluncuran Jendela Desktop Nyata)
            /-----------------\
           / UI / DOM / Render \     -> DOM Sandbox (Pengujian State, Modal Dialogs, & Autocomplete)
          /---------------------\
         /  IPC / Main Security  \   -> Node.js Native Runner (Kriptografi, Auth Lockout, RBAC, Storage)
        /-------------------------\
       /  Unit & Regression Logic  \ -> Node.js Native Runner (Fungsi Murni, Template Engine, Tools, REG-XXX)
```

### Rincian Lapisan Pengujian:

| Tingkat | Kategori | Tool / Engine | Direktori & Komponen yang Diuji |
| :--- | :--- | :--- | :--- |
| **Puncak (E2E)** | **Playwright E2E** | `@playwright/test` + `_electron` | `tests/e2e/`<br>• Peluncuran aplikasi Electron desktop nyata<br>• Title bar & window controls (minimize, maximize, close)<br>• Theme switching & visual rendering<br>• Quick lock screen & context isolation verification |
| **Tingkat 3** | **UI / DOM / Renderer** | DOM Sandbox Environment | `tests/integration/renderer/` & `tests/integration/webview/`<br>• Dialog konfirmasi & keyword Danger Zone (`requireText`)<br>• Reaktivitas state global toko & tab management<br>• Version registry & changelog release guard<br>• Webview link interception & anti-detection stealth |
| **Tingkat 2** | **IPC / Main & Security** | Node.js Native Runner | `tests/unit/security/`, `tests/unit/storage/`, `tests/integration/ipc/`<br>• Scrypt password hashing & cryptographic salt<br>• HMAC SHA-256 `roleSig` anti-tampering role<br>• Proteksi IDOR & isolasi partisi per user toko<br>• Rate-limiting lockout 5x percobaan salah (15 menit)<br>• Penulisan storage atomik & failover recovery `.bak` |
| **Dasar** | **Unit & Regression** | Node.js Native Runner | `tests/unit/logic/` & `tests/regression/`<br>• Template variable replacement `{resi}`, `{toko}`, `{cs}`<br>• CS Toolkit phone cleaner & text case converter<br>• Konfigurasi default marketplace & limit memori RAM<br>• Katalog bug historis permanen (`REG-001` s/d `REG-007+`) |

---

## 2. Perintah Pengujian (NPM Scripts)

```bash
# 1. Jalankan seluruh pengujian cepat (Tingkat 1 - 8: ~3.3 detik)
npm test

# 2. Jalankan pengujian E2E Playwright Electron nyata (~50 detik)
npm run test:e2e

# 3. Jalankan TOTAL SELURUH PENGUJIAN (Unit + Integration + E2E)
npm run test:all

# 4. Jalankan pengujian per layer spesifik:
npm run test:unit        # Unit & Logic
npm run test:security    # Security, Auth & RBAC
npm run test:storage     # Storage & Auto-Migration
npm run test:ipc         # IPC Contracts & Preload Surface
npm run test:renderer    # Renderer & DOM Modals
npm run test:webview     # Webview Preload & Anti-Detection
npm run test:regression  # Dedicated Regression Catalog (REG-XXX)
npm run test:smoke       # Smoke & Build Readiness

# 5. Jalankan Anti-Regression Guard (Changelog Check + Full Test Suite)
npm run guard
```

---

## 3. Protokol TDD untuk Perbaikan Bug (Bug-to-Test Mapping)

Untuk menjamin **0% regresi di masa depan**, ikuti 4 langkah wajib ini saat memperbaiki bug:

### Langkah 1: Buat Test Case yang FAIL Terlebih Dahulu (Reproduksi Bug)
Tambahkan unit test baru di `tests/regression/regression-catalog.test.js` dengan format ID `[REG-XXX]`:
```javascript
test('[REG-008] Deskripsi Bug: Penjelasan skenario yang sebelumnya memicu bug', () => {
  const hasil = fungsiYangBermasalah(inputPemicuBug);
  assert.equal(hasil, outputYangSeharusnya);
});
```
Jalankan `npm run test:regression` dan pastikan test tersebut **GAGAL (FAIL)**.

### Langkah 2: Lakukan Perbaikan Kode di Source Code
Edit file logika di `src/main/` atau `js/` hingga bug teratasi.

### Langkah 3: Pastikan Test Case Lolos (PASS)
Jalankan kembali `npm run test:regression`. Test `[REG-008]` sekarang harus **LOLOS (PASS)**.

### Langkah 4: Jalankan Anti-Regression Guard
Jalankan `npm run guard` untuk memastikan perbaikan kode tersebut tidak memicu efek samping (*side-effects*) pada aspek aplikasi lainnya.

---

## 4. Konfigurasi CI/CD & Build Guard

Script `scripts/anti-regression-guard.js` telah terintegrasi pada perintah `npm start` dan `npm run build`. Proses build installer otomatis digagalkan jika ada kegagalan test atau ketidaksesuaian versi changelog.
