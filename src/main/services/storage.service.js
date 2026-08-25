/**
 * src/main/services/storage.service.js
 * Unified atomic file I/O and persistence for users and stores
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { defaultStores, ROLE_INTEGRITY_SALT } = require('../config/constants');
const vaultService = require('./vault.service');

function getUserDataPath() {
  if (app && typeof app.getPath === 'function') {
    return app.getPath('userData');
  }
  return path.join(process.env.APPDATA || process.env.HOME || '.', 'marketplace-cs-dashboard');
}

function getUsersFilePath() {
  return path.join(getUserDataPath(), 'users.json');
}

function atomicWriteJsonSync(filePath, data) {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
  const bakPath = `${filePath}.bak`;
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, bakPath);
      } catch (e) {}
    }
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error(`Atomic write failed for ${filePath}:`, err);
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (e) {}
    return false;
  }
}

function saveEncryptedJsonSync(filePath, data) {
  try {
    const rawJson = JSON.stringify(data, null, 2);
    const cipher = vaultService.encryptSecret(rawJson);
    const envelope = {
      __vault_version__: 'v1',
      cipher: cipher
    };
    return atomicWriteJsonSync(filePath, envelope);
  } catch (err) {
    console.error(`Failed to save encrypted JSON to ${filePath}:`, err);
    return false;
  }
}

function readEncryptedJsonSync(filePath) {
  const bakPath = `${filePath}.bak`;
  let rawContent = null;
  try {
    if (fs.existsSync(filePath)) {
      rawContent = fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.error(`Error reading ${filePath}, trying backup:`, err);
    try {
      if (fs.existsSync(bakPath)) {
        rawContent = fs.readFileSync(bakPath, 'utf8');
      }
    } catch (bakErr) {
      console.error(`Error reading backup ${bakPath}:`, bakErr);
    }
  }

  if (!rawContent) return null;

  try {
    const parsed = JSON.parse(rawContent);
    // Format Encrypted Envelope
    if (parsed && typeof parsed === 'object' && parsed.__vault_version__ && parsed.cipher) {
      const decryptedStr = vaultService.decryptSecret(parsed.cipher);
      if (decryptedStr) {
        return JSON.parse(decryptedStr);
      }
    }
    // Format Legacy Plaintext JSON
    return parsed;
  } catch (parseErr) {
    // Coba decrypt dari backup jika file utama corrupt
    try {
      if (fs.existsSync(bakPath)) {
        const bakRaw = fs.readFileSync(bakPath, 'utf8');
        const bakParsed = JSON.parse(bakRaw);
        if (bakParsed && typeof bakParsed === 'object' && bakParsed.__vault_version__ && bakParsed.cipher) {
          const decryptedBakStr = vaultService.decryptSecret(bakParsed.cipher);
          if (decryptedBakStr) return JSON.parse(decryptedBakStr);
        }
        return bakParsed;
      }
    } catch (bakErr) {}
    return null;
  }
}

function getStoresFilePath(username) {
  const safeUsername = username ? String(username).trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\.{2,}/g, '_') : '';
  const fileName = safeUsername ? `stores_${safeUsername}.json` : 'stores.json';
  return path.join(getUserDataPath(), fileName);
}

function readStores(username) {
  const filePath = getStoresFilePath(username);
  let loaded = readEncryptedJsonSync(filePath);

  if (!Array.isArray(loaded)) {
    loaded = defaultStores;
    try {
      saveStores(defaultStores, username);
    } catch (err) {
      console.error('Error creating default stores file:', err);
    }
  }

  // Migrasi URL 404 lama (/portal/chat) ke URL resmi Shopee Seller Centre
  if (Array.isArray(loaded)) {
    let updated = false;
    loaded.forEach(s => {
      if (s.marketplace === 'shopee' && (s.url === 'https://seller.shopee.co.id/portal/chat' || s.url === 'https://seller.shopee.co.id/portal/chat/')) {
        s.url = 'https://seller.shopee.co.id/';
        updated = true;
      }
    });
    if (updated) {
      saveStores(loaded, username);
    }
  }

  return loaded;
}

function saveStores(stores, username) {
  const filePath = getStoresFilePath(username);
  return saveEncryptedJsonSync(filePath, stores);
}

function computeRoleSig(username, role, passwordSalt) {
  const cleanUser = String(username || '').toLowerCase().trim();
  const cleanRole = String(role || '').trim();
  const cleanSalt = String(passwordSalt || '');
  return crypto.createHmac('sha256', ROLE_INTEGRITY_SALT).update(`${cleanUser}:${cleanRole}:${cleanSalt}`, 'utf8').digest('hex');
}

function verifyUserRoleSig(u) {
  if (!u || typeof u !== 'object') return false;
  if (!u.roleSig) return false;
  const expected = computeRoleSig(u.username, u.role, u.passwordSalt);
  return u.roleSig === expected;
}

function isUserSuperAdmin(user) {
  if (!user || typeof user !== 'object') return false;
  if (String(user.username || '').toLowerCase() === 'superadmin') return true;
  return user.role === 'Super Admin' && user.isSuperAdmin === true;
}

function readUsers() {
  const usersFilePath = getUsersFilePath();
  let users = readEncryptedJsonSync(usersFilePath);

  if (!Array.isArray(users)) users = [];

  let needsResave = false;

  // 1. Validasi & Sanitasi Setiap Akun Berdasarkan Cryptographic Role Signature
  users = users.map((u, index) => {
    if (!u || typeof u !== 'object') return u;

    const isFirstUser = index === 0;
    const isHardcodedSA = String(u.username || '').toLowerCase() === 'superadmin';

    if (!u.roleSig) {
      const isSA = isFirstUser || u.role === 'Super Admin' || u.isSuperAdmin === true || isHardcodedSA;
      u.role = isSA ? 'Super Admin' : (u.role || 'Customer Service');
      u.isSuperAdmin = isSA;
      u.roleSig = computeRoleSig(u.username, u.role, u.passwordSalt);
      needsResave = true;
    } else {
      const isValidRole = verifyUserRoleSig(u);
      if (!isValidRole) {
        console.warn(`[Security Alert] Unauthorized role tampering detected on user "${u.username}". Reverting to Customer Service.`);
        u.role = 'Customer Service';
        u.isSuperAdmin = false;
        u.roleSig = computeRoleSig(u.username, 'Customer Service', u.passwordSalt);
        needsResave = true;
      } else {
        u.isSuperAdmin = (u.role === 'Super Admin') || isHardcodedSA;
      }
    }

    if (u.isSuperAdmin) {
      u.role = 'Super Admin';
      if (!u.avatarIcon || u.avatarIcon === '👩‍💼') u.avatarIcon = '👑';
      if (!u.avatarColor || u.avatarColor === '#df1683') u.avatarColor = '#e11d48';
    } else {
      u.role = 'Customer Service';
      if (!u.avatarIcon || u.avatarIcon === '👑') u.avatarIcon = '👩‍💼';
      if (!u.avatarColor || u.avatarColor === '#e11d48') u.avatarColor = '#df1683';
    }

    return u;
  });

  // 2. Safety Net: Pastikan SELALU ada minimal 1 Super Admin di sistem
  const hasSuperAdmin = users.some(u => isUserSuperAdmin(u));
  if (!hasSuperAdmin && users.length > 0) {
    console.warn('[Security Notice] No active Super Admin found. Preserving/Promoting primary founder account to Super Admin.');
    users[0].role = 'Super Admin';
    users[0].isSuperAdmin = true;
    users[0].avatarIcon = '👑';
    users[0].avatarColor = '#e11d48';
    users[0].roleSig = computeRoleSig(users[0].username, 'Super Admin', users[0].passwordSalt);
    needsResave = true;
  }

  if (needsResave) {
    try {
      saveUsers(users);
    } catch (e) {}
  }

  return users;
}

function saveUsers(users) {
  if (!Array.isArray(users)) users = [];
  const sanitized = users.map(u => {
    const isSA = (u.role === 'Super Admin') || String(u.username || '').toLowerCase() === 'superadmin';
    u.role = isSA ? 'Super Admin' : 'Customer Service';
    u.isSuperAdmin = isSA;
    u.roleSig = computeRoleSig(u.username, u.role, u.passwordSalt);
    return u;
  });
  return saveEncryptedJsonSync(getUsersFilePath(), sanitized);
}

function isValidPartition(partition) {
  if (!partition || typeof partition !== 'string') return false;
  const clean = partition.trim();
  return /^persist:[a-zA-Z0-9_-]{1,120}$/.test(clean);
}

function safeDeletePartitionDisk(part) {
  try {
    if (!isValidPartition(part)) return;
    const rawName = part.replace(/^persist:/, '');
    const safeFolderName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!safeFolderName) return;

    const partitionsBaseDir = path.join(getUserDataPath(), 'Partitions');
    const targetDir = path.join(partitionsBaseDir, safeFolderName);

    const relative = path.relative(partitionsBaseDir, targetDir);
    if (!relative.startsWith('..') && !path.isAbsolute(relative) && fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Error safe deleting partition disk:', e);
  }
}

function createEmergencyRollbackSnapshot(currentVersion, targetVersion) {
  try {
    const userData = getUserDataPath();
    const backupDir = path.join(userData, 'rollback_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const snapshot = {
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      fromVersion: currentVersion || 'unknown',
      toVersion: targetVersion || 'unknown',
      files: {}
    };

    // Backup all critical json files
    const fileNames = ['users.json', 'stores.json', 'feedback_tickets.json'];
    // Check if there are user-specific stores
    try {
      const allFiles = fs.readdirSync(userData);
      allFiles.forEach(f => {
        if (f.startsWith('stores_') && f.endsWith('.json')) {
          fileNames.push(f);
        }
      });
    } catch (e) {}

    fileNames.forEach(fn => {
      const p = path.join(userData, fn);
      if (fs.existsSync(p)) {
        try {
          snapshot.files[fn] = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) {
          snapshot.files[fn] = fs.readFileSync(p, 'utf8');
        }
      }
    });

    const safeTarget = String(targetVersion || 'old').replace(/[^a-zA-Z0-9._-]/g, '_');
    const snapshotFileName = `snapshot_v${currentVersion}_to_v${safeTarget}_${Date.now()}.json`;
    const snapshotPath = path.join(backupDir, snapshotFileName);

    atomicWriteJsonSync(snapshotPath, snapshot);
    return { success: true, snapshotPath, snapshotFileName };
  } catch (err) {
    console.error('Failed to create emergency rollback snapshot:', err);
    return { success: false, error: err.message };
  }
}

function getVersionTrailFilePath() {
  return path.join(getUserDataPath(), 'version_trail.json');
}

function getVersionTrail() {
  try {
    const p = getVersionTrailFilePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading version_trail.json:', e);
  }
  return { currentVersion: null, previousStableVersion: null, history: [] };
}

function recordVersionLaunch(currentVersion) {
  try {
    if (!currentVersion) return getVersionTrail();
    const trail = getVersionTrail();
    if (!Array.isArray(trail.history)) {
      trail.history = [];
    }

    if (!trail.currentVersion) {
      trail.currentVersion = currentVersion;
      if (!trail.history.includes(currentVersion)) {
        trail.history.push(currentVersion);
      }
    } else if (trail.currentVersion !== currentVersion) {
      trail.previousStableVersion = trail.currentVersion;
      trail.currentVersion = currentVersion;
      if (!trail.history.includes(currentVersion)) {
        trail.history.push(currentVersion);
      }
    }

    trail.updatedAt = new Date().toISOString();
    atomicWriteJsonSync(getVersionTrailFilePath(), trail);
    return trail;
  } catch (e) {
    console.error('Error recording version launch:', e);
    return { currentVersion, previousStableVersion: null, history: [currentVersion] };
  }
}

module.exports = {
  getUserDataPath,
  getUsersFilePath,
  atomicWriteJsonSync,
  saveEncryptedJsonSync,
  readEncryptedJsonSync,
  getStoresFilePath,
  readStores,
  saveStores,
  computeRoleSig,
  verifyUserRoleSig,
  isUserSuperAdmin,
  readUsers,
  saveUsers,
  isValidPartition,
  safeDeletePartitionDisk,
  createEmergencyRollbackSnapshot,
  getVersionTrail,
  recordVersionLaunch
};

