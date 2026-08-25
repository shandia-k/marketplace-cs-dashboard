// @ts-check
/**
 * src/main/config/url-rules.js
 * Centralized Single-Source-of-Truth for URL Classification, OAuth Detection, and Protocol Security
 */

/**
 * Daftar domain dan path pola OAuth resmi
 */
const KNOWN_OAUTH_HOSTS = [
  'accounts.google.com',
  'accounts.youtube.com',
  'appleid.apple.com',
  'login.live.com',
  'login.microsoftonline.com',
  'facebook.com',
  'www.facebook.com',
  'github.com',
  'id.lazada.com',
  'seller.shopee.co.id',
  'seller.tiktok.com'
];

/**
 * Protokol yang diizinkan untuk navigasi dan pembukaan tab webview
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'about:', 'blob:', 'data:']);

/**
 * Protokol berbahaya yang harus diblokir seketika
 */
const DANGEROUS_PROTOCOLS = new Set(['file:', 'javascript:', 'vbscript:']);

/**
 * Memeriksa apakah URL merupakan alur autentikasi OAuth atau Login SSO eksternal
 * yang harus tetap berada di jendela popup/modal dan TIDAK dibuka sebagai tab terpisah.
 * 
 * @param {string} rawUrl 
 * @returns {boolean}
 */
function isOAuthUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const lowerUrl = rawUrl.trim().toLowerCase();

  // 1. Google OAuth & Identity Platform
  if (
    lowerUrl.includes('accounts.google.com/o/oauth2') ||
    lowerUrl.includes('accounts.google.com/v3/signin') ||
    lowerUrl.includes('accounts.google.com/signin/oauth') ||
    lowerUrl.includes('accounts.google.com/serviceauth') ||
    lowerUrl.includes('accounts.youtube.com/accounts')
  ) {
    return true;
  }

  // 2. Microsoft Identity & Live OAuth
  if (
    lowerUrl.includes('login.live.com') ||
    lowerUrl.includes('login.microsoftonline.com')
  ) {
    return true;
  }

  // 3. Apple Sign-In
  if (lowerUrl.includes('appleid.apple.com')) {
    return true;
  }

  // 4. Facebook & Meta OAuth Dialog
  if (
    lowerUrl.includes('facebook.com/dialog/oauth') ||
    (lowerUrl.includes('facebook.com/v') && lowerUrl.includes('/dialog/oauth'))
  ) {
    return true;
  }

  // 5. GitHub & GitLab OAuth Authorize
  if (
    lowerUrl.includes('github.com/login/oauth') ||
    lowerUrl.includes('github.com/sessions/two-factor') ||
    lowerUrl.includes('gitlab.com/oauth')
  ) {
    return true;
  }

  // 6. Marketplace SSO Callback
  if (
    lowerUrl.includes('/login/sso') ||
    lowerUrl.includes('/sso/callback') ||
    lowerUrl.includes('/sso/login')
  ) {
    return true;
  }

  // 7. Pola Parameter OAuth Standar RFC 6749 (Pencocokan Presisi)
  const hasResponseType = lowerUrl.includes('response_type=code') || lowerUrl.includes('response_type=token');
  const hasClientId = lowerUrl.includes('client_id=');
  const hasRedirectUri = lowerUrl.includes('redirect_uri=');

  if (hasResponseType && hasClientId) {
    return true;
  }

  if (hasClientId && hasRedirectUri && (lowerUrl.includes('/oauth') || lowerUrl.includes('/authorize') || lowerUrl.includes('/auth/'))) {
    return true;
  }

  return false;
}

/**
 * Memeriksa apakah URL menggunakan protokol berbahaya
 * @param {string} rawUrl 
 * @returns {boolean}
 */
function isDangerousProtocol(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return DANGEROUS_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch (e) {
    const lower = rawUrl.trim().toLowerCase();
    return lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('file:');
  }
}

/**
 * Memeriksa apakah URL merupakan skema yang diizinkan untuk webview
 * @param {string} rawUrl 
 * @returns {boolean}
 */
function isAllowedProtocol(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase());
  } catch (e) {
    const lower = rawUrl.trim().toLowerCase();
    return lower.startsWith('blob:') || lower.startsWith('data:') || lower.startsWith('about:');
  }
}

/**
 * Memeriksa apakah URL merupakan dokumen, faktur, atau PDF
 * @param {string} rawUrl 
 * @returns {boolean}
 */
function isDocumentOrInvoiceUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const lowerUrl = rawUrl.toLowerCase();
  return lowerUrl.includes('/invoice') ||
    lowerUrl.includes('/faktur') ||
    lowerUrl.includes('/print') ||
    lowerUrl.includes('/cetak') ||
    lowerUrl.includes('/receipt') ||
    lowerUrl.includes('.pdf') ||
    lowerUrl.startsWith('blob:');
}

module.exports = {
  isOAuthUrl,
  isDangerousProtocol,
  isAllowedProtocol,
  isDocumentOrInvoiceUrl,
  ALLOWED_PROTOCOLS,
  DANGEROUS_PROTOCOLS,
  KNOWN_OAUTH_HOSTS
};
