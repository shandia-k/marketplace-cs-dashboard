// ── Marketplace Config ───────────────────────────────────────────────────────
const MARKETPLACE_CONFIG = {
  shopee: {
    label: 'Shopee',
    url: 'https://seller.shopee.co.id/',
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
  whatsapp: {
    label: 'WhatsApp Web',
    url: 'https://web.whatsapp.com/',
    emoji: '💬',
    faviconClass: 'favicon-whatsapp',
    groupColor: '#25d366'
  },
  gmail: {
    label: 'Gmail',
    url: 'https://mail.google.com/',
    emoji: '✉️',
    faviconClass: 'favicon-gmail',
    groupColor: '#ea4335'
  },
  outlook: {
    label: 'Outlook',
    url: 'https://outlook.live.com/mail/',
    emoji: '📧',
    faviconClass: 'favicon-outlook',
    groupColor: '#0078d4'
  },
  custom: {
    label: 'Custom',
    url: '',
    emoji: '⚙️',
    faviconClass: 'favicon-custom',
    groupColor: '#DF1683'
  }
};

// ── RAM Hibernation & Hot Pool Config ──────────────────────────────────────────
const RAM_THRESHOLD_MB = 2048;  // 2 GB — hibernate otomatis di atas ini
const RAM_CHECK_INTERVAL_MS = 8000; // Cek setiap 8 detik
const HOT_WEBVIEW_POOL_LIMIT = 5;   // Maksimal 5 webview teraktif dipertahankan hidup di DOM (0s wake)

// ── Default Smart Quick Reply Templates ────────────────────────────────────────
const DEFAULT_SMART_TEMPLATES = [
  {
    id: 'tpl-greeting-1',
    title: 'Sapaan Ramah & Bantuan',
    category: 'greeting',
    content: 'Halo kak {customer}, selamat {waktu}! Dengan CS {cs} dari {toko}. Ada yang bisa saya bantu? 😊'
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

// ── Popular Marketplace & Service Presets ────────────────────────────────────
const POPULAR_MARKETPLACE_PRESETS = [
  { keywords: ['grab', 'grab merchant', 'grabfood', 'grab merchant portal', 'grab seller'], title: 'GrabMerchant Portal', url: 'https://merchant.grab.com/portal/', domain: 'merchant.grab.com', snippet: 'Portal resmi GrabMerchant & GrabFood Indonesia' },
  { keywords: ['gobiz', 'gofood', 'gojek merchant', 'go food'], title: 'GoBiz Portal Mitra Usaha Gojek', url: 'https://app.gobiz.com/', domain: 'app.gobiz.com', snippet: 'Dashboard resmi GoBiz untuk GoFood & GoPay' },
  { keywords: ['shopeefood', 'shopee partner', 'shopee merchant'], title: 'Shopee Partner Merchant Portal', url: 'https://partner.shopee.co.id/', domain: 'partner.shopee.co.id', snippet: 'Portal resmi Merchant ShopeeFood & ShopeePay' },
  { keywords: ['dokterin', 'dokter in', 'dokterin seller', 'dokterin partner'], title: 'DokterIN Partner / Seller', url: 'https://partner.dokterin.co.id/', domain: 'partner.dokterin.co.id', snippet: 'Portal resmi DokterIN Partner & Tenaga Medis' },
  { keywords: ['zalora', 'zalora seller', 'zalora seller center'], title: 'Zalora Seller Center Indonesia', url: 'https://sellercenter.zalora.co.id/', domain: 'sellercenter.zalora.co.id', snippet: 'Pusat kelola toko resmi Zalora Indonesia' },
  { keywords: ['evermos', 'evermos reseller', 'evermos login'], title: 'Evermos Reseller & Commerce', url: 'https://evermos.com/login', domain: 'evermos.com', snippet: 'Platform social commerce & reseller Evermos' },
  { keywords: ['whatsapp', 'wa', 'wa web', 'whatsapp web'], title: 'WhatsApp Web', url: 'https://web.whatsapp.com/', domain: 'web.whatsapp.com', snippet: 'Official WhatsApp Web Messenger' },
  { keywords: ['telegram', 'tele', 'telegram web'], title: 'Telegram Web', url: 'https://web.telegram.org/', domain: 'web.telegram.org', snippet: 'Official Telegram Web Client' },
  { keywords: ['shopify', 'shopify admin', 'shopify seller'], title: 'Shopify Admin Portal', url: 'https://accounts.shopify.com/store-login', domain: 'accounts.shopify.com', snippet: 'Shopify Store Admin & Dashboard' },
  { keywords: ['olx', 'olx indonesia', 'olx seller'], title: 'OLX Indonesia', url: 'https://www.olx.co.id/', domain: 'olx.co.id', snippet: 'Pusat jual beli online OLX Indonesia' },
  { keywords: ['bhinneka', 'bhinneka merchant'], title: 'Bhinneka Merchant Center', url: 'https://merchant.bhinneka.com/', domain: 'merchant.bhinneka.com', snippet: 'Portal Merchant Partner Bhinneka' },
  { keywords: ['padi', 'padi umkm', 'padi seller'], title: 'PaDi UMKM Seller', url: 'https://seller.padiumkm.id/', domain: 'seller.padiumkm.id', snippet: 'Pasar Digital UMKM BUMN Seller Center' },
  { keywords: ['sirclo', 'sirclo store'], title: 'SIRCLO Store Admin', url: 'https://admin.sirclo.com/', domain: 'admin.sirclo.com', snippet: 'Dashboard Admin Sirclo Store' },
  { keywords: ['jakmall', 'jakmall mitra'], title: 'Jakmall Mitra Dropship', url: 'https://mitra.jakmall.com/', domain: 'mitra.jakmall.com', snippet: 'Pusat Mitra Dropship Jakmall' },
  { keywords: ['orderonline', 'order online', 'orderonline.id'], title: 'OrderOnline.id Portal', url: 'https://orderonline.id/login/', domain: 'orderonline.id', snippet: 'Platform otomasi order & checkout' },
  { keywords: ['mengantar', 'mengantar.com', 'mengantar app'], title: 'Mengantar Shipping Dashboard', url: 'https://app.mengantar.com/', domain: 'app.mengantar.com', snippet: 'Platform pengiriman & COD Mengantar' },
  { keywords: ['kiriminaja', 'kirimin aja'], title: 'KiriminAja Dashboard Ekspedisi', url: 'https://dashboard.kiriminaja.com/', domain: 'dashboard.kiriminaja.com', snippet: 'Dashboard pengiriman multi ekspedisi KiriminAja' },
  { keywords: ['biteship', 'biteship dashboard'], title: 'Biteship Dashboard', url: 'https://dashboard.biteship.com/', domain: 'dashboard.biteship.com', snippet: 'Layanan API logistik & ekspedisi Biteship' },
  { keywords: ['instagram', 'ig web', 'instagram direct'], title: 'Instagram Web Inbox', url: 'https://www.instagram.com/direct/inbox/', domain: 'instagram.com', snippet: 'Instagram Direct Messages Web' },
  { keywords: ['lazada', 'lazada seller center'], title: 'Lazada Seller Center', url: 'https://sellercenter.lazada.co.id/apps/seller/chat', domain: 'sellercenter.lazada.co.id', snippet: 'Lazada Seller Center Chat' },
  { keywords: ['tiktok', 'tiktok shop', 'tiktok seller'], title: 'TikTok Shop Seller Center', url: 'https://seller-id.tokopedia.com/account/login', domain: 'seller-id.tokopedia.com', snippet: 'TikTok Shop / Tokopedia Seller Center' },
  { keywords: ['blibli', 'blibli seller'], title: 'Blibli Seller Center', url: 'https://seller.blibli.com/backend/chat', domain: 'seller.blibli.com', snippet: 'Blibli Seller Chat Portal' },
  { keywords: ['bukalapak', 'bukalapak seller'], title: 'Bukalapak Seller Center', url: 'https://seller.bukalapak.com/message', domain: 'seller.bukalapak.com', snippet: 'Bukalapak Seller Message' },
  { keywords: ['shopee', 'shopee seller'], title: 'Shopee Seller Centre', url: 'https://seller.shopee.co.id/', domain: 'seller.shopee.co.id', snippet: 'Shopee Seller Centre' },
  { keywords: ['tokopedia', 'tokopedia seller'], title: 'Tokopedia Seller Center', url: 'https://seller.tokopedia.com/chat', domain: 'seller.tokopedia.com', snippet: 'Tokopedia Seller Chat Portal' }
];

window.MARKETPLACE_CONFIG = MARKETPLACE_CONFIG;
window.RAM_THRESHOLD_MB = RAM_THRESHOLD_MB;
window.RAM_CHECK_INTERVAL_MS = RAM_CHECK_INTERVAL_MS;
window.HOT_WEBVIEW_POOL_LIMIT = HOT_WEBVIEW_POOL_LIMIT;
window.DEFAULT_SMART_TEMPLATES = DEFAULT_SMART_TEMPLATES;
window.AVATAR_COLORS = AVATAR_COLORS;
window.AVATAR_ICONS = AVATAR_ICONS;
window.POPULAR_MARKETPLACE_PRESETS = POPULAR_MARKETPLACE_PRESETS;
