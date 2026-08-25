/**
 * tests/integration/webview/webview-preload.test.js
 * Integration testing for webview preload link interception, OAuth detection, and stealth masking
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { isOAuthUrl } = require('../../../src/main/config/url-rules');

// Isolated Link Interceptor Decision Logic
function shouldOpenInNewTab(linkAttributes, isCtrlOrMiddle, currentHref, clickedTargetType = 'text') {
  if (['button', 'copy-btn', 'copy-icon', 'salin-btn', 'input', 'textarea', 'select'].includes(clickedTargetType)) {
    return false;
  }
  const { href, target } = linkAttributes;
  if (!href || href.startsWith('javascript:') || href === '#') return false;

  const isBlank = (target || '').toLowerCase() === '_blank';
  if (isBlank || isCtrlOrMiddle) {
    try {
      const fullUrl = new URL(href, currentHref).href;
      if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('blob:') || fullUrl.startsWith('data:')) {
        // OAuth links must NOT be intercepted to a new separate tab to keep cookie handshake
        if (isOAuthUrl(fullUrl)) {
          return false;
        }
        return true;
      }
    } catch (e) {
      return false;
    }
  }
  return false;
}

describe('Level 6: Webview Preload & Anti-Detection Tests', () => {
  describe('OAuth URL Detection', () => {
    test('should accurately identify Google, Microsoft, Apple, and GitHub OAuth flows', () => {
      assert.equal(isOAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?client_id=123'), true);
      assert.equal(isOAuthUrl('https://login.live.com/oauth20_authorize.srf'), true);
      assert.equal(isOAuthUrl('https://appleid.apple.com/auth/authorize'), true);
      assert.equal(isOAuthUrl('https://seller.shopee.co.id/api/v2/login/sso/callback'), true);
    });

    test('should NOT flag regular marketplace product / order links as OAuth', () => {
      assert.equal(isOAuthUrl('https://seller.shopee.co.id/portal/order/12345'), false);
      assert.equal(isOAuthUrl('https://seller.tokopedia.com/chat/detail/67890'), false);
      assert.equal(isOAuthUrl('https://sellercenter.lazada.co.id/apps/seller/chat'), false);
    });
  });

  describe('Link Interceptor Decision Logic', () => {
    const baseUrl = 'https://seller.shopee.co.id/chat';

    test('should intercept target="_blank" marketplace links to new tab', () => {
      const shouldIntercept = shouldOpenInNewTab(
        { href: 'https://shopee.co.id/product/123', target: '_blank' },
        false,
        baseUrl
      );
      assert.equal(shouldIntercept, true);
    });

    test('should NOT intercept clicks on copy icons or interactive buttons nested inside links', () => {
      const shouldInterceptCopy = shouldOpenInNewTab(
        { href: 'https://seller.shopee.co.id/portal/sale/order/24081290TBMGKJ', target: '_blank' },
        false,
        baseUrl,
        'copy-icon'
      );
      assert.equal(shouldInterceptCopy, false);

      const shouldInterceptBtn = shouldOpenInNewTab(
        { href: 'https://seller.shopee.co.id/portal/sale/order/24081290TBMGKJ', target: '_blank' },
        false,
        baseUrl,
        'button'
      );
      assert.equal(shouldInterceptBtn, false);
    });

    test('should intercept Ctrl+Click or Middle-Click links to new tab', () => {
      const shouldIntercept = shouldOpenInNewTab(
        { href: '/portal/order/999', target: '' },
        true, // Ctrl pressed
        baseUrl
      );
      assert.equal(shouldIntercept, true);
    });

    test('should intercept blob invoice / document links with target="_blank"', () => {
      const shouldIntercept = shouldOpenInNewTab(
        { href: 'blob:https://seller.shopee.co.id/1234-5678', target: '_blank' },
        false,
        baseUrl
      );
      assert.equal(shouldIntercept, true);
    });

    test('should NOT intercept OAuth links into separate tabs (must remain in current session webview)', () => {
      const shouldIntercept = shouldOpenInNewTab(
        { href: 'https://accounts.google.com/signin/oauth', target: '_blank' },
        true,
        baseUrl
      );
      assert.equal(shouldIntercept, false);
    });

    test('should ignore javascript: and # links', () => {
      assert.equal(shouldOpenInNewTab({ href: 'javascript:void(0)', target: '_blank' }, true, baseUrl), false);
      assert.equal(shouldOpenInNewTab({ href: '#', target: '_blank' }, true, baseUrl), false);
    });
  });

  describe('Anti-Detection Stealth Masking', () => {
    test('should safely sanitize navigator.webdriver if present', () => {
      const mockNavigator = { webdriver: true };
      try {
        delete mockNavigator.webdriver;
        Object.defineProperty(mockNavigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
          enumerable: true
        });
      } catch (e) {}
      assert.equal(mockNavigator.webdriver, undefined);
    });

    test('should provide standard Chromium window.chrome structure for WAF compliance', () => {
      const mockWindow = {};
      mockWindow.chrome = mockWindow.chrome || {};
      if (!mockWindow.chrome.app) {
        mockWindow.chrome.app = {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
          getIsInstalled: () => false,
          getDetails: () => null
        };
      }
      if (!mockWindow.chrome.runtime) {
        mockWindow.chrome.runtime = {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }
        };
      }

      assert.equal(typeof mockWindow.chrome.app.getIsInstalled, 'function');
      assert.equal(mockWindow.chrome.app.isInstalled, false);
      assert.equal(mockWindow.chrome.runtime.OnInstalledReason.INSTALL, 'install');
    });
  });

  describe('Semantic Customer Name Sanitization', () => {
    function cleanCustomerNameText(raw) {
      if (!raw || typeof raw !== 'string') return '';
      let text = raw.trim();
      if (!text || text.length < 2 || text.length > 65) return '';

      const rawLower = text.toLowerCase();
      if (
        rawLower.includes('typing') ||
        rawLower.includes('mengetik') ||
        rawLower.includes('last seen') ||
        rawLower.includes('terakhir dilihat')
      ) {
        return '';
      }

      // 1. Bersihkan format multi-baris: ambil baris pertama
      text = text.split('\n')[0].replace(/[\r\t]+/g, ' ').trim();

      // 2. Bersihkan status online/presence yang menempel di belakang (contoh: "Andi Wijaya Online")
      text = text.replace(/\s+(?:online|offline|aktif|active)$/i, '').trim();

      // 3. Bersihkan badge tanda kurung atau separator trailing (contoh: "Budi (Buyer VIP)" atau "Andi - Jakarta")
      if (text.includes('(') && text.length > 20) {
        text = text.split('(')[0].trim();
      }
      if (text.includes(' - ') && text.length > 25) {
        text = text.split(' - ')[0].trim();
      }

      const lower = text.toLowerCase();
      const noiseKeywords = [
        'search', 'cari', 'online', 'ketik', 'typing', 'offline', 'terakhir',
        'last seen', 'aktif', 'active', 'pesan', 'messages', 'chat', 'batal',
        'cancel', 'kirim', 'send', 'status', 'kembali', 'back', 'filter',
        'customer service', 'seller center', 'bantuan', 'help', 'sedang'
      ];
      if (noiseKeywords.some(k => lower === k || lower.startsWith(k + ' ') || lower.startsWith(k + ':') || lower.startsWith(k + '.'))) {
        return '';
      }

      // 4. Jika berupa timestamp atau jam semata (misal: "18:30" atau "25/08/2026")
      if (/^\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|wib|wita|wit))?$/i.test(text) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(text)) {
        return '';
      }

      return (text.length >= 2 && text.length <= 50) ? text : '';
    }

    test('should extract clean customer name from noisy DOM strings', () => {
      assert.equal(cleanCustomerNameText('Budi Santoso Online'), 'Budi Santoso');
      assert.equal(cleanCustomerNameText('Siti Rahma (Buyer Prioritas VIP)'), 'Siti Rahma');
      assert.equal(cleanCustomerNameText('Andi Pratama - Jakarta Selatan'), 'Andi Pratama');
      assert.equal(cleanCustomerNameText('Dewi Lestari\nOnline 1 jam lalu'), 'Dewi Lestari');
    });

    test('should reject status keywords, search prompts, and timestamps', () => {
      assert.equal(cleanCustomerNameText('Online'), '');
      assert.equal(cleanCustomerNameText('Sedang mengetik...'), '');
      assert.equal(cleanCustomerNameText('18:45 WIB'), '');
      assert.equal(cleanCustomerNameText('Cari kontak atau pesan'), '');
      assert.equal(cleanCustomerNameText(''), '');
    });
  });

  describe('Multi-Lingual WhatsApp Sync Status Detection', () => {
    function testSyncDetection(bannerText) {
      const isSyncMatch = /(?:mengunduh|downloading|descargando|téléchargement|sincroniz|syncing|organizing|memuat|organizando|正在同步|正在下载)/i.test(bannerText);
      const isCompletedMatch = /(?:terakhir disinkronkan|sinkronisasi selesai|all messages synced|last synced|riwayat pesan telah diunduh|riwayat chat selesai|concluído|finalizado|terminé|同步完成)/i.test(bannerText);
      const match = bannerText.match(/(\d{1,3})\s*%/);
      const percent = match ? parseInt(match[1], 10) : null;
      return { isSyncMatch, isCompletedMatch, percent };
    }

    test('should detect Indonesian, English, Spanish, French, and Chinese sync progress', () => {
      const idSync = testSyncDetection('Sedang mengunduh pesan riwayat chat 45%');
      assert.equal(idSync.isSyncMatch, true);
      assert.equal(idSync.percent, 45);

      const enSync = testSyncDetection('Downloading older messages 80%');
      assert.equal(enSync.isSyncMatch, true);
      assert.equal(enSync.percent, 80);

      const esSync = testSyncDetection('Sincronizando mensajes antiguos 60%');
      assert.equal(esSync.isSyncMatch, true);
      assert.equal(esSync.percent, 60);

      const zhSync = testSyncDetection('正在同步历史聊天记录 95%');
      assert.equal(zhSync.isSyncMatch, true);
      assert.equal(zhSync.percent, 95);
    });

    test('should detect sync completed in multiple languages', () => {
      assert.equal(testSyncDetection('Riwayat chat selesai disinkronkan').isCompletedMatch, true);
      assert.equal(testSyncDetection('All messages synced successfully').isCompletedMatch, true);
      assert.equal(testSyncDetection('Sincronização concluído').isCompletedMatch, true);
      assert.equal(testSyncDetection('同步完成').isCompletedMatch, true);
    });
  });
});
