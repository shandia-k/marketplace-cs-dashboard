// @ts-check
/**
 * src/main/config/constants.js
 * Centralized constants for Main Process
 */

const chromeVersion = process.versions.chrome || '126.0.0.0';
const chromeMajorVersion = chromeVersion.split('.')[0] || '126';
const cleanChromeUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
const cleanFirefoxUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0`;

const CHROME_CLIENT_HINTS = {
  'Sec-CH-UA': `"Not/A)Brand";v="8", "Chromium";v="${chromeMajorVersion}", "Google Chrome";v="${chromeMajorVersion}"`,
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"',
  'Sec-CH-UA-Platform-Version': '"15.0.0"',
  'Sec-CH-UA-Arch': '"x86"',
  'Sec-CH-UA-Bitness': '"64"',
  'Sec-CH-UA-Model': '""'
};

const defaultStores = [
  {
    id: 'shopee-1',
    name: 'Shopee Toko 1',
    marketplace: 'shopee',
    url: 'https://seller.shopee.co.id/',
    partition: 'persist:shopee-1'
  },
  {
    id: 'tokopedia-1',
    name: 'Tokopedia Toko 1',
    marketplace: 'tokopedia',
    url: 'https://seller.tokopedia.com/chat',
    partition: 'persist:tokopedia-1'
  },
  {
    id: 'lazada-1',
    name: 'Lazada Toko 1',
    marketplace: 'lazada',
    url: 'https://sellercenter.lazada.co.id/apps/seller/chat',
    partition: 'persist:lazada-1'
  }
];

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

module.exports = {
  chromeVersion,
  cleanChromeUserAgent,
  cleanFirefoxUserAgent,
  CHROME_CLIENT_HINTS,
  defaultStores,
  POPULAR_MARKETPLACE_PRESETS
};
