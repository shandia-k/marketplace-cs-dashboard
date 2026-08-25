/**
 * src/main/services/vault.service.js
 * OS-Native Cryptographic Vault Service using Electron safeStorage (Windows DPAPI)
 * 
 * Fitur:
 * 1. Menghilangkan seluruh ketergantungan pada kunci statis hardcoded di source code.
 * 2. Menggunakan Windows DPAPI (CryptProtectData / CryptUnprotectData) yang terikat langsung
 *    pada profil pengguna Windows & hardware lokal (tetap bekerja aman meski Windows tanpa password).
 * 3. Dual-Layer Fallback: Jika DPAPI tidak tersedia (misal Linux tanpa Keyring), menggunakan
 *    kunci yang diturunkan dari Machine Profile + Random Salt 16-byte.
 * 4. Transparent Zero-Downtime Auto-Migration dari format legacy ('enc:v1:' dan Base64) ke 'dpapi:v1:'.
 */

const { safeStorage } = require('electron');
const crypto = require('crypto');
const os = require('os');

const DPAPI_PREFIX = 'dpapi:v1:';
const LEGACY_VAULT_PREFIX = 'enc:v1:';

/**
 * Membangkitkan kunci fallback berbasis profil mesin lokal jika safeStorage tidak aktif
 */
function getMachineDerivedKey(saltBuf) {
  const machineIdentity = `${os.hostname()}_${os.userInfo()?.username || 'user'}_${os.platform()}_${os.homedir()}`;
  return crypto.scryptSync(machineIdentity, saltBuf, 32);
}

/**
 * Enkripsi rahasia menggunakan Windows DPAPI (safeStorage)
 * @param {string} plaintext 
 * @returns {string} Ciphertext berawalan 'dpapi:v1:' atau 'enc:v1:'
 */
function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return '';

  try {
    // 1. Prioritas Utama: OS Native DPAPI (Windows / macOS Keychain)
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      const encryptedBuf = safeStorage.encryptString(plaintext);
      return `${DPAPI_PREFIX}${encryptedBuf.toString('base64')}`;
    }
  } catch (e) {
    console.warn('[VaultService] safeStorage encryption fallback:', e.message);
  }

  // 2. Fallback: Machine-Bound AES-256-GCM
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = getMachineDerivedKey(salt);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${LEGACY_VAULT_PREFIX}${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[VaultService] Fallback encryption failed:', err);
    return '';
  }
}

/**
 * Dekripsi rahasia dengan backward compatibility & auto-migration support
 * @param {string} ciphertext 
 * @param {string} [hostContext] 
 * @returns {string} Plaintext hasil dekripsi
 */
function decryptSecret(ciphertext, hostContext = '') {
  if (!ciphertext || typeof ciphertext !== 'string') return '';

  // 1. Format Native DPAPI ('dpapi:v1:...')
  if (ciphertext.startsWith(DPAPI_PREFIX)) {
    try {
      if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        const base64Data = ciphertext.slice(DPAPI_PREFIX.length);
        const buf = Buffer.from(base64Data, 'base64');
        return safeStorage.decryptString(buf);
      }
    } catch (e) {
      console.warn('[VaultService] DPAPI decryption failed:', e.message);
      return '';
    }
  }

  // 2. Format AES-256-GCM ('enc:v1:...')
  if (ciphertext.startsWith(LEGACY_VAULT_PREFIX)) {
    try {
      const parts = ciphertext.slice(LEGACY_VAULT_PREFIX.length).split(':');
      if (parts.length === 4) {
        const [saltHex, ivHex, tagHex, cipherHex] = parts;
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');

        // Kunci machine-bound (Zero Static Passphrase)
        const key = getMachineDerivedKey(salt);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    } catch (e) {
      return '';
    }
  }

  // 3. Format Legacy Base64 (Transisi Terakhir)
  try {
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf8');
    if (decoded && /^[\x20-\x7E\r\n\t]+$/.test(decoded)) {
      return decoded;
    }
  } catch (e) {}

  return ciphertext;
}

// ── CENTRAL ENCRYPTED AUTOFILL CREDENTIAL STORE (Zero Webview localStorage) ──
const path = require('path');
const fs = require('fs');

function getAutofillVaultFilePath() {
  const userData = (typeof process !== 'undefined' && process.env.APPDATA)
    ? path.join(process.env.APPDATA, 'marketplace-cs-dashboard')
    : path.join(os.homedir(), '.marketplace-cs-dashboard');
  return path.join(userData, 'autofill_vault.json');
}

function readAutofillVaultSync() {
  const filePath = getAutofillVaultFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.__vault_version__ && parsed.cipher) {
        const decryptedStr = decryptSecret(parsed.cipher);
        if (decryptedStr) return JSON.parse(decryptedStr);
      }
      return parsed || {};
    }
  } catch (e) {
    console.warn('[VaultService] Failed reading autofill vault:', e.message);
  }
  return {};
}

function saveAutofillVaultSync(data) {
  const filePath = getAutofillVaultFilePath();
  try {
    const rawJson = JSON.stringify(data, null, 2);
    const cipher = encryptSecret(rawJson);
    const envelope = {
      __vault_version__: 'v1',
      cipher: cipher
    };
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[VaultService] Failed saving autofill vault:', e.message);
    return false;
  }
}

function getAutofillEntries(host) {
  if (!host) return [];
  const cleanHost = String(host).toLowerCase().trim();
  const allVault = readAutofillVaultSync();
  const entries = allVault[cleanHost] || [];
  return Array.isArray(entries) ? entries : [];
}

function saveAutofillEntry(payload) {
  const { host, value, fieldType = 'text', password = '', encPass = '' } = payload || {};
  if (!host || !value) return false;
  const cleanHost = String(host).toLowerCase().trim();
  const cleanValue = String(value).trim();
  if (cleanValue.length < 3 || cleanValue.length > 100) return false;

  const allVault = readAutofillVaultSync();
  let entries = allVault[cleanHost] || [];
  if (!Array.isArray(entries)) entries = [];

  const existing = entries.find(e => e && e.value && e.value.toLowerCase() === cleanValue.toLowerCase());
  const finalEncPass = password ? encryptSecret(password) : (encPass || existing?.pass || '');

  entries = entries.filter(e => e && e.value && e.value.toLowerCase() !== cleanValue.toLowerCase());
  entries.unshift({
    value: cleanValue,
    pass: finalEncPass,
    fieldType,
    time: Date.now()
  });
  if (entries.length > 10) entries = entries.slice(0, 10);
  allVault[cleanHost] = entries;
  return saveAutofillVaultSync(allVault);
}

function deleteAutofillEntry(payload) {
  const { host, value } = payload || {};
  if (!host || !value) return false;
  const cleanHost = String(host).toLowerCase().trim();
  const cleanValue = String(value).trim();

  const allVault = readAutofillVaultSync();
  let entries = allVault[cleanHost] || [];
  if (!Array.isArray(entries)) return true;

  entries = entries.filter(e => e && e.value !== cleanValue);
  allVault[cleanHost] = entries;
  return saveAutofillVaultSync(allVault);
}

module.exports = {
  encryptSecret,
  decryptSecret,
  isEncryptionAvailable: () => {
    try {
      return safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable();
    } catch (e) {
      return false;
    }
  },
  DPAPI_PREFIX,
  LEGACY_VAULT_PREFIX,
  getAutofillEntries,
  saveAutofillEntry,
  deleteAutofillEntry
};
