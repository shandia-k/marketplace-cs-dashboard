/**
 * src/main/services/auth.service.js
 * User authentication, cryptography, role verification, and admin audit service
 */

const crypto = require('crypto');
const fs = require('fs');
const { session } = require('electron');
const {
  readUsers,
  saveUsers,
  readStores,
  saveStores,
  getStoresFilePath,
  isUserSuperAdmin,
  isValidPartition,
  safeDeletePartitionDisk
} = require('./storage.service');

let currentActiveSession = null;
const failedResetAttempts = new Map(); // username -> { count: number, lockedUntil: timestamp }

function getActiveSession() {
  return currentActiveSession;
}

function setActiveSession(sess) {
  currentActiveSession = sess;
}

function clearActiveSession() {
  currentActiveSession = null;
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash password menggunakan Scrypt dengan cryptographic salt.
 * Menjamin tidak ada hash baru yang dibuat tanpa salt.
 */
function hashPassword(password, salt) {
  if (!password) return '';
  const effectiveSalt = salt || generateSalt();
  return crypto.scryptSync(password, effectiveSalt, 32).toString('hex');
}

/**
 * Verifikasi password dengan timing-safe comparison.
 * Mendukung hash scrypt bertabur salt dan legacy unsalted SHA-256 untuk auto-migrasi.
 */
function verifyPassword(password, storedHash, storedSalt) {
  if (!password || !storedHash) return false;
  try {
    if (storedSalt) {
      const computed = hashPassword(password, storedSalt);
      const computedBuf = Buffer.from(computed, 'hex');
      const storedBuf = Buffer.from(storedHash, 'hex');
      if (computedBuf.length !== storedBuf.length) return false;
      return crypto.timingSafeEqual(computedBuf, storedBuf);
    }
    // Fallback verifikasi legacy unsalted SHA-256 (hanya untuk proses auto-migrasi ke scrypt saat login)
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    const legacyBuf = Buffer.from(legacyHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (legacyBuf.length === storedBuf.length) {
      return crypto.timingSafeEqual(legacyBuf, storedBuf);
    }
    return legacyHash === storedHash;
  } catch (e) {
    return false;
  }
}

function getUsers() {
  const users = readUsers();
  return users.map(u => {
    const isSA = isUserSuperAdmin(u);
    return {
      username: u.username,
      displayName: u.displayName || u.username,
      role: isSA ? 'Super Admin' : 'Customer Service',
      isSuperAdmin: isSA,
      avatarColor: u.avatarColor || (isSA ? '#e11d48' : '#df1683'),
      avatarIcon: u.avatarIcon || (isSA ? '👑' : '👩‍💼'),
      createdAt: u.createdAt || null
    };
  });
}

function getUserProfile(username) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  const isSA = isUserSuperAdmin(user);
  return {
    success: true,
    user: {
      username: user.username,
      displayName: user.displayName || user.username,
      role: isSA ? 'Super Admin' : 'Customer Service',
      isSuperAdmin: isSA,
      avatarColor: user.avatarColor || (isSA ? '#e11d48' : '#df1683'),
      avatarIcon: user.avatarIcon || (isSA ? '👑' : '👩‍💼'),
      autoLockMinutes: user.autoLockMinutes || 0,
      hasSecurityQuestion: !!user.securityQuestion,
      securityQuestion: user.securityQuestion || null,
      createdAt: user.createdAt || null
    }
  };
}

function createUser({ username, password, displayName, role, avatarColor, avatarIcon, securityQuestion, securityAnswer, adminApprovalPin }) {
  const users = readUsers();
  const cleanDisplayName = String(displayName || username || '').trim();
  if (!cleanDisplayName) return { success: false, error: 'Nama pengguna tidak boleh kosong' };

  let cleanUsername = String(username || '').trim();
  if (!cleanUsername) {
    const base = cleanDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'cs';
    let candidate = base;
    let counter = 2;
    while (users.some(u => u.username.toLowerCase() === candidate.toLowerCase())) {
      candidate = `${base}_${counter}`;
      counter++;
    }
    cleanUsername = candidate;
  } else {
    if (users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      return { success: false, error: 'Nama pengguna sudah digunakan' };
    }
  }

  const isFirstUser = users.length === 0;
  const isSuperAdminRequested = role === 'Super Admin' || cleanUsername.toLowerCase() === 'superadmin';

  if (isSuperAdminRequested && !isFirstUser) {
    const superAdmins = users.filter(u => isUserSuperAdmin(u));
    const isApproved = superAdmins.some(sa => verifyPassword(adminApprovalPin, sa.passwordHash, sa.passwordSalt));
    if (!isApproved) {
      return { success: false, error: 'PIN Otorisasi Super Admin salah atau tidak valid untuk membuat akun Super Admin baru.' };
    }
  }

  const isSuperAdminRole = isFirstUser || isSuperAdminRequested;
  const pwdSalt = generateSalt();
  const secAnswerSalt = securityAnswer ? generateSalt() : null;

  const newUser = {
    username: cleanUsername,
    displayName: cleanDisplayName,
    role: isSuperAdminRole ? 'Super Admin' : (role || 'Customer Service'),
    isSuperAdmin: isSuperAdminRole,
    avatarColor: avatarColor || (isSuperAdminRole ? '#e11d48' : '#df1683'),
    avatarIcon: avatarIcon || (isSuperAdminRole ? '👑' : '👩‍💼'),
    passwordHash: hashPassword(password, pwdSalt),
    passwordSalt: pwdSalt,
    securityQuestion: securityQuestion || null,
    securityAnswerHash: securityAnswer ? hashPassword(securityAnswer.toLowerCase().trim(), secAnswerSalt) : null,
    securityAnswerSalt: secAnswerSalt,
    autoLockMinutes: 0,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return {
    success: true,
    user: {
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      isSuperAdmin: newUser.isSuperAdmin,
      avatarColor: newUser.avatarColor,
      avatarIcon: newUser.avatarIcon
    }
  };
}

function updateUserProfile({ username, displayName, avatarColor, avatarIcon, autoLockMinutes }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };

  if (displayName !== undefined) user.displayName = String(displayName).trim() || user.username;
  if (avatarColor !== undefined) user.avatarColor = avatarColor;
  if (avatarIcon !== undefined) user.avatarIcon = avatarIcon;
  if (autoLockMinutes !== undefined) user.autoLockMinutes = Math.max(0, parseInt(autoLockMinutes, 10) || 0);

  saveUsers(users);
  const isSA = isUserSuperAdmin(user);
  return {
    success: true,
    user: {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isSuperAdmin: isSA,
      avatarColor: user.avatarColor,
      avatarIcon: user.avatarIcon,
      autoLockMinutes: user.autoLockMinutes
    }
  };
}

async function deleteUser({ usernameToDelete, requestingUsername, password }) {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN verifikasi salah. Tindakan dibatalkan.' };
  }

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang memiliki hak untuk menghapus akun pengguna.' };
  }

  const targetUser = users.find(u => u.username === usernameToDelete);
  if (targetUser && isUserSuperAdmin(targetUser)) {
    const superAdminCount = users.filter(u => isUserSuperAdmin(u)).length;
    if (superAdminCount <= 1) {
      return { success: false, error: 'Akun Super Admin utama tidak dapat dihapus (harus ada minimal 1 Super Admin).' };
    }
  }

  if (users.length <= 1) {
    return { success: false, error: 'Tidak dapat menghapus satu-satunya akun yang ada.' };
  }

  const deleteIndex = users.findIndex(u => u.username === usernameToDelete);
  if (deleteIndex === -1) return { success: false, error: 'Akun yang akan dihapus tidak ditemukan' };

  users.splice(deleteIndex, 1);
  saveUsers(users);

  try {
    const userStores = readStores(usernameToDelete);
    const partitions = new Set();
    userStores.forEach(s => {
      if (usernameToDelete && s.id) {
        partitions.add(`persist:user_${usernameToDelete}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      if (!isValidPartition(part)) continue;
      try {
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData();
        safeDeletePartitionDisk(part);
      } catch (e) {}
    }
  } catch (e) {
    console.error('Error clearing sessions for deleted user:', e);
  }

  try {
    const storePath = getStoresFilePath(usernameToDelete);
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  } catch (err) {
    console.error('Error deleting user stores file:', err);
  }

  return { success: true };
}

function adminResetUserPin({ requestingUsername, password, targetUsername, newPin }) {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat mereset PIN pengguna.' };
  }

  const targetUser = users.find(u => u.username === targetUsername);
  if (!targetUser) return { success: false, error: 'Pengguna tujuan tidak ditemukan.' };

  const cleanPin = String(newPin || '').trim();
  if (!cleanPin) return { success: false, error: 'PIN baru tidak boleh kosong.' };

  const newSalt = generateSalt();
  targetUser.passwordSalt = newSalt;
  targetUser.passwordHash = hashPassword(cleanPin, newSalt);
  saveUsers(users);

  return { success: true, message: `PIN untuk "${targetUser.displayName || targetUser.username}" berhasil direset.` };
}

async function adminClearUserSession({ requestingUsername, password, targetUsername }) {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat membersihkan sesi pengguna.' };
  }

  const targetUser = users.find(u => u.username === targetUsername);
  if (!targetUser) return { success: false, error: 'Pengguna tujuan tidak ditemukan.' };

  try {
    const stores = readStores(targetUsername);
    const partitions = new Set();

    stores.forEach(s => {
      if (targetUsername && s.id) {
        partitions.add(`persist:user_${targetUsername}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      if (!isValidPartition(part)) continue;
      try {
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData();
        safeDeletePartitionDisk(part);
      } catch (e) {}
    }

    return {
      success: true,
      message: `Seluruh sesi, cookies, dan cache toko milik "${targetUser.displayName || targetUser.username}" berhasil dibersihkan total.`
    };
  } catch (err) {
    return { success: false, error: 'Gagal membersihkan sesi: ' + err.message };
  }
}

async function adminChangeUserRole({ requestingUsername, password, targetUsername, newRole }) {
  const users = readUsers();
  const cleanReqUser = String(requestingUsername || '').trim();
  const reqUser = users.find(u => u.username.toLowerCase() === cleanReqUser.toLowerCase());
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }
  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat mengubah role pengguna.' };
  }

  const cleanTarget = String(targetUsername || '').trim();
  const targetUser = users.find(u => u.username.toLowerCase() === cleanTarget.toLowerCase());
  if (!targetUser) return { success: false, error: 'Pengguna target tidak ditemukan.' };

  const targetIsSuperAdmin = isUserSuperAdmin(targetUser);
  const isPromotingToSuperAdmin = newRole === 'Super Admin';

  if (targetIsSuperAdmin && !isPromotingToSuperAdmin) {
    const superAdminCount = users.filter(u => isUserSuperAdmin(u)).length;
    if (superAdminCount <= 1) {
      return { success: false, error: 'Tidak dapat menurunkan role satu-satunya Super Admin (harus ada minimal 1 Super Admin).' };
    }
  }

  targetUser.role = isPromotingToSuperAdmin ? 'Super Admin' : 'Customer Service';
  targetUser.isSuperAdmin = isPromotingToSuperAdmin;
  if (isPromotingToSuperAdmin) {
    targetUser.avatarIcon = '👑';
    targetUser.avatarColor = '#e11d48';
  } else {
    targetUser.avatarIcon = '👩‍💼';
    targetUser.avatarColor = '#df1683';
  }
  saveUsers(users);

  return {
    success: true,
    message: `Role untuk "${targetUser.displayName || targetUser.username}" berhasil diubah menjadi ${targetUser.role}.`,
    user: {
      username: targetUser.username,
      displayName: targetUser.displayName,
      role: targetUser.role,
      isSuperAdmin: targetUser.isSuperAdmin
    }
  };
}

async function adminCreateUser({ requestingUsername, password, newUsername, newDisplayName, newRole, newPassword, avatarColor, avatarIcon, securityQuestion, securityAnswer }) {
  const users = readUsers();
  const cleanReqUser = String(requestingUsername || '').trim();
  const reqUser = users.find(u => u.username.toLowerCase() === cleanReqUser.toLowerCase());
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }
  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat menambahkan pengguna baru dari panel admin.' };
  }

  const cleanNewDisplayName = String(newDisplayName || newUsername || '').trim();
  if (!cleanNewDisplayName) return { success: false, error: 'Nama pengguna tidak boleh kosong' };

  let cleanNewUser = String(newUsername || '').trim();
  if (!cleanNewUser) {
    const base = cleanNewDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'cs';
    let candidate = base;
    let counter = 2;
    while (users.some(u => u.username.toLowerCase() === candidate.toLowerCase())) {
      candidate = `${base}_${counter}`;
      counter++;
    }
    cleanNewUser = candidate;
  } else {
    if (users.find(u => u.username.toLowerCase() === cleanNewUser.toLowerCase())) {
      return { success: false, error: 'Nama pengguna sudah digunakan' };
    }
  }

  const cleanNewPin = String(newPassword || '').trim();
  if (!cleanNewPin) return { success: false, error: 'PIN baru tidak boleh kosong' };

  const isSuperAdminRole = newRole === 'Super Admin';
  const pwdSalt = generateSalt();
  const secAnswerSalt = securityAnswer ? generateSalt() : null;

  const newUser = {
    username: cleanNewUser,
    displayName: cleanNewDisplayName,
    role: isSuperAdminRole ? 'Super Admin' : 'Customer Service',
    isSuperAdmin: isSuperAdminRole,
    avatarColor: avatarColor || (isSuperAdminRole ? '#e11d48' : '#df1683'),
    avatarIcon: avatarIcon || (isSuperAdminRole ? '👑' : '👩‍💼'),
    passwordHash: hashPassword(cleanNewPin, pwdSalt),
    passwordSalt: pwdSalt,
    securityQuestion: securityQuestion || null,
    securityAnswerHash: securityAnswer ? hashPassword(securityAnswer.toLowerCase().trim(), secAnswerSalt) : null,
    securityAnswerSalt: secAnswerSalt,
    autoLockMinutes: 0,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);

  return {
    success: true,
    message: `Akun "${newUser.displayName}" (${newUser.role}) berhasil dibuat!`,
    user: {
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      isSuperAdmin: newUser.isSuperAdmin
    }
  };
}

async function adminGetFullAudit(payload = {}) {
  const { requestingUsername, password } = (typeof payload === 'object' && payload !== null) ? payload : { requestingUsername: payload };
  const cleanUsername = String(requestingUsername || '').trim();
  const users = readUsers();
  const reqUser = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang memiliki hak akses panel audit.' };
  }

  const hasValidActiveSession = currentActiveSession && currentActiveSession.username.toLowerCase() === cleanUsername.toLowerCase() && currentActiveSession.isSuperAdmin;
  if (password) {
    if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
      return { success: false, error: 'PIN Super Admin salah atau tidak valid.' };
    }
  } else if (!hasValidActiveSession) {
    return { success: false, error: 'Akses ditolak: Sesi Super Admin tidak valid atau telah berakhir.' };
  }

  const auditData = [];
  let totalStoresCount = 0;
  const totalPartitionsSet = new Set();

  for (const u of users) {
    const userStores = readStores(u.username);
    totalStoresCount += userStores.length;
    const isSA = isUserSuperAdmin(u);
    
    const storesWithPartition = userStores.map(s => {
      const part = u.username && s.id ? `persist:user_${u.username}_${s.id}` : (s.partition || 'persist:default');
      totalPartitionsSet.add(part);
      return {
        id: s.id,
        name: s.name,
        marketplace: s.marketplace || 'custom',
        url: s.url || '',
        color: s.color || '',
        initials: s.initials || s.name.substring(0, 2),
        partition: part
      };
    });

    auditData.push({
      username: u.username,
      displayName: u.displayName || u.username,
      role: isSA ? 'Super Admin' : 'Customer Service',
      isSuperAdmin: isSA,
      avatarColor: u.avatarColor || (isSA ? '#e11d48' : '#df1683'),
      avatarIcon: u.avatarIcon || (isSA ? '👑' : '👩‍💼'),
      createdAt: u.createdAt || null,
      storesCount: userStores.length,
      stores: storesWithPartition
    });
  }

  return {
    success: true,
    stats: {
      totalUsers: users.length,
      totalStores: totalStoresCount,
      totalPartitions: totalPartitionsSet.size
    },
    users: auditData
  };
}

async function adminClearStoreSession({ requestingUsername, password, targetUsername, storeId }) {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat membersihkan sesi toko.' };
  }

  try {
    const partition = `persist:user_${targetUsername}_${storeId}`;
    if (!isValidPartition(partition)) {
      return { success: false, error: 'Format partisi tidak valid.' };
    }
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData();
    safeDeletePartitionDisk(partition);

    return {
      success: true,
      message: `Sesi toko (Partisi: ${partition}) berhasil dibersihkan total.`
    };
  } catch (err) {
    return { success: false, error: 'Gagal membersihkan sesi toko: ' + err.message };
  }
}

async function adminDeleteUserStore({ requestingUsername, password, targetUsername, storeId }) {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN Super Admin salah.' };
  }

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang dapat menghapus toko user.' };
  }

  try {
    let stores = readStores(targetUsername);
    const storeToDelete = stores.find(s => s.id === storeId);
    stores = stores.filter(s => s.id !== storeId);
    saveStores(stores, targetUsername);

    try {
      const partition = `persist:user_${targetUsername}_${storeId}`;
      if (isValidPartition(partition)) {
        const ses = session.fromPartition(partition);
        await ses.clearCache();
        await ses.clearStorageData();
        safeDeletePartitionDisk(partition);
      }
    } catch (e) {}

    return {
      success: true,
      message: `Toko "${storeToDelete ? storeToDelete.name : storeId}" berhasil dihapus dari akun ${targetUsername}.`
    };
  } catch (err) {
    return { success: false, error: 'Gagal menghapus toko: ' + err.message };
  }
}

function verifyUserPin({ username, password }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    if (!user.passwordSalt) {
      user.passwordSalt = generateSalt();
      user.passwordHash = hashPassword(password, user.passwordSalt);
      saveUsers(users);
    }
    currentActiveSession = {
      username: user.username,
      isSuperAdmin: isUserSuperAdmin(user)
    };
    return { success: true };
  } else {
    return { success: false, error: 'PIN salah' };
  }
}

function loginUser({ username, password }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };

  if (verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    if (!user.passwordSalt) {
      user.passwordSalt = generateSalt();
      user.passwordHash = hashPassword(password, user.passwordSalt);
      saveUsers(users);
    }

    const isSA = isUserSuperAdmin(user);
    currentActiveSession = {
      username: user.username,
      isSuperAdmin: isSA
    };

    return {
      success: true,
      user: {
        username: user.username,
        displayName: user.displayName || user.username,
        role: isSA ? 'Super Admin' : 'Customer Service',
        avatarColor: user.avatarColor || '#df1683',
        avatarIcon: user.avatarIcon || '👩‍💼',
        autoLockMinutes: user.autoLockMinutes || 0
      }
    };
  } else {
    return { success: false, error: 'PIN/Password salah' };
  }
}

function logoutUser() {
  currentActiveSession = null;
  return { success: true };
}

function getSecurityQuestion({ username }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!user.securityQuestion) return { success: false, error: 'Tidak ada pertanyaan keamanan yang diset' };
  return { success: true, question: user.securityQuestion };
}

function resetUserPassword({ username, securityAnswer, newPassword }) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const now = Date.now();
  const attemptData = failedResetAttempts.get(cleanUsername) || { count: 0, lockedUntil: 0 };

  if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
    const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / 60000);
    return { success: false, error: `Terlalu banyak percobaan gagal. Akun dikunci sementara. Coba lagi dalam ${remainingMinutes} menit.` };
  }

  const users = readUsers();
  const user = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!user.securityAnswerHash) return { success: false, error: 'Tidak ada pertanyaan keamanan yang diset untuk akun ini' };

  const isAnswerValid = verifyPassword(securityAnswer.toLowerCase().trim(), user.securityAnswerHash, user.securityAnswerSalt);
  if (!isAnswerValid) {
    attemptData.count = (attemptData.count || 0) + 1;
    if (attemptData.count >= 5) {
      attemptData.lockedUntil = now + (15 * 60 * 1000);
      attemptData.count = 0;
      failedResetAttempts.set(cleanUsername, attemptData);
      return { success: false, error: 'Percobaan gagal 5 kali berturut-turut. Fitur reset PIN dikunci sementara selama 15 menit demi keamanan.' };
    }
    failedResetAttempts.set(cleanUsername, attemptData);
    const sisa = 5 - attemptData.count;
    return { success: false, error: `Jawaban keamanan salah. Sisa kesempatan: ${sisa} kali.` };
  }

  failedResetAttempts.delete(cleanUsername);

  const newSalt = generateSalt();
  user.passwordSalt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  saveUsers(users);
  return { success: true };
}

function updateSecurityQuestion({ username, password, securityQuestion, securityAnswer }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return { success: false, error: 'PIN saat ini salah' };
  }
  user.securityQuestion = securityQuestion || null;
  if (securityAnswer) {
    const secSalt = generateSalt();
    user.securityAnswerSalt = secSalt;
    user.securityAnswerHash = hashPassword(securityAnswer.toLowerCase().trim(), secSalt);
  } else {
    user.securityAnswerSalt = null;
    user.securityAnswerHash = null;
  }
  saveUsers(users);
  return { success: true };
}

function changePassword({ username, currentPassword, newPassword }) {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
    return { success: false, error: 'PIN saat ini salah' };
  }
  const newSalt = generateSalt();
  user.passwordSalt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  saveUsers(users);
  return { success: true };
}

module.exports = {
  getActiveSession,
  setActiveSession,
  clearActiveSession,
  generateSalt,
  hashPassword,
  verifyPassword,
  getUsers,
  getUserProfile,
  createUser,
  updateUserProfile,
  deleteUser,
  adminResetUserPin,
  adminClearUserSession,
  adminChangeUserRole,
  adminCreateUser,
  adminGetFullAudit,
  adminClearStoreSession,
  adminDeleteUserStore,
  verifyUserPin,
  loginUser,
  logoutUser,
  getSecurityQuestion,
  resetUserPassword,
  updateSecurityQuestion,
  changePassword
};
