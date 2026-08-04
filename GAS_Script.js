/**
 * SCRIPT GOOGLE APPS SCRIPT (GAS)
 * ================================
 * 
 * CARA PENGGUNAAN:
 * 1. Buka https://script.google.com/
 * 2. Klik "New Project" (Proyek Baru)
 * 3. Hapus semua kode yang ada, lalu COPY-PASTE semua kode di bawah ini ke sana.
 * 4. Isi variabel TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID dengan milik Anda.
 * 5. Klik tombol biru "Deploy" di pojok kanan atas -> pilih "New deployment".
 * 6. Pada logo gerigi (Select type), pilih "Web app".
 * 7. Isi Description: "Feedback Proxy".
 * 8. Pada bagian "Who has access", pilih "Anyone" (Siapa saja).
 * 9. Klik "Deploy". 
 * 10. (Jika diminta otorisasi, ikuti saja dan klik Advanced -> Go to project).
 * 11. Salin "Web app URL" yang muncul dan paste ke dalam `main.js` di baris 263.
 */

const TELEGRAM_BOT_TOKEN = "ISI_TOKEN_BOT_ANDA_DI_SINI";
const TELEGRAM_CHAT_ID = "ISI_CHAT_ID_ANDA_DI_SINI";

function doPost(e) {
  try {
    // Parsing data yang dikirim dari aplikasi Desktop
    const data = JSON.parse(e.postData.contents);
    
    // Fungsi untuk merapikan karakter HTML agar tidak bentrok dengan API Telegram
    const escapeHTML = (str) => {
      if (!str) return "";
      return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    
    // Menyusun teks laporan
    const safeStoresConfig = data.storesConfig ? data.storesConfig.toString().substring(0, 800) : "Tidak ada";
    const tgText = `🚨 <b>[${escapeHTML(data.type)}] Laporan Baru Dashboard</b>\n\n` +
                   `<b>Pesan:</b>\n${escapeHTML(data.message)}\n\n` +
                   `<b>System Info:</b>\n<pre>${escapeHTML(data.systemInfo)}</pre>\n` +
                   `<b>Active Stores Config:</b>\n<pre><code class="language-json">${escapeHTML(safeStoresConfig)}</code></pre>`;
    
    // Mengirim ke API Telegram
    const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
    const payload = {
      "chat_id": TELEGRAM_CHAT_ID,
      "text": tgText,
      "parse_mode": "HTML"
    };
    
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(url, options);
    
    // Memberikan respon sukses kembali ke aplikasi
    return ContentService.createTextOutput(JSON.stringify({"success": true}))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    // Memberikan respon error kembali ke aplikasi
    return ContentService.createTextOutput(JSON.stringify({"success": false, "error": error.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
