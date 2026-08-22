/**
 * tests/unit/logic/feedback-thread.test.js
 * Unit testing for 2-way feedback service, ticket lifecycles, and thread messaging
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Buat temporary directory untuk isolasi file feedback_tickets.json
const testDir = path.join(os.tmpdir(), `mkt_feedback_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

describe('Level 1: 2-Way Feedback & Interactive Ticketing Logic Tests', () => {
  let feedbackService;
  let testTicketsPath;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testTicketsPath = path.join(testDir, 'feedback_tickets.json');

    // Load feedback.service with isolated testDir
    const serviceCode = fs.readFileSync(path.join(__dirname, '../../../src/main/services/feedback.service.js'), 'utf8');
    const fn = new Function('require', 'module', 'exports', serviceCode);
    const mockModule = { exports: {} };

    fn((mod) => {
      if (mod === 'electron') {
        return {
          app: {
            getVersion: () => '1.0.14',
            getPath: () => testDir
          }
        };
      }
      if (mod === './storage.service') {
        return {
          getUserDataPath: () => testDir,
          atomicWriteJsonSync: (filePath, data) => {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
          },
          isUserSuperAdmin: (user) => {
            if (!user) return false;
            return user.role === 'Super Admin' || user.isSuperAdmin === true || String(user.username || '').toLowerCase() === 'superadmin';
          },
          readStores: () => []
        };
      }
      if (mod === './auth.service') {
        return {
          getActiveSession: () => null
        };
      }
      return require(mod);
    }, mockModule, mockModule.exports);

    feedbackService = mockModule.exports;
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  test('should generate valid Ticket ID format (TKT-YYMM-XXXX)', () => {
    const ticketId = feedbackService.generateTicketId();
    assert.ok(ticketId.startsWith('TKT-'), 'Ticket ID must start with TKT-');
    assert.match(ticketId, /^TKT-\d{4}-[A-F0-9]{4}$/, 'Ticket ID must match pattern TKT-YYMM-HEX4');
  });

  test('should create new ticket with initial user message and system info', async () => {
    const userSession = {
      username: 'cs_ani',
      displayName: 'Ani Rahmawati',
      role: 'Customer Service'
    };

    const payload = {
      type: 'bug',
      title: 'Tampilan Chat Shopee Terpotong',
      message: 'Halo, tampilan chat shopee terpotong di bagian bawah tombol kirim [Gambar 1]',
      images: [
        { name: 'screenshot_1.jpg', base64: 'data:image/jpeg;base64,1234567890abcdef', mimeType: 'image/jpeg', sizeFormatted: '120 KB' }
      ]
    };

    const res = await feedbackService.createTicket(payload, userSession);
    assert.equal(res.success, true);
    assert.ok(res.ticket);
    assert.equal(res.ticket.status, 'open');
    assert.equal(res.ticket.type, 'bug');
    assert.equal(res.ticket.reporter.username, 'cs_ani');
    assert.equal(res.ticket.unreadCount, 0);
    assert.equal(res.ticket.messages.length, 1);
    assert.equal(res.ticket.messages[0].sender.username, 'cs_ani');
    assert.equal(res.ticket.messages[0].isDevReply, false);
    assert.equal(res.ticket.messages[0].images.length, 1);
  });

  test('should handle 2-way conversation threading: CS reply vs Developer reply', async () => {
    const csSession = { username: 'cs_budi', displayName: 'Budi CS', role: 'Customer Service' };
    const devSession = { username: 'superadmin', displayName: 'Developer John', role: 'Super Admin', isSuperAdmin: true };

    // 1. CS membuat tiket
    const createRes = await feedbackService.createTicket({
      type: 'saran',
      message: 'Mohon tambahkan shortcut Ctrl+F di tab toko'
    }, csSession);
    const ticketId = createRes.ticket.id;

    // 2. Developer membalas dari Telegram / Admin
    const devReplyRes = await feedbackService.addReply(ticketId, {
      content: 'Halo Budi, fitur Ctrl+F sudah kami jadwalkan untuk rilis v2.0.1.',
      isDevReply: true
    }, devSession);

    assert.equal(devReplyRes.success, true);
    assert.equal(devReplyRes.message.isDevReply, true);
    assert.equal(devReplyRes.message.sender.role, 'developer');
    // Unread count untuk CS harus bertambah
    assert.equal(devReplyRes.ticket.unreadCount, 1);

    // 3. CS membalas balik
    const csReplyRes = await feedbackService.addReply(ticketId, {
      content: 'Terima kasih banyak tim developer!'
    }, csSession);

    assert.equal(csReplyRes.success, true);
    assert.equal(csReplyRes.message.isDevReply, false);
    assert.equal(csReplyRes.message.sender.role, 'user');
    assert.equal(csReplyRes.ticket.messages.length, 3);
  });

  test('should update ticket status and log system message in thread', async () => {
    const csSession = { username: 'cs_ani', displayName: 'Ani', role: 'Customer Service' };
    const adminSession = { username: 'superadmin', displayName: 'Super Admin', role: 'Super Admin', isSuperAdmin: true };

    const createRes = await feedbackService.createTicket({
      type: 'bug',
      message: 'Bug crash saat login'
    }, csSession);
    const ticketId = createRes.ticket.id;

    // Ubah ke in_progress
    const updateRes = await feedbackService.updateTicketStatus(ticketId, 'in_progress', adminSession);
    assert.equal(updateRes.success, true);
    assert.equal(updateRes.ticket.status, 'in_progress');

    // Ubah ke resolved
    const resolveRes = await feedbackService.updateTicketStatus(ticketId, 'resolved', adminSession);
    assert.equal(resolveRes.success, true);
    assert.equal(resolveRes.ticket.status, 'resolved');
    assert.ok(resolveRes.ticket.resolvedAt, 'Resolved ticket must have resolvedAt timestamp');

    // Pastikan log sistem tercatat di messages
    const sysMsg = resolveRes.ticket.messages.find(m => m.sender.role === 'system');
    assert.ok(sysMsg, 'System log message must be appended to thread');
    assert.ok(sysMsg.content.includes('Status tiket diubah'));
  });

  test('should reset unread counter when markTicketAsRead is called', async () => {
    const csSession = { username: 'cs_ani', displayName: 'Ani', role: 'Customer Service' };
    const devSession = { username: 'superadmin', displayName: 'Developer', role: 'Super Admin', isSuperAdmin: true };

    const createRes = await feedbackService.createTicket({ type: 'bug', message: 'Test bug' }, csSession);
    const ticketId = createRes.ticket.id;

    await feedbackService.addReply(ticketId, { content: 'Balasan developer', isDevReply: true }, devSession);
    assert.equal(feedbackService.getUnreadFeedbackCount(csSession), 1);

    const markRes = feedbackService.markTicketAsRead(ticketId, csSession);
    assert.equal(markRes.success, true);
    assert.equal(feedbackService.getUnreadFeedbackCount(csSession), 0);
  });

  test('should enforce role-based ticket visibility: CS only sees own tickets, Admin sees all', async () => {
    const user1 = { username: 'user_satu', displayName: 'User 1', role: 'Customer Service' };
    const user2 = { username: 'user_dua', displayName: 'User 2', role: 'Customer Service' };
    const admin = { username: 'superadmin', displayName: 'Super Admin', role: 'Super Admin', isSuperAdmin: true };

    await feedbackService.createTicket({ type: 'bug', message: 'Bug user 1' }, user1);
    await feedbackService.createTicket({ type: 'saran', message: 'Saran user 2' }, user2);

    const ticketsUser1 = feedbackService.getTickets(user1);
    assert.equal(ticketsUser1.length, 1);
    assert.equal(ticketsUser1[0].reporter.username, 'user_satu');

    const ticketsUser2 = feedbackService.getTickets(user2);
    assert.equal(ticketsUser2.length, 1);
    assert.equal(ticketsUser2[0].reporter.username, 'user_dua');

    const ticketsAdmin = feedbackService.getTickets(admin);
    assert.equal(ticketsAdmin.length, 2, 'Super Admin must see all tickets across all users');
  });

  test('should protect against excessive sync requests with backend throttling', async () => {
    const csSession = { username: 'cs_ani', displayName: 'Ani', role: 'Customer Service' };

    // 1st sync (non-throttled)
    const firstSync = await feedbackService.syncTickets(csSession);
    assert.equal(firstSync.success, true);
    assert.notEqual(firstSync.throttled, true);

    // 2nd immediate sync without force -> must be throttled
    const secondSync = await feedbackService.syncTickets(csSession, false);
    assert.equal(secondSync.success, true);
    assert.equal(secondSync.throttled, true);

    // 3rd sync with force = true -> bypasses throttle
    const forceSync = await feedbackService.syncTickets(csSession, true);
    assert.equal(forceSync.success, true);
    assert.notEqual(forceSync.throttled, true);
  });

  test('should merge remote tickets and detect new incoming developer replies for piggybacked sync', async () => {
    const csSession = { username: 'cs_ani', displayName: 'Ani', role: 'Customer Service' };

    // CS creates a local ticket
    const createRes = await feedbackService.createTicket({ type: 'bug', message: 'Chat lambat' }, csSession);
    const ticketId = createRes.ticket.id;
    assert.equal(feedbackService.getUnreadFeedbackCount(csSession), 0);

    // Remote cloud sends back the ticket with an added developer reply
    const remoteTickets = [
      {
        id: ticketId,
        type: 'bug',
        title: 'Chat lambat',
        status: 'in_progress',
        reporter: { username: 'cs_ani', displayName: 'Ani', role: 'Customer Service' },
        createdAt: createRes.ticket.createdAt,
        updatedAt: new Date().toISOString(),
        messages: [
          createRes.ticket.messages[0],
          {
            id: 'msg_dev_reply_123',
            ticketId: ticketId,
            sender: { username: 'developer', displayName: 'Dev Team', role: 'developer' },
            content: 'Kami sedang menginvestigasi masalah ini',
            isDevReply: true,
            timestamp: new Date().toISOString(),
            images: []
          }
        ]
      }
    ];

    const mergeResult = feedbackService.mergeRemoteTicketsDirectly(remoteTickets, csSession);
    assert.equal(mergeResult.success, true);
    assert.equal(mergeResult.hasUpdates, true);
    assert.equal(mergeResult.newDevReplies.length, 1);
    assert.equal(mergeResult.newDevReplies[0].ticketId, ticketId);
    assert.equal(mergeResult.newDevReplies[0].message.content, 'Kami sedang menginvestigasi masalah ini');

    // Verify unread count is updated
    assert.equal(feedbackService.getUnreadFeedbackCount(csSession), 1);
  });
});
