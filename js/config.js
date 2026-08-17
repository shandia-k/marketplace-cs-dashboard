// ── Marketplace Config ───────────────────────────────────────────────────────
const MARKETPLACE_CONFIG = {
  shopee: {
    label: 'Shopee',
    url: 'https://seller.shopee.co.id/portal/chat',
    emoji: '🛍️',
    faviconClass: 'favicon-shopee',
    groupColor: '#f5521d'
  },
  tokopedia: {
    label: 'Tokopedia',
    url: 'https://seller.tokopedia.com/chat',
    emoji: '🟢',
    faviconClass: 'favicon-tokopedia',
    groupColor: '#03ac0e'
  },
  lazada: {
    label: 'Lazada',
    url: 'https://sellercenter.lazada.co.id/apps/seller/chat',
    emoji: '🔵',
    faviconClass: 'favicon-lazada',
    groupColor: '#0f146b'
  },
  tiktok: {
    label: 'TikTok Shop',
    url: 'https://seller-id.tiktok.com/message',
    emoji: '⬛',
    faviconClass: 'favicon-tiktok',
    groupColor: '#ffffff'
  },
  blibli: {
    label: 'Blibli',
    url: 'https://seller.blibli.com/backend/chat',
    emoji: '🔷',
    faviconClass: 'favicon-blibli',
    groupColor: '#0190d0'
  },
  bukalapak: {
    label: 'Bukalapak',
    url: 'https://seller.bukalapak.com/message',
    emoji: '🔴',
    faviconClass: 'favicon-bukalapak',
    groupColor: '#e12b2b'
  },
  custom: {
    label: 'Custom',
    url: '',
    emoji: '⚙️',
    faviconClass: 'favicon-custom',
    groupColor: '#DF1683'
  }
};

// ── RAM Hibernation Config ─────────────────────────────────────────────────────
const RAM_THRESHOLD_MB = 2048;  // 2 GB — hibernate otomatis di atas ini
const RAM_CHECK_INTERVAL_MS = 8000; // Cek setiap 8 detik

// ── Default Smart Quick Reply Templates ────────────────────────────────────────
const DEFAULT_SMART_TEMPLATES = [
  {
    id: 'tpl-greeting-1',
    title: 'Sapaan Ramah & Bantuan',
    category: 'greeting',
    content: 'Halo kak, selamat {waktu}! Terima kasih sudah menghubungi {toko}. Ada yang bisa kami bantu kak? 😊'
  },
  {
    id: 'tpl-order-check',
    title: 'Cek Status Nomor Pesanan',
    category: 'order',
    content: 'Halo kak! Terkait pesanan dengan nomor order {clipboard}, pesanan kakak sudah kami konfirmasi dan saat ini sedang dalam proses packing ya kak. Mohon ditunggu updatenya! 🙏'
  },
  {
    id: 'tpl-tracking-resi',
    title: 'Update Resi Pengiriman',
    category: 'order',
    content: 'Halo kak! Untuk paket dengan no. resi {clipboard} saat ini sudah diserahkan ke pihak ekspedisi dan sedang dalam perjalanan ke alamat tujuan. Estimasi sampai 1-2 hari kerja ya kak. 📦'
  },
  {
    id: 'tpl-complaint-unboxing',
    title: 'Komplain - Minta Video Unboxing',
    category: 'complaint',
    content: 'Mohon maaf sekali atas kendala yang dialami ya kak. Untuk klaim kendala pada pesanan {clipboard}, mohon bantu kirimkan foto resi fisik dan video unboxing paket saat pertama dibuka ya kak. Tim kami akan segera berikan solusi terbaik.'
  },
  {
    id: 'tpl-product-ready',
    title: 'Konfirmasi Stok Ready',
    category: 'product',
    content: 'Halo kak, untuk produk yang kakak tanyakan saat ini ready stock siap kirim ya kak! Silakan langsung di-checkout sebelum kehabisan ya kak. ✨'
  },
  {
    id: 'tpl-closing-thanks',
    title: 'Penutup & Ulasan Bintang 5',
    category: 'greeting',
    content: 'Sama-sama kak, senang bisa membantu! Jika pesanan sudah sampai dengan baik, mohon bantu berikan ulasan bintang 5 ya kak. Sehat selalu dan selamat berbelanja kembali di {toko}! ⭐⭐⭐⭐⭐'
  }
];

// ── User Avatar & Palette Presets ────────────────────────────────────────────
const AVATAR_COLORS = [
  '#df1683', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'
];

const AVATAR_ICONS = [
  '👩‍💼', '👨‍💻', '🎧', '⚡', '🌟', '🛡️', '🤖', '🛍️', '📦', '🎯', '🚀', '💼'
];

window.AVATAR_COLORS = AVATAR_COLORS;
window.AVATAR_ICONS = AVATAR_ICONS;
