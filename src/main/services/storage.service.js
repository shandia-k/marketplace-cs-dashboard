/**
 * src/main/services/storage.service.js
 * Unified atomic file I/O and persistence for users and stores
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { defaultStores, ROLE_INTEGRITY_SALT } = require('../config/constants');

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

function getStoresFilePath(username) {
  const safeUsername = username ? String(username).trim().replace(/[/\\?%*:|"<>]/g, '_').replace(/\.{2,}/g, '_') : '';
  const fileName = safeUsername ? `stores_${safeUsername}.json` : 'stores.json';
  return path.join(getUserDataPath(), fileName);
}

function readStores(username) {
  const filePath = getStoresFilePath(username);
  const bakPath = `${filePath}.bak`;
  let loaded = null;
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      loaded = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stores, trying backup:', err);
    try {
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf8');
        loaded = JSON.parse(bakData);
      }
    } catch (bakErr) {
      console.error('Error reading stores backup:', bakErr);
    }
  }

  if (!Array.isArray(loaded)) {
    loaded = defaultStores;
    try {
      atomicWriteJsonSync(filePath, defaultStores);
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
  return atomicWriteJsonSync(filePath, stores);
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
  let users = [];
  const usersFilePath = getUsersFilePath();
  const bakPath = `${usersFilePath}.bak`;

  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      users = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading users, trying backup:', err);
    try {
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf8');
        users = JSON.parse(bakData);
      }
    } catch (bakErr) {
      console.error('Error reading users backup:', bakErr);
    }
    users = [];
  }

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
  return atomicWriteJsonSync(getUsersFilePath(), sanitized);
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

module.exports = {
  getUserDataPath,
  getUsersFilePath,
  atomicWriteJsonSync,
  getStoresFilePath,
  readStores,
  saveStores,
  computeRoleSig,
  verifyUserRoleSig,
  isUserSuperAdmin,
  readUsers,
  saveUsers,
  isValidPartition,
  safeDeletePartitionDisk
};
