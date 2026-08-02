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
