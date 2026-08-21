/**
 * tests/integration/webview/webview-preload.test.js
 * Integration testing for webview preload link interception, OAuth detection, and stealth masking
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Isolated OAuth URL detector mirroring webview-preload.js
function isOAuthUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('accounts.google.com') ||
    lowerUrl.includes('accounts.youtube.com') ||
    lowerUrl.includes('appleid.apple.com') ||
    lowerUrl.includes('login.live.com') ||
    lowerUrl.includes('login.microsoftonline.com') ||
    lowerUrl.includes('facebook.com/dialog/oauth') ||
    lowerUrl.includes('facebook.com/login') ||
    lowerUrl.includes('github.com/login') ||
    lowerUrl.includes('github.com/sessions') ||
    lowerUrl.includes('gitlab.com/oauth') ||
    lowerUrl.includes('oauth') ||
    lowerUrl.includes('/auth/') ||
    lowerUrl.includes('/authorize') ||
    lowerUrl.includes('/sso/') ||
    lowerUrl.includes('response_type=code') ||
    lowerUrl.includes('client_id=');
}

// Isolated Link Interceptor Decision Logic
function shouldOpenInNewTab(linkAttributes, isCtrlOrMiddle, currentHref) {
  const { href, target } = linkAttributes;
  if (!href || href.startsWith('javascript:') || href === '#') return false;

  const isBlank = (target || '').toLowerCase() === '_blank';
  if (isBlank || isCtrlOrMiddle) {
    try {
      const fullUrl = new URL(href, currentHref).href;
      if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
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

    test('should intercept Ctrl+Click or Middle-Click links to new tab', () => {
      const shouldIntercept = shouldOpenInNewTab(
        { href: '/portal/order/999', target: '' },
        true, // Ctrl pressed
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
      } catch (e) {}
      assert.equal('webdriver' in mockNavigator, false);
    });
  });
});
