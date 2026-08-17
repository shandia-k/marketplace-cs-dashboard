const { app, BrowserWindow, ipcMain, session, dialog, clipboard, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const docx = require('docx');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');

// ── Release Guard Validation ────────────────────────────────────────────────
// Memastikan changelog versi di package.json sudah tersedia di js/versions-registry.js sebelum startup
try {
  const versionsRegistry = require('./js/versions-registry.js');
  const pkg = require('./package.json');
  versionsRegistry.validateVersion(pkg.version);
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', err.message);
  app.whenReady().then(() => {
    dialog.showErrorBox(
      '🚨 Release Guard: Changelog Belum Didaftarkan!',
      `Nomor versi di package.json belum memiliki catatan changelog di js/versions-registry.js!\n\n` +
      `Detail Error:\n${err.message}\n\n` +
      `Silakan tambahkan changelog versi terkait sebelum merilis atau menjalankan aplikasi.`
    );
    app.quit();
  });
}

// ── Chromium Memory & Performance Switches ──────────────────────────────────
// Berikan headroom V8 heap hingga 1024 MB agar sinkronisasi chat besar (WA/Shopee) tidak memicu GC thrashing
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Path untuk menyimpan data toko dan user
const userDataPath = app.getPath('userData');
const usersFilePath = path.join(userDataPath, 'users.json');

// Default stores jika belum ada data
const defaultStores = [
  {
    id: 'shopee-1',
    name: 'Shopee Toko 1',
    marketplace: 'shopee',
    url: 'https://seller.shopee.co.id/portal/chat',
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
  const safeUsername = username ? String(username).trim().replace(/[/\\?%*:|"<>]/g, '_') : '';
  const fileName = safeUsername ? `stores_${safeUsername}.json` : 'stores.json';
  return path.join(userDataPath, fileName);
}

// Baca stores dari file JSON dengan fallback ke backup
function readStores(username) {
  const filePath = getStoresFilePath(username);
  const bakPath = `${filePath}.bak`;
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading stores, trying backup:', err);
    try {
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf8');
        return JSON.parse(bakData);
      }
    } catch (bakErr) {
      console.error('Error reading stores backup:', bakErr);
    }
  }
  // Buat file default jika belum ada (aman dengan atomic write)
  try {
    atomicWriteJsonSync(filePath, defaultStores);
  } catch (err) {
    console.error('Error creating default stores file:', err);
  }
  return defaultStores;
}

// Simpan stores ke file JSON dengan atomic write
function saveStores(stores, username) {
  const filePath = getStoresFilePath(username);
  return atomicWriteJsonSync(filePath, stores);
}

// ── Logika Users & Autentikasi Kriptografi Aman ─────────────────────────────
const ROLE_INTEGRITY_SALT = 'cs_marketplace_role_hmac_secret_v2_99a8b7c6';

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

    // Kasus migrasi dari versi lama (belum punya roleSig)
    if (!u.roleSig) {
      const isSA = isFirstUser || u.role === 'Super Admin' || u.isSuperAdmin === true || isHardcodedSA;
      u.role = isSA ? 'Super Admin' : (u.role || 'Customer Service');
      u.isSuperAdmin = isSA;
      u.roleSig = computeRoleSig(u.username, u.role, u.passwordSalt);
      needsResave = true;
    } else {
      // Verifikasi apakah role di users.json sesuai dengan signature yang sah
      const isValidRole = verifyUserRoleSig(u);
      if (!isValidRole) {
        // Tampering detected khusus pada user ini (misal user CS diedit jadi Super Admin lewat Notepad)
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

  // 2. Safety Net Kritis: Pastikan SELALU ada minimal 1 Super Admin di sistem (akun pendiri/pertama)
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
  return atomicWriteJsonSync(usersFilePath, sanitized);
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  if (!password) return '';
  if (!salt) {
    // Legacy unsalted SHA-256 fallback
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyPassword(password, storedHash, storedSalt) {
  if (!password || !storedHash) return false;
  try {
    if (storedSalt) {
      const computed = hashPassword(password, storedSalt);
      return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
    }
    // Fallback for legacy unsalted SHA-256
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    if (legacyHash.length === storedHash.length) {
      return crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(storedHash, 'hex'));
    }
    return legacyHash === storedHash;
  } catch (e) {
    return false;
  }
}

function safeDeletePartitionDisk(part) {
  try {
    if (!part || typeof part !== 'string') return;
    const rawName = part.replace(/^persist:/, '');
    const safeFolderName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!safeFolderName) return;

    const partitionsBaseDir = path.join(app.getPath('userData'), 'Partitions');
    const targetDir = path.join(partitionsBaseDir, safeFolderName);

    // Pastikan targetDir benar-benar berada di dalam partitionsBaseDir (Anti Path-Traversal)
    const relative = path.relative(partitionsBaseDir, targetDir);
    if (!relative.startsWith('..') && !path.isAbsolute(relative) && fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Error safe deleting partition disk:', e);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,          // Custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,       // Aktifkan <webview> untuk load marketplace
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  // Content-Security-Policy yang aman dan ketat untuk aplikasi desktop (tanpa unsafe-eval)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' https: http: data:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"]
      }
    });
  });

  mainWindow.on('focus', () => {
    if (typeof checkClipboardNow === 'function') checkClipboardNow();
  });
}

// ── Sesi Aktif & Rate-Limiting Keamanan ──────────────────────────────────────
let currentActiveSession = null;
const failedResetAttempts = new Map(); // username -> { count: number, lockedUntil: timestamp }

// IPC Handlers
ipcMain.handle('get-stores', (event, username) => {
  return readStores(username);
});

ipcMain.handle('save-stores', (event, stores, username) => {
  const cleanUsername = String(username || '').trim();
  // Proteksi IDOR: CS hanya boleh menyimpan file toko miliknya sendiri (atau Super Admin)
  if (currentActiveSession && !currentActiveSession.isSuperAdmin && currentActiveSession.username.toLowerCase() !== cleanUsername.toLowerCase()) {
    console.warn(`[Security Warning] Blocked unauthorized saveStores attempt by "${currentActiveSession.username}" for user "${cleanUsername}"`);
    return false;
  }
  return saveStores(stores, username);
});


// IPC Users
ipcMain.handle('get-users', () => {
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
});

ipcMain.handle('get-user-profile', (event, username) => {
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
});

ipcMain.handle('create-user', (event, { username, password, displayName, role, avatarColor, avatarIcon, securityQuestion, securityAnswer, adminApprovalPin }) => {
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
    // Validasi bahwa PIN otorisasi dari Super Admin yang ada sudah benar
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
});

ipcMain.handle('update-user-profile', (event, { username, displayName, avatarColor, avatarIcon, autoLockMinutes }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  
  if (displayName !== undefined) user.displayName = String(displayName).trim() || user.username;
  // Catatan Keamanan: Pengubahan role dan isSuperAdmin sengaja ditiadakan di sini (wajib lewat admin-change-user-role)
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
});

ipcMain.handle('delete-user', async (event, { usernameToDelete, requestingUsername, password }) => {
  const users = readUsers();
  const reqUser = users.find(u => u.username === requestingUsername);
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };
  if (!verifyPassword(password, reqUser.passwordHash, reqUser.passwordSalt)) {
    return { success: false, error: 'PIN verifikasi salah. Tindakan dibatalkan.' };
  }

  // Proteksi Hak Akses: HANYA Super Admin yang boleh menghapus akun
  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang memiliki hak untuk menghapus akun pengguna.' };
  }

  // Cegah penghapusan akun Super Admin utama jika hanya satu-satunya Super Admin
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

  // Bersihkan seluruh sesi/cookies/cache marketplace akun tersebut dengan aman
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

  // Hapus file data toko user jika ada
  try {
    const storePath = getStoresFilePath(usernameToDelete);
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  } catch (err) {
    console.error('Error deleting user stores file:', err);
  }

  return { success: true };
});

// Handler Super Admin: Reset PIN pengguna lain
ipcMain.handle('admin-reset-user-pin', (event, { requestingUsername, password, targetUsername, newPin }) => {
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
});

// Handler Super Admin: Bersihkan sesi / cookies / cache user lain
ipcMain.handle('admin-clear-user-session', async (event, { requestingUsername, password, targetUsername }) => {
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
});

// Handler Super Admin: Ubah Role Pengguna (Promote to Super Admin / Demote to CS)
ipcMain.handle('admin-change-user-role', async (event, { requestingUsername, password, targetUsername, newRole }) => {
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

  // Proteksi: cegah penurunan role jika hanya tersisa 1 Super Admin
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
});

// Handler Super Admin: Tambah Pengguna / Super Admin Baru Langsung dari Panel Admin
ipcMain.handle('admin-create-user', async (event, { requestingUsername, password, newUsername, newDisplayName, newRole, newPassword, avatarColor, avatarIcon, securityQuestion, securityAnswer }) => {
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
});

// Handler Super Admin: Audit Sesi & Toko Semua Pengguna (Dengan Verifikasi Akses)
ipcMain.handle('admin-get-full-audit', async (event, payload = {}) => {
  const { requestingUsername, password } = (typeof payload === 'object' && payload !== null) ? payload : { requestingUsername: payload };
  const cleanUsername = String(requestingUsername || '').trim();
  const users = readUsers();
  const reqUser = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!reqUser) return { success: false, error: 'Akun pemohon tidak ditemukan' };

  const isSuperAdmin = isUserSuperAdmin(reqUser);
  if (!isSuperAdmin) {
    return { success: false, error: 'Akses ditolak: Hanya Super Admin yang memiliki hak akses panel audit.' };
  }

  // Wajibkan verifikasi sesi aktif atau verifikasi password Super Admin yang sah
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
});

// Handler Super Admin: Bersihkan sesi 1 toko spesifik milik CS
ipcMain.handle('admin-clear-store-session', async (event, { requestingUsername, password, targetUsername, storeId }) => {
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
});

// Handler Super Admin: Hapus 1 toko dari akun CS
ipcMain.handle('admin-delete-user-store', async (event, { requestingUsername, password, targetUsername, storeId }) => {
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

    // Clear its partition both via Chromium API & Physical disk
    try {
      const partition = `persist:user_${targetUsername}_${storeId}`;
      const ses = session.fromPartition(partition);
      await ses.clearCache();
      await ses.clearStorageData();
      safeDeletePartitionDisk(partition);
    } catch (e) {}

    return {
      success: true,
      message: `Toko "${storeToDelete ? storeToDelete.name : storeId}" berhasil dihapus dari akun ${targetUsername}.`
    };
  } catch (err) {
    return { success: false, error: 'Gagal menghapus toko: ' + err.message };
  }
});

ipcMain.handle('verify-user-pin', (event, { username, password }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    currentActiveSession = {
      username: user.username,
      isSuperAdmin: isUserSuperAdmin(user)
    };
    return { success: true };
  } else {
    return { success: false, error: 'PIN salah' };
  }
});

ipcMain.handle('login-user', (event, { username, password }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  
  if (verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    // Transparently upgrade legacy unsalted passwords to secure salted scrypt
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
});

ipcMain.handle('logout-user', () => {
  currentActiveSession = null;
  return { success: true };
});

ipcMain.handle('get-security-question', (event, { username }) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { success: false, error: 'User tidak ditemukan' };
  if (!user.securityQuestion) return { success: false, error: 'Tidak ada pertanyaan keamanan yang diset' };
  return { success: true, question: user.securityQuestion };
});

ipcMain.handle('reset-user-password', (event, { username, securityAnswer, newPassword }) => {
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
      attemptData.lockedUntil = now + (15 * 60 * 1000); // 15 menit lockout
      attemptData.count = 0;
      failedResetAttempts.set(cleanUsername, attemptData);
      return { success: false, error: 'Percobaan gagal 5 kali berturut-turut. Fitur reset PIN dikunci sementara selama 15 menit demi keamanan.' };
    }
    failedResetAttempts.set(cleanUsername, attemptData);
    const sisa = 5 - attemptData.count;
    return { success: false, error: `Jawaban keamanan salah. Sisa kesempatan: ${sisa} kali.` };
  }
  
  // Reset berhasil, bersihkan tracking kegagalan
  failedResetAttempts.delete(cleanUsername);

  const newSalt = generateSalt();
  user.passwordSalt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  saveUsers(users);
  return { success: true };
});

ipcMain.handle('get-app-path', () => {
  return __dirname;
});

// ── Smart URL Search & Suggestion for Custom Marketplace ─────────────────────
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
  { keywords: ['shopee', 'shopee seller'], title: 'Shopee Seller Center', url: 'https://seller.shopee.co.id/portal/chat', domain: 'seller.shopee.co.id', snippet: 'Shopee Seller Chat Portal' },
  { keywords: ['tokopedia', 'tokopedia seller'], title: 'Tokopedia Seller Center', url: 'https://seller.tokopedia.com/chat', domain: 'seller.tokopedia.com', snippet: 'Tokopedia Seller Chat Portal' }
];

const dnsPromises = require('dns').promises;

async function searchWebUrls(query) {
  const q = (query || '').trim();
  if (!q) return [];

  const results = [];
  const addedUrls = new Set();

  function addResult(item) {
    if (!item || !item.url) return;
    const cleanUrl = item.url.toLowerCase().replace(/\/+$/, '');
    if (!addedUrls.has(cleanUrl)) {
      addedUrls.add(cleanUrl);
      results.push(item);
    }
  }

  // 1. Direct domain detection: e.g. "partner.dokterin.co.id" or "myshop.com/admin"
  const isDirectDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(q) && !q.includes(' ');
  const isHttpUrl = /^https?:\/\//i.test(q);

  if (isDirectDomain || isHttpUrl) {
    const directUrl = isHttpUrl ? q : `https://${q}`;
    let hostname = '';
    try {
      hostname = new URL(directUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = q;
    }
    addResult({
      title: `Buka Alamat Langsung: ${hostname}`,
      url: directUrl,
      domain: hostname,
      snippet: `Alamat web langsung: ${directUrl}`,
      isDirect: true
    });
  }

  // 2. Preset match
  const lowerQ = q.toLowerCase();
  for (const preset of POPULAR_MARKETPLACE_PRESETS) {
    if (preset.keywords.some(k => lowerQ.includes(k) || k.includes(lowerQ))) {
      addResult({ ...preset, isPreset: true });
    }
  }

  // 3. Multi-Source Parallel Search
  const searchTasks = [];

  // (a) Google Suggestion API
  searchTasks.push((async () => {
    try {
      const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&hl=id&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.ok) {
        const data = await res.json();
        const suggestions = data[1] || [];
        for (const s of suggestions) {
          if (typeof s === 'string' && /^https?:\/\//i.test(s)) {
            let hostname = '';
            try { hostname = new URL(s).hostname.replace(/^www\./, ''); } catch (e) { hostname = s; }
            addResult({
              title: `${hostname} (Website Resmi)`,
              url: s,
              domain: hostname,
              snippet: `Tautan navigasi resmi untuk "${q}"`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  // (b) Wikipedia Opensearch API (verified encyclopedia/brand links)
  searchTasks.push((async () => {
    try {
      const res = await fetch(`https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`);
      if (res.ok) {
        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];
        const urls = data[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (urls[i]) {
            addResult({
              title: titles[i],
              url: urls[i],
              domain: 'id.wikipedia.org',
              snippet: descriptions[i] || `Informasi resmi ${titles[i]} di Wikipedia`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  // (c) Fast DNS TLD Probing for brand keywords
  const cleanQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanQ.length >= 3 && cleanQ.length <= 30 && !q.includes('.')) {
    const tldsToProbe = ['.id', '.co.id', '.com', '.app', '.net'];
    for (const tld of tldsToProbe) {
      searchTasks.push((async () => {
        const domain = `${cleanQ}${tld}`;
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
          await Promise.race([dnsPromises.lookup(domain), timeoutPromise]);
          const probedUrl = `https://${domain}/`;
          addResult({
            title: `${q.charAt(0).toUpperCase() + q.slice(1)} (${domain})`,
            url: probedUrl,
            domain: domain,
            snippet: `Domain resmi terverifikasi: ${domain}`,
            isDirect: true
          });
        } catch (e) {}
      })());
    }
  }

  // (d) DuckDuckGo Lite search with Chrome User-Agent
  searchTasks.push((async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: `q=${encodeURIComponent(q)}`,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=['"]([^'"]+)['"][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a\s+(?:[^>]*?\s+)?class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<td\s+class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

        const snippets = [];
        let sm;
        while ((sm = snippetRegex.exec(html)) !== null) {
          snippets.push(sm[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
        }

        let lm;
        let index = 0;
        while ((lm = linkRegex.exec(html)) !== null && results.length < 10) {
          let rawHref = lm[1] || lm[3];
          let rawTitle = lm[2] || lm[4];

          if (rawHref) {
            let finalUrl = rawHref;
            if (finalUrl.includes('uddg=')) {
              const urlParams = new URLSearchParams(finalUrl.substring(finalUrl.indexOf('?')));
              finalUrl = decodeURIComponent(urlParams.get('uddg') || finalUrl);
            }

            if (
              (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) &&
              !finalUrl.includes('duckduckgo.com/') &&
              !finalUrl.includes('bing.com/aclick') &&
              !finalUrl.includes('google.com/aclk')
            ) {
              const title = (rawTitle || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
              const snippet = snippets[index] || '';

              let hostname = '';
              try {
                hostname = new URL(finalUrl).hostname.replace(/^www\./, '');
              } catch (e) {
                hostname = finalUrl;
              }

              addResult({
                title: title || hostname,
                url: finalUrl,
                domain: hostname,
                snippet
              });
            }
          }
          index++;
        }
      }
    } catch (err) {}
  })());

  await Promise.allSettled(searchTasks);

  // Fallback domain synthesizer if no results
  if (results.length === 0 && cleanQ.length >= 2) {
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Indonesia (.id)`,
      url: `https://${cleanQ}.id/`,
      domain: `${cleanQ}.id`,
      snippet: `Rekomendasi URL Indonesia untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Global (.com)`,
      url: `https://${cleanQ}.com/`,
      domain: `${cleanQ}.com`,
      snippet: `Rekomendasi URL Global untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Co.id (.co.id)`,
      url: `https://${cleanQ}.co.id/`,
      domain: `${cleanQ}.co.id`,
      snippet: `Rekomendasi URL Perusahaan untuk ${q}`,
      isDirect: true
    });
  }

  return results.slice(0, 6);
}

ipcMain.handle('search-urls', async (event, query) => {
  return await searchWebUrls(query);
});

ipcMain.handle('read-clipboard', () => {
  try {
    return clipboard.readText();
  } catch (e) {
    return '';
  }
});

ipcMain.handle('write-clipboard', (event, text) => {
  try {
    clipboard.writeText(text || '');
    return true;
  } catch (e) {
    return false;
  }
});

// Auto-Watcher Clipboard Windows (Focus-aware: hanya memantau saat jendela aplikasi aktif)
let lastClipboardText = '';
function checkClipboardNow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // Jangan sadap clipboard jika aplikasi terminimalkan atau user sedang di aplikasi lain
  if (!mainWindow.isFocused()) return;
  try {
    const text = clipboard.readText()?.trim();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      mainWindow.webContents.send('clipboard-changed', text);
    }
  } catch (e) {}
}

setInterval(checkClipboardNow, 350);

ipcMain.handle('update-security-question', (event, { username, password, securityQuestion, securityAnswer }) => {
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
});

ipcMain.handle('change-password', (event, { username, currentPassword, newPassword }) => {
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
});

// ── Helper & IPC Cache Management (Asynchronous & Non-blocking) ─────────────────
async function getDirSizeAsync(dirPath) {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          total += await getDirSizeAsync(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.promises.stat(fullPath);
          total += stat.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return total;
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function calculateAppCacheSizeAsync() {
  const cacheDirs = [
    path.join(userDataPath, 'Cache'),
    path.join(userDataPath, 'GPUCache'),
    path.join(userDataPath, 'Code Cache'),
    path.join(userDataPath, 'DawnCache'),
    path.join(userDataPath, 'Partitions')
  ];
  let total = 0;
  for (const dir of cacheDirs) {
    total += await getDirSizeAsync(dir);
  }
  return total;
}

ipcMain.handle('get-cache-size', async () => {
  const total = await calculateAppCacheSizeAsync();
  return { bytes: total, formatted: formatBytes(total) };
});

// Opsi 1: Bersihkan Cache Aman (Global, Cookies & Login Tetap Aman)
ipcMain.handle('clear-safe-cache', async (event, username) => {
  try {
    // 1. Bersihkan default session cache
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['shadercache', 'serviceworkers', 'cachestorage', 'websql', 'indexeddb']
    });

    // 2. Bersihkan partisi toko HANYA untuk user yang sedang aktif
    const stores = readStores(username);
    const partitions = new Set();

    stores.forEach(s => {
      if (username && s.id) {
        partitions.add(`persist:user_${username}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      try {
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['shadercache', 'serviceworkers', 'cachestorage']
        });
      } catch (e) {}
    }

    const newSize = await calculateAppCacheSizeAsync();
    return { success: true, newFormatted: formatBytes(newSize), message: 'Cache aman berhasil dibersihkan! Sesi login toko tetap terjaga.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 2: Bersihkan Cache Khusus Toko Tertentu (Per-Store Cache Clear & Reload)
ipcMain.handle('clear-store-cache', async (event, { partition }) => {
  try {
    if (!partition) return { success: false, error: 'Partisi tidak valid' };
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData({
      storages: ['shadercache', 'serviceworkers', 'cachestorage']
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 3: Deep Clean / Reset Toko (Termasuk Logout / Sesi Dihapus)
ipcMain.handle('deep-clean-store', async (event, { partition }) => {
  try {
    if (!partition) return { success: false, error: 'Partisi tidak valid' };
    const ses = session.fromPartition(partition);
    await ses.clearCache();
    await ses.clearStorageData(); // Bersihkan semuanya (termasuk cookies & localstorage)
    safeDeletePartitionDisk(partition);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Opsi 3 Global: Deep Clean Semua Data Toko Milik Pengguna yang Sedang Aktif
ipcMain.handle('deep-clean-all', async (event, username) => {
  try {
    // Bersihkan partisi HANYA milik user yang sedang aktif
    const stores = readStores(username);
    const partitions = new Set();

    stores.forEach(s => {
      if (username && s.id) {
        partitions.add(`persist:user_${username}_${s.id}`);
      } else if (s.partition) {
        partitions.add(s.partition);
      }
    });

    for (const part of partitions) {
      try {
        const ses = session.fromPartition(part);
        await ses.clearCache();
        await ses.clearStorageData();
        safeDeletePartitionDisk(part);
      } catch (e) {}
    }

    const newSize = await calculateAppCacheSizeAsync();
    return { success: true, newFormatted: formatBytes(newSize) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export konfigurasi toko ke file JSON
ipcMain.handle('export-stores-config', async (event, stores) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Ekspor Konfigurasi Toko',
    defaultPath: 'cs-dashboard-config.json',
    filters: [{ name: 'JSON Config', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(stores, null, 2), 'utf8');
    return true;
  } catch (err) {
    throw new Error('Gagal ekspor: ' + err.message);
  }
});

// Import konfigurasi toko dari file JSON
ipcMain.handle('import-stores-config', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Impor Konfigurasi Toko',
    properties: ['openFile'],
    filters: [{ name: 'JSON Config', extensions: ['json'] }]
  });
  if (canceled || filePaths.length === 0) return null;
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Format file tidak valid.');
    // Validasi minimal setiap toko punya id, name, marketplace
    parsed.forEach(s => {
      if (!s.id || !s.name || !s.marketplace) throw new Error('Data toko tidak lengkap.');
    });
    return parsed;
  } catch (err) {
    throw new Error('Gagal impor: ' + err.message);
  }
});

ipcMain.handle('get-app-memory-mb', () => {
  try {
    const metrics = app.getAppMetrics();
    // metrics adalah array object berisi { type, memory: { privateBytes, workingSetSize } }
    // privateBytes = Private Working Set (same as Task Manager "Memory" column)
    if (metrics && metrics.length > 0) {
      const totalKB = metrics.reduce((sum, m) => sum + (m.memory?.privateBytes || m.memory?.workingSetSize || 0), 0);
      return totalKB / 1024; // Return MB
    }
  } catch (e) {}
  return 0;
});

ipcMain.handle('get-app-metrics-details', () => {
  try {
    const metrics = app.getAppMetrics() || [];
    const allContents = webContents ? webContents.getAllWebContents() : [];
    
    return allContents
      .filter(wc => !wc.isDestroyed())
      .map(wc => {
        const pid = wc.getOSProcessId();
        const metric = metrics.find(m => m.pid === pid);
        const memKB = metric ? (metric.memory?.privateBytes || metric.memory?.workingSetSize || 0) : 0;
        return {
          wcId: wc.id,
          type: wc.getType(),
          pid: pid,
          memoryKB: memKB
        };
      });
  } catch (e) {
    return [];
  }
});


// Scratchpad IPC Handlers
ipcMain.handle('load-scratchpad-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Buka File Catatan',
    properties: ['openFile'],
    filters: [
      { name: 'Dokumen', extensions: ['txt', 'xlsx', 'docx'] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const filePath = filePaths[0];
  const ext = path.extname(filePath).toLowerCase();

  try {
    let content = '';
    if (ext === '.txt') {
      content = fs.readFileSync(filePath, 'utf8');
    } else if (ext === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Convert sheet to json arrays
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      // Map each row array to tab-separated string for multi-column representation
      content = data.map(row => (Array.isArray(row) ? row.map(cell => (cell !== null && cell !== undefined ? String(cell) : '')).join('\t') : String(row))).join('\n');
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      content = result.value;
    }
    return { content, fileName: path.basename(filePath) };
  } catch (err) {
    throw new Error('Gagal membaca file: ' + err.message);
  }
});

ipcMain.handle('save-scratchpad-file', async (event, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Simpan Catatan',
    defaultPath: 'catatan.txt',
    filters: [
      { name: 'Text File', extensions: ['txt'] },
      { name: 'Excel File', extensions: ['xlsx'] },
      { name: 'Word Document', extensions: ['docx'] }
    ]
  });

  if (canceled || !filePath) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.txt') {
      fs.writeFileSync(filePath, content, 'utf8');
    } else if (ext === '.xlsx') {
      // Create a new workbook and add a worksheet with multi-column support
      const wb = xlsx.utils.book_new();
      const data = (content || '').split('\n').map(line => line.split('\t'));
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'Catatan');
      xlsx.writeFile(wb, filePath);
    } else if (ext === '.docx') {
      // Split by newline and create paragraphs
      const paragraphs = content.split('\n').map(line => {
        return new docx.Paragraph({
          children: [new docx.TextRun(line)]
        });
      });

      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const buffer = await docx.Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
    }
    return { success: true, fileName: path.basename(filePath) };
  } catch (err) {
    throw new Error('Gagal menyimpan file: ' + err.message);
  }
});

// Feedback Handler
ipcMain.handle('submit-feedback', async (event, data) => {
  // -------------------------------------------------------------
  // PENGATURAN PROXY SERVER FEEDBACK (GOOGLE APPS SCRIPT)
  // -------------------------------------------------------------
  // Ganti URL di bawah ini dengan Web App URL dari Google Apps Script Anda.
  // Ini memastikan aplikasi Anda 100% aman dan bersih dari Token Rahasia.
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxX7AEaLnjhY4jNmnrOGxF_BR0Qwu7P03-5xhNiRmxn3OZTnWG89GtxMol8z6DD1uhKSQ/exec";

  if (!GAS_WEB_APP_URL) {
    // Simulasi sukses untuk testing jika proxy belum diatur
    return { success: true, message: "Server Proxy belum diatur, namun pengumpulan data berhasil." };
  }

  try {
    const os = require('os');
    const systemInfo = `
OS: ${os.type()} ${os.release()} (${os.arch()})
Node: ${process.versions.node} | Electron: ${process.versions.electron}
App Version: ${app.getVersion()}
Free RAM: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
    `.trim();

    // Sanitasi data toko (hanya platform dan nama publik, tanpa token/URL internal)
    const cleanStoresSummary = Array.isArray(data.storesConfig) ? data.storesConfig.map(s => ({
      marketplace: s.marketplace || 'custom',
      name: (s.name || '').substring(0, 30)
    })) : [];

    // Kirim data yang telah disanitasi ke Google Apps Script Proxy
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: String(data.type || 'FEEDBACK').toUpperCase(),
        message: String(data.message || '').substring(0, 5000),
        systemInfo: systemInfo,
        storeCount: cleanStoresSummary.length,
        marketplaces: cleanStoresSummary.map(s => s.marketplace).join(', ')
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Proxy HTTP Error ${response.status}: ${errText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Feedback Proxy Error:', error);
    return { success: false, error: error.message };
  }
});

// Telemetry & Product Analytics Handler
ipcMain.handle('send-telemetry', async (event, data) => {
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxX7AEaLnjhY4jNmnrOGxF_BR0Qwu7P03-5xhNiRmxn3OZTnWG89GtxMol8z6DD1uhKSQ/exec";

  if (!GAS_WEB_APP_URL) return { success: false, message: 'URL belum diatur' };

  try {
    const os = require('os');
    const systemInfo = `${os.type()} ${os.release()} (${os.arch()}) | RAM: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`;

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TELEMETRY',
        appVersion: app.getVersion(),
        durationMinutes: data.durationMinutes || 0,
        storeCount: data.storeCount || 0,
        marketplaces: data.marketplaces || '-',
        events: data.events || {},
        systemInfo: systemInfo
      })
    });

    const respText = await response.text();
    let respJson = null;
    try {
      respJson = JSON.parse(respText);
    } catch (e) {
      respJson = { raw: respText };
    }

    console.log('[Telemetry Response from GAS]:', respJson);
    return { success: response.ok, data: respJson };
  } catch (error) {
    console.error('[Telemetry Error]:', error);
    return { success: false, error: error.message };
  }
});

// Window controls
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

ipcMain.on('flash-frame', (event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(flag !== false);
  }
});

// Auto Updater IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) {
    // Mode Development (npm start)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-message', {
        status: 'checking',
        currentVersion: app.getVersion()
      });
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater-message', {
            status: 'not-available',
            version: app.getVersion(),
            currentVersion: app.getVersion(),
            message: 'Aplikasi sudah versi terbaru (Mode Dev: v' + app.getVersion() + ')',
            isDev: true
          });
        }
      }, 1200);
    }
    return;
  }

  // Mode Production (Packed .exe)
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater-message', {
        status: 'error',
        message: err.message || 'Gagal memulai pengecekan update',
        currentVersion: app.getVersion()
      });
    }
  }
});

ipcMain.on('restart-to-update', () => {
  autoUpdater.quitAndInstall();
});

// Setup Auto Updater Events
function setupAutoUpdater(window) {
  autoUpdater.removeAllListeners();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'checking',
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'available',
        version: info.version,
        currentVersion: app.getVersion(),
        releaseNotes: info.releaseNotes || null,
        releaseDate: info.releaseDate || null
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'not-available',
        version: app.getVersion(),
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('error', (err) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'error',
        message: err.message || 'Terjadi kesalahan saat memeriksa update',
        currentVersion: app.getVersion()
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-progress', {
        percent: Math.round(progressObj.percent || 0),
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
        bytesPerSecond: progressObj.bytesPerSecond || 0
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('updater-message', {
        status: 'downloaded',
        version: info.version,
        currentVersion: app.getVersion()
      });
    }
  });
}

// Setup webview permissions & navigation security guard untuk semua partisi
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    const allowedPermissions = [
      'notifications',
      'media',
      'geolocation',
      'fullscreen',
      'clipboard-read',
      'clipboard-sanitized-write'
    ];

    // Izinkan notifikasi, kamera, clipboard, dll. yang dibutuhkan marketplace
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(allowedPermissions.includes(permission));
    });

    contents.session.setPermissionCheckHandler((webContents, permission) => {
      return allowedPermissions.includes(permission);
    });

    // Guard navigasi di webview dari skema berbahaya
    contents.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        // Blokir skema lokal atau berbahaya yang dapat mengeksekusi kode
        if (['file:', 'javascript:', 'data:', 'vbscript:'].includes(parsed.protocol)) {
          console.warn('Blocked dangerous webview navigation scheme:', url);
          event.preventDefault();
          return;
        }
      } catch (e) {
        event.preventDefault();
      }
    });

    // Cegah popup arbitrary, skema tidak valid, atau sub-widget iframe yang mencoba membuka window liar
    contents.setWindowOpenHandler(({ url, disposition }) => {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return { action: 'deny' };
        }
        // Tolak pembukaan window dari internal widget hovercard Google Contacts
        if (url.includes('/widget/hovercard') || url.includes('contacts.google.com/widget')) {
          return { action: 'deny' };
        }
        return { action: 'allow' };
      } catch (e) {}
      return { action: 'deny' };
    });
  }
});

// Memaksa User-Agent standar Firefox agar login Google/Gmail tidak memicu pengecekan Chromium security
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';

app.whenReady().then(() => {
  createWindow();

  // Setup auto updater setelah window dibuat
  setupAutoUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      setupAutoUpdater(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
