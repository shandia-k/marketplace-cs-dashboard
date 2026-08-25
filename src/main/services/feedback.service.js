/**
 * src/main/services/feedback.service.js
 * Comprehensive 2-Way Feedback & Ticketing Service
 * Handles local atomic caching, thread messaging, status workflows, and cloud synchronization
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const {
  getUserDataPath,
  atomicWriteJsonSync,
  isUserSuperAdmin,
  readStores
} = require('./storage.service');
const { getActiveSession } = require('./auth.service');

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyZ9Vh5b71X50NbOURsA2snf4afRUetg1f0oUdQWk33Z6M6BUmk8TwBkr-JisXszxSr/exec";

function getTicketsFilePath() {
  return path.join(getUserDataPath(), 'feedback_tickets.json');
}

/**
 * Membersihkan duplikasi pesan (misal pesan _init lokal vs cloud)
 */
function deduplicateTicketMessages(messages) {
  if (!Array.isArray(messages) || messages.length <= 1) return Array.isArray(messages) ? messages : [];

  const uniqueList = [];
  messages.forEach(msg => {
    if (!msg) return;
    const isDuplicate = uniqueList.some(existing => {
      if (existing.id && msg.id && existing.id === msg.id) return true;

      // Keduanya adalah pesan inisiasi tiket (_init)
      if (existing.id && existing.id.endsWith('_init') && msg.id && msg.id.endsWith('_init')) {
        // Pertahankan gambar jika yang satu punya base64 dan yang lain tidak
        if ((!existing.images || existing.images.length === 0) && (msg.images && msg.images.length > 0)) {
          existing.images = msg.images;
        }
        return true;
      }

      // Pengirim dan teks yang sama persis dalam jendela 15 detik
      if (existing.sender?.username === msg.sender?.username && existing.content === msg.content) {
        const timeA = new Date(existing.timestamp || 0).getTime();
        const timeB = new Date(msg.timestamp || 0).getTime();
        if (Math.abs(timeA - timeB) < 15000) {
          if ((!existing.images || existing.images.length === 0) && (msg.images && msg.images.length > 0)) {
            existing.images = msg.images;
          }
          return true;
        }
      }

      return false;
    });

    if (!isDuplicate) {
      uniqueList.push(msg);
    }
  });

  return uniqueList;
}

/**
 * Baca tiket dari disk lokal (dengan failover backup dan sanitasi duplikat)
 */
function readTickets() {
  const filePath = getTicketsFilePath();
  const bakPath = `${filePath}.bak`;
  let loaded = null;

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      loaded = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading feedback_tickets.json, trying backup:', err);
    try {
      if (fs.existsSync(bakPath)) {
        const bakData = fs.readFileSync(bakPath, 'utf8');
        loaded = JSON.parse(bakData);
      }
    } catch (bakErr) {
      console.error('Error reading feedback_tickets backup:', bakErr);
    }
  }

  if (!Array.isArray(loaded)) {
    return [];
  }

  // Sanitasi pesan tiket agar bersih dari duplikat _init
  let needsResave = false;
  loaded.forEach(t => {
    if (Array.isArray(t.messages)) {
      const clean = deduplicateTicketMessages(t.messages);
      if (clean.length !== t.messages.length) {
        t.messages = clean;
        needsResave = true;
      }
    }
  });

  if (needsResave) {
    saveTickets(loaded);
  }

  return loaded;
}

/**
 * Simpan tiket ke disk lokal secara atomik
 */
function saveTickets(tickets) {
  if (!Array.isArray(tickets)) tickets = [];
  const filePath = getTicketsFilePath();
  return atomicWriteJsonSync(filePath, tickets);
}

/**
 * Generate Ticket ID Unik (Contoh: TKT-2608-8F2A)
 */
function generateTicketId() {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TKT-${yy}${mm}-${hex}`;
}

/**
 * Kumpulkan System Diagnostics
 */
function getSystemDiagnostics() {
  const osType = os.type();
  const osRelease = os.release();
  const osArch = os.arch();
  const nodeVer = process.versions.node;
  const electronVer = process.versions.electron;
  const appVer = (app && typeof app.getVersion === 'function') ? app.getVersion() : '1.0.12';
  const freeRamGb = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const totalRamGb = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);

  return {
    summary: `OS: ${osType} ${osRelease} (${osArch})\nNode: ${nodeVer} | Electron: ${electronVer}\nApp Version: ${appVer}\nFree RAM: ${freeRamGb} GB / ${totalRamGb} GB`,
    os: `${osType} ${osRelease} (${osArch})`,
    node: nodeVer,
    electron: electronVer,
    appVersion: appVer,
    freeRam: `${freeRamGb} GB`,
    totalRam: `${totalRamGb} GB`
  };
}

function isTestExecution() {
  return process.env.NODE_ENV === 'test' ||
         process.argv.some(arg => String(arg).includes('test') || String(arg).includes('guard'));
}

/**
 * POST ke Google Apps Script (dengan safe timeout & error suppression)
 */
async function postToCloudBridge(payload) {
  // Cegah spam Telegram saat menjalankan automated test suite
  if (isTestExecution()) {
    return { success: true, message: 'Test execution: cloud bridge network call skipped.' };
  }

  if (!GAS_WEB_APP_URL) {
    return { success: true, message: 'Cloud URL not configured' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const resJson = await response.json().catch(() => ({ success: true }));
    return resJson || { success: true };
  } catch (err) {
    console.warn('[Feedback Cloud Sync] Network notice:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Mengambil daftar tiket sesuai hak akses pengguna aktif
 */
function getTickets(sessionOverride = null) {
  const activeSession = sessionOverride || getActiveSession();
  const allTickets = readTickets();

  if (!activeSession) {
    return allTickets.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  const isSA = isUserSuperAdmin(activeSession);
  const currentUsername = String(activeSession.username || '').toLowerCase();

  let visibleTickets = allTickets;
  if (!isSA) {
    visibleTickets = allTickets.filter(t => {
      const rep = String(t.reporter?.username || '').toLowerCase();
      return !rep || rep === currentUsername || rep === 'user' || rep === 'cs';
    });
  }

  // Urutkan berdasarkan updatedAt terbaru
  return visibleTickets.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * Mengambil detail tiket beserta thread percakapan
 */
function getTicketDetails(ticketId, sessionOverride = null) {
  const activeSession = sessionOverride || getActiveSession();
  const allTickets = readTickets();
  const ticket = allTickets.find(t => t.id === ticketId);
  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan' };

  if (activeSession) {
    const isSA = isUserSuperAdmin(activeSession);
    const currentUsername = String(activeSession.username || '').toLowerCase();
    const reporterUser = String(ticket.reporter?.username || '').toLowerCase();

    if (!isSA && reporterUser && reporterUser !== currentUsername && reporterUser !== 'user' && reporterUser !== 'cs') {
      return { success: false, error: 'Akses ditolak: bukan tiket Anda' };
    }
  }

  return { success: true, ticket };
}

/**
 * Menandai tiket sudah dibaca oleh pengguna
 */
function markTicketAsRead(ticketId, sessionOverride = null) {
  const allTickets = readTickets();
  const ticket = allTickets.find(t => t.id === ticketId);
  if (!ticket) return { success: false };

  ticket.unreadCount = 0;
  saveTickets(allTickets);
  return { success: true, ticket };
}

/**
 * Menghitung total pesan balasan yang belum dibaca
 */
function getUnreadFeedbackCount(sessionOverride = null) {
  const tickets = getTickets(sessionOverride);
  return tickets.reduce((total, t) => total + (Number(t.unreadCount) || 0), 0);
}

/**
 * Membuat tiket baru dari form laporan CS
 */
async function createTicket(data, sessionOverride = null) {
  const activeSession = sessionOverride || getActiveSession() || {
    username: 'user',
    displayName: 'Pengguna',
    role: 'Customer Service'
  };

  const isSA = isUserSuperAdmin(activeSession);
  const sysDiag = getSystemDiagnostics();

  let cleanStoresSummary = Array.isArray(data.storesConfig) ? data.storesConfig.map(s => ({
    marketplace: s.marketplace || 'custom',
    name: (s.name || '').substring(0, 30)
  })) : [];

  if (cleanStoresSummary.length === 0 && activeSession.username) {
    try {
      const userStores = readStores(activeSession.username);
      if (Array.isArray(userStores)) {
        cleanStoresSummary = userStores.map(s => ({
          marketplace: s.marketplace || 'custom',
          name: (s.name || '').substring(0, 30)
        }));
      }
    } catch (e) {}
  }

  const cleanImages = Array.isArray(data.images) ? data.images.slice(0, 4).map((img, idx) => ({
    id: img.id || `img_${Date.now()}_${idx}`,
    name: String(img.name || `gambar_${idx + 1}.jpg`).substring(0, 50),
    tag: img.tag || `[Gambar ${idx + 1}]`,
    base64: typeof img.base64 === 'string' ? img.base64 : '',
    mimeType: img.mimeType || 'image/jpeg',
    sizeFormatted: img.sizeFormatted || '150 KB',
    width: img.width || 1280,
    height: img.height || 720
  })).filter(img => img.base64 && img.base64.length > 5) : [];

  const rawMessage = String(data.message || '').trim();
  const firstLine = rawMessage.split('\n')[0].trim();
  const generatedTitle = firstLine.length > 0
    ? (firstLine.length > 70 ? firstLine.substring(0, 67) + '...' : firstLine)
    : `Laporan ${String(data.type || 'Bug').toUpperCase()} Baru`;

  const ticketId = generateTicketId();
  const nowIso = new Date().toISOString();

  const initialMessage = {
    id: `msg_${Date.now()}_init`,
    sender: {
      username: activeSession.username,
      displayName: activeSession.displayName || activeSession.username,
      role: isSA ? 'superadmin' : 'user'
    },
    content: rawMessage || `[Laporan berisi ${cleanImages.length} lampiran gambar]`,
    images: cleanImages,
    timestamp: nowIso,
    isDevReply: false
  };

  const newTicket = {
    id: ticketId,
    type: String(data.type || 'bug').toLowerCase(),
    title: String(data.title || generatedTitle),
    status: 'open', // 'open' | 'in_progress' | 'need_info' | 'resolved' | 'closed'
    priority: String(data.priority || 'normal').toLowerCase(),
    reporter: {
      username: activeSession.username,
      displayName: activeSession.displayName || activeSession.username,
      role: isSA ? 'Super Admin' : 'Customer Service'
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    resolvedAt: null,
    unreadCount: 0,
    systemInfo: sysDiag,
    diagnostics: (data && data.diagnostics) ? data.diagnostics : null,
    storeCount: cleanStoresSummary.length,
    marketplaces: cleanStoresSummary.map(s => s.marketplace).join(', '),
    storesConfig: cleanStoresSummary,
    messages: [initialMessage]
  };

  // Simpan lokal seketika
  const allTickets = readTickets();
  allTickets.unshift(newTicket);
  saveTickets(allTickets);

  // Sync ke Google Apps Script & Telegram secara non-blocking
  postToCloudBridge({
    action: 'CREATE_TICKET',
    ticketId: newTicket.id,
    type: newTicket.type.toUpperCase(),
    title: newTicket.title,
    message: initialMessage.content,
    reporter: newTicket.reporter,
    systemInfo: sysDiag.summary,
    diagnostics: newTicket.diagnostics,
    storeCount: newTicket.storeCount,
    marketplaces: newTicket.marketplaces,
    storesConfig: cleanStoresSummary,
    images: cleanImages
  }).then(res => {
    if (!res || !res.success) {
      console.warn('[Feedback Service] Cloud bridge warning:', res?.error);
    }
  });

  return { success: true, ticket: newTicket };
}

/**
 * Menambahkan balasan percakapan pada tiket
 */
async function addReply(ticketId, messageData, sessionOverride = null) {
  const activeSession = sessionOverride || getActiveSession() || {
    username: 'cs',
    displayName: 'Customer Service',
    role: 'Customer Service'
  };

  const allTickets = readTickets();
  const ticket = allTickets.find(t => t.id === ticketId);
  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan' };

  const isSA = isUserSuperAdmin(activeSession);
  const nowIso = new Date().toISOString();
  const rawContent = String(messageData.content || '').trim();

  const cleanImages = Array.isArray(messageData.images) ? messageData.images.slice(0, 4).map((img, idx) => ({
    id: img.id || `img_${Date.now()}_${idx}`,
    name: String(img.name || `lampiran_${idx + 1}.jpg`).substring(0, 50),
    tag: img.tag || `[Gambar ${idx + 1}]`,
    base64: typeof img.base64 === 'string' ? img.base64 : '',
    mimeType: img.mimeType || 'image/jpeg',
    sizeFormatted: img.sizeFormatted || '150 KB',
    width: img.width || 1280,
    height: img.height || 720
  })).filter(img => img.base64 && img.base64.length > 5) : [];

  if (!rawContent && cleanImages.length === 0) {
    return { success: false, error: 'Pesan balasan atau gambar tidak boleh kosong' };
  }

  const isDevReply = isSA || messageData.isDevReply === true;

  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sender: {
      username: activeSession.username,
      displayName: activeSession.displayName || activeSession.username,
      role: isDevReply ? 'developer' : 'user'
    },
    content: rawContent || `[Mengirimkan ${cleanImages.length} lampiran gambar]`,
    images: cleanImages,
    timestamp: nowIso,
    isDevReply: isDevReply
  };

  if (!Array.isArray(ticket.messages)) {
    ticket.messages = [];
  }
  ticket.messages.push(newMessage);
  ticket.updatedAt = nowIso;

  // Jika developer yang membalas, tambahkan unreadCount untuk user
  if (isDevReply) {
    ticket.unreadCount = (Number(ticket.unreadCount) || 0) + 1;
  }

  // Jika tiket sebelumnya ditutup dan user membalas, ubah kembali ke 'in_progress' atau 'open'
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    ticket.status = 'in_progress';
    ticket.resolvedAt = null;
  }

  saveTickets(allTickets);

  // Sync ke Google Apps Script & Telegram
  postToCloudBridge({
    action: 'ADD_REPLY',
    ticketId: ticket.id,
    message: newMessage,
    reporter: ticket.reporter
  }).then(res => {
    if (!res || !res.success) {
      console.warn('[Feedback Service] Cloud bridge reply notice:', res?.error);
    }
  });

  return { success: true, message: newMessage, ticket };
}

/**
 * Mengubah status tiket (Open, In Progress, Need Info, Resolved, Closed)
 */
async function updateTicketStatus(ticketId, newStatus, sessionOverride = null) {
  const activeSession = sessionOverride || getActiveSession() || {
    username: 'cs',
    displayName: 'Customer Service',
    role: 'Customer Service'
  };

  const validStatuses = ['open', 'in_progress', 'need_info', 'resolved', 'closed'];
  const cleanStatus = String(newStatus || '').toLowerCase();
  if (!validStatuses.includes(cleanStatus)) {
    return { success: false, error: 'Status tiket tidak valid' };
  }

  const allTickets = readTickets();
  const ticket = allTickets.find(t => t.id === ticketId);
  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan' };

  const prevStatus = ticket.status;
  ticket.status = cleanStatus;
  ticket.updatedAt = new Date().toISOString();

  if (cleanStatus === 'resolved' || cleanStatus === 'closed') {
    ticket.resolvedAt = new Date().toISOString();
  } else {
    ticket.resolvedAt = null;
  }

  // Tambahkan event log sistem ke dalam thread
  const statusLabels = {
    open: '🟡 Menunggu Review',
    in_progress: '🔵 Sedang Dikerjakan',
    need_info: '🟣 Butuh Info Tambahan',
    resolved: '🟢 Selesai (Resolved)',
    closed: '⚫ Ditutup'
  };

  const systemMessage = {
    id: `msg_${Date.now()}_sys`,
    sender: {
      username: 'system',
      displayName: 'Sistem',
      role: 'system'
    },
    content: `Status tiket diubah menjadi "${statusLabels[cleanStatus] || cleanStatus}" oleh ${activeSession.displayName || activeSession.username}.`,
    images: [],
    timestamp: new Date().toISOString(),
    isDevReply: false
  };

  if (!Array.isArray(ticket.messages)) ticket.messages = [];
  ticket.messages.push(systemMessage);

  saveTickets(allTickets);

  // Sync ke Google Apps Script & Telegram
  postToCloudBridge({
    action: 'UPDATE_STATUS',
    ticketId: ticket.id,
    status: cleanStatus,
    previousStatus: prevStatus,
    updatedBy: activeSession.displayName || activeSession.username
  });

  return { success: true, ticket };
}

let lastSyncTimestamp = 0;
const SYNC_THROTTLE_MS = 25000;

/**
 * Menggabungkan tiket dari cloud ke cache lokal secara atomik dan mendeteksi balasan developer baru
 */
function mergeRemoteTicketsDirectly(remoteTickets, sessionOverride = null) {
  if (!Array.isArray(remoteTickets)) return { success: false, hasUpdates: false, newDevReplies: [] };
  
  const activeSession = sessionOverride || getActiveSession() || { username: 'cs', role: 'Customer Service' };
  const localTickets = readTickets();
  let hasUpdates = false;
  const newDevReplies = [];

  remoteTickets.forEach(rem => {
    const localIdx = localTickets.findIndex(loc => loc.id === rem.id);
    if (localIdx !== -1) {
      const loc = localTickets[localIdx];
      
      // Merge pesan berbasis ID unik dan bersihkan duplikat _init/konten
      const msgMap = new Map();
      (loc.messages || []).forEach(m => { if (m && m.id) msgMap.set(m.id, m); });
      (rem.messages || []).forEach(m => { if (m && m.id) msgMap.set(m.id, m); });

      const rawMerged = Array.from(msgMap.values()).sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      });
      const mergedMessages = deduplicateTicketMessages(rawMerged);

      if (mergedMessages.length !== (loc.messages || []).length) {
        hasUpdates = true;
        // Deteksi jika ada balasan baru dari developer untuk menyalakan notifikasi
        const prevIds = new Set((loc.messages || []).map(m => m.id));
        const incomingDevReplies = mergedMessages.filter(m => !prevIds.has(m.id) && (m.isDevReply || m.sender?.role === 'developer' || m.sender?.role === 'superadmin'));
        if (incomingDevReplies.length > 0) {
          loc.unreadCount = (Number(loc.unreadCount) || 0) + incomingDevReplies.length;
          incomingDevReplies.forEach(r => {
            newDevReplies.push({ ticketId: loc.id, ticketTitle: loc.title, message: r });
          });
        }
      }

      loc.messages = mergedMessages;
      if (rem.status && rem.status !== loc.status) {
        loc.status = rem.status;
        hasUpdates = true;
      }
      loc.updatedAt = rem.updatedAt || loc.updatedAt;
    } else {
      // Tiket baru dari cloud
      rem.messages = deduplicateTicketMessages(rem.messages || []);
      localTickets.push(rem);
      hasUpdates = true;
      const devMsgs = (rem.messages || []).filter(m => m.isDevReply || m.sender?.role === 'developer' || m.sender?.role === 'superadmin');
      if (devMsgs.length > 0) {
        rem.unreadCount = (Number(rem.unreadCount) || 0) + devMsgs.length;
        devMsgs.forEach(r => {
          newDevReplies.push({ ticketId: rem.id, ticketTitle: rem.title, message: r });
        });
      }
    }
  });

  if (hasUpdates) {
    saveTickets(localTickets);
  }

  return { success: true, hasUpdates, newDevReplies };
}

/**
 * Sinkronisasi tiket dengan backend cloud (Google Sheets / Telegram bridge)
 * Dilengkapi proteksi throttling 25 detik agar tidak membanjiri kuota GAS
 */
async function syncTickets(sessionOverride = null, force = false) {
  const activeSession = sessionOverride || getActiveSession() || {
    username: 'cs',
    displayName: 'Customer Service',
    role: 'Customer Service'
  };

  const now = Date.now();
  if (!force && (now - lastSyncTimestamp < SYNC_THROTTLE_MS)) {
    return {
      success: true,
      tickets: getTickets(activeSession),
      unreadCount: getUnreadFeedbackCount(activeSession),
      throttled: true
    };
  }

  lastSyncTimestamp = now;
  const isSA = isUserSuperAdmin(activeSession);

  try {
    const cloudRes = await postToCloudBridge({
      action: 'SYNC_TICKETS',
      username: activeSession.username,
      isSuperAdmin: isSA,
      lastSyncTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    let newDevReplies = [];
    if (cloudRes && cloudRes.success && Array.isArray(cloudRes.tickets)) {
      const mergeRes = mergeRemoteTicketsDirectly(cloudRes.tickets, activeSession);
      newDevReplies = mergeRes.newDevReplies || [];
    }

    return {
      success: true,
      tickets: getTickets(activeSession),
      unreadCount: getUnreadFeedbackCount(activeSession),
      newDevReplies: newDevReplies
    };
  } catch (err) {
    return {
      success: true,
      tickets: getTickets(activeSession),
      unreadCount: getUnreadFeedbackCount(activeSession),
      syncWarning: err.message
    };
  }
}

module.exports = {
  getTicketsFilePath,
  readTickets,
  saveTickets,
  generateTicketId,
  getSystemDiagnostics,
  getTickets,
  getTicketDetails,
  markTicketAsRead,
  getUnreadFeedbackCount,
  createTicket,
  addReply,
  updateTicketStatus,
  mergeRemoteTicketsDirectly,
  syncTickets,
  postToCloudBridge
};
