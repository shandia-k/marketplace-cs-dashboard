/**
 * tests/unit/security/telegram-auth.test.js
 * Unit testing for Telegram Mini App initData cryptographic HMAC-SHA256 validation
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

/**
 * Node.js implementation of Telegram WebApp initData validator
 * (Mathematically identical to Google Apps Script validateTelegramInitData)
 */
function validateTelegramInitDataNode(initData, botToken) {
  if (!initData || typeof initData !== 'string') {
    return { valid: false, error: 'Missing initData' };
  }

  try {
    const params = {};
    const pairs = initData.split('&');
    let hash = '';

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].split('=');
      const key = decodeURIComponent(pair[0] || '');
      const value = decodeURIComponent(pair.slice(1).join('=') || '');
      if (key === 'hash') {
        hash = value;
      } else if (key) {
        params[key] = value;
      }
    }

    if (!hash) {
      return { valid: false, error: 'Missing hash in initData' };
    }

    // 1. Susun data_check_string (urutan abjad key=value\n)
    const sortedKeys = Object.keys(params).sort();
    const dataCheckArr = [];
    for (let i = 0; i < sortedKeys.length; i++) {
      const k = sortedKeys[i];
      dataCheckArr.push(k + '=' + params[k]);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // 2. Hitung secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // 3. Hitung calculated_hash = HMAC_SHA256(dataCheckString, secretKey)
    const calculatedHashHex = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // 4. Bandingkan hash
    if (calculatedHashHex.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false, error: 'Invalid signature hash' };
    }

    // 5. Cek auth_date (mencegah replay attack lebih dari 48 jam)
    const authDateSeconds = parseInt(params.auth_date, 10);
    if (!isNaN(authDateSeconds)) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - authDateSeconds > 172800) {
        return { valid: false, error: 'initData expired' };
      }
    }

    let parsedUser = null;
    if (params.user) {
      try {
        parsedUser = JSON.parse(params.user);
      } catch (e) {}
    }

    return {
      valid: true,
      user: parsedUser,
      authDate: authDateSeconds ? new Date(authDateSeconds * 1000) : null
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Helper to generate valid signed Telegram initData for tests
 */
function createSignedTelegramInitData(params, botToken) {
  const sortedKeys = Object.keys(params).sort();
  const dataCheckString = sortedKeys.map(k => `${k}=${params[k]}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  const queryParts = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`);
  queryParts.push(`hash=${hash}`);
  return queryParts.join('&');
}

describe('Level 2: Telegram WebApp initData Cryptographic HMAC Authentication Tests', () => {
  const testBotToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567';

  test('should successfully validate authentic Telegram initData signature', () => {
    const userPayload = JSON.stringify({ id: 987654321, first_name: 'Shandia', username: 'shandiak' });
    const authDate = Math.floor(Date.now() / 1000);

    const validInitData = createSignedTelegramInitData({
      auth_date: String(authDate),
      query_id: 'AAHdF6IQAAAAAN0XohDZP8kU',
      user: userPayload
    }, testBotToken);

    const result = validateTelegramInitDataNode(validInitData, testBotToken);
    assert.equal(result.valid, true);
    assert.equal(result.user.id, 987654321);
    assert.equal(result.user.username, 'shandiak');
  });

  test('should reject forged or modified payload parameters (Anti-Tampering Guard)', () => {
    const userPayload = JSON.stringify({ id: 987654321, first_name: 'Shandia', username: 'shandiak' });
    const authDate = Math.floor(Date.now() / 1000);

    const validInitData = createSignedTelegramInitData({
      auth_date: String(authDate),
      query_id: 'AAHdF6IQAAAAAN0XohDZP8kU',
      user: userPayload
    }, testBotToken);

    // Modifikasi 1 karakter parameter (user ID diganti menjadi hacker)
    const tamperedInitData = validInitData.replace('987654321', '111111111');

    const result = validateTelegramInitDataNode(tamperedInitData, testBotToken);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'Invalid signature hash');
  });

  test('should reject initData signed with wrong bot token', () => {
    const userPayload = JSON.stringify({ id: 987654321, first_name: 'Shandia', username: 'shandiak' });
    const authDate = Math.floor(Date.now() / 1000);

    const validInitData = createSignedTelegramInitData({
      auth_date: String(authDate),
      user: userPayload
    }, testBotToken);

    const result = validateTelegramInitDataNode(validInitData, 'WRONG_BOT_TOKEN_999');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'Invalid signature hash');
  });

  test('should reject expired initData older than 48 hours (Anti-Replay Attack)', () => {
    const userPayload = JSON.stringify({ id: 987654321, first_name: 'Shandia', username: 'shandiak' });
    const oldAuthDate = Math.floor(Date.now() / 1000) - (200000); // ~55 jam lalu

    const expiredInitData = createSignedTelegramInitData({
      auth_date: String(oldAuthDate),
      user: userPayload
    }, testBotToken);

    const result = validateTelegramInitDataNode(expiredInitData, testBotToken);
    assert.equal(result.valid, false);
    assert.equal(result.error, 'initData expired');
  });
});
