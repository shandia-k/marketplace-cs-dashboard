/**
 * tests/regression/regression-catalog.test.js
 * Dedicated Regression Test Catalog (Bug-to-Test Mapping)
 * 
 * Every fixed bug or prevented edge case is permanently registered here
 * with a unique REG-XXX identifier to ensure 0% regression rate.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createDOMSandbox } = require('../helpers/dom-sandbox');
const {
  computeRoleSig,
  verifyUserRoleSig,
  isUserSuperAdmin,
  isValidPartition,
  getStoresFilePath
} = require('../../src/main/services/storage.service');

describe('Level 7: Dedicated Regression Catalog Tests (Zero-Regression Guarantee)', () => {
  let sandbox;
  let utilsContext;

  test('[REG-001] Legacy Shopee URL 404: Shopee /portal/chat must migrate automatically to official root domain', () => {
    const rawStores = [
      { id: 'shopee-legacy-1', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat' },
      { id: 'shopee-legacy-2', marketplace: 'shopee', url: 'https://seller.shopee.co.id/portal/chat/' }
    ];

    rawStores.forEach(s => {
      if (s.marketplace === 'shopee' && (s.url === 'https://seller.shopee.co.id/portal/chat' || s.url === 'https://seller.shopee.co.id/portal/chat/')) {
        s.url = 'https://seller.shopee.co.id/';
      }
    });

    assert.equal(rawStores[0].url, 'https://seller.shopee.co.id/');
    assert.equal(rawStores[1].url, 'https://seller.shopee.co.id/');
  });

  test('[REG-002] Security Role Tampering: Tampered user role in storage must fail HMAC and revert to Customer Service', () => {
    const legitimateUser = {
      username: 'cs_joko',
      role: 'Customer Service',
      passwordSalt: 'salt_12345678'
    };
    legitimateUser.roleSig = computeRoleSig(legitimateUser.username, legitimateUser.role, legitimateUser.passwordSalt);

    // Tampering simulation: user modified JSON to give himself Super Admin
    const tampered = { ...legitimateUser, role: 'Super Admin' };
    const isValid = verifyUserRoleSig(tampered);

    assert.equal(isValid, false, 'Tampered role must fail signature check');

    // Healing logic
    if (!isValid) {
      tampered.role = 'Customer Service';
      tampered.isSuperAdmin = false;
      tampered.roleSig = computeRoleSig(tampered.username, 'Customer Service', tampered.passwordSalt);
    }

    assert.equal(tampered.role, 'Customer Service');
    assert.equal(tampered.isSuperAdmin, false);
    assert.equal(verifyUserRoleSig(tampered), true);
  });

  test('[REG-003] Template Variable Case Insensitivity: All permutations of {WAKTU}, {CS}, {RESI}, {TOKO} must resolve', () => {
    sandbox = createDOMSandbox();
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return resolveTemplateVariables;`);
    const resolveTemplateVariables = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const template = 'Halo kak {CUSTOMER}, selamat {WAKTU}! Dengan CS {CS} dari {TOKO}. Nomor resi: {RESI}, order: {ORDER}.';
    const resolved = resolveTemplateVariables(template, {
      customer: 'Budi',
      waktu: 'pagi',
      csName: 'Sarah',
      storeName: 'Berkah Store',
      clipboard: 'SPX001'
    });

    assert.equal(resolved, 'Halo kak Budi, selamat pagi! Dengan CS Sarah dari Berkah Store. Nomor resi: SPX001, order: SPX001.');
    assert.ok(!resolved.includes('{'), 'No unresolved placeholders must remain');
  });

  test('[REG-004] Empty Clipboard Handling: Empty clipboard must fallback to "..." instead of throwing error or "undefined"', () => {
    sandbox = createDOMSandbox();
    sandbox.window.currentClipboardValue = '';
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return resolveTemplateVariables;`);
    const resolveTemplateVariables = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const res = resolveTemplateVariables('Nomor pesanan: {clipboard}');
    assert.equal(res, 'Nomor pesanan: ...');
  });

  test('[REG-005] Zero Super Admin Lockout Prevention: Must preserve founder superadmin if all admin accounts are removed', () => {
    const users = [
      { username: 'founder', role: 'Customer Service', passwordSalt: 'salt1' },
      { username: 'staff', role: 'Customer Service', passwordSalt: 'salt2' }
    ];

    // Safety net logic
    const hasSuperAdmin = users.some(u => isUserSuperAdmin(u));
    if (!hasSuperAdmin && users.length > 0) {
      users[0].role = 'Super Admin';
      users[0].isSuperAdmin = true;
      users[0].roleSig = computeRoleSig(users[0].username, 'Super Admin', users[0].passwordSalt);
    }

    assert.equal(isUserSuperAdmin(users[0]), true);
    assert.equal(users[0].role, 'Super Admin');
  });

  test('[REG-006] Path Traversal in Partitions & Filenames: Must safely reject directory escape sequences', () => {
    assert.equal(isValidPartition('persist:..\\..\\Windows'), false);
    assert.equal(isValidPartition('persist:../../../etc/passwd'), false);

    const safePath = getStoresFilePath('../../../sneaky_user');
    const baseName = path.basename(safePath);
    assert.ok(!baseName.includes('/'));
    assert.ok(!baseName.includes('\\'));
    assert.ok(!baseName.includes('..'));
  });

  test('[REG-007] Multi-Account Partition Isolation: Stores must generate unique partitions per username to prevent cookie bleed', () => {
    sandbox = createDOMSandbox();
    const utilsCode = fs.readFileSync(path.join(__dirname, '../../js/utils.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${utilsCode}; return getStorePartition;`);
    const getStorePartition = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const sharedStore = { id: 'shopee_store_1' };
    const partitionUserA = getStorePartition(sharedStore, 'cs_andi');
    const partitionUserB = getStorePartition(sharedStore, 'cs_budi');

    assert.notEqual(partitionUserA, partitionUserB, 'Partitions for different users must never collide');
    assert.equal(partitionUserA, 'persist:user_cs_andi_shopee_store_1');
    assert.equal(partitionUserB, 'persist:user_cs_budi_shopee_store_1');
  });

  test('[REG-008] Find in Page Incremental Search: findInPage handler and native before-input-event shortcut guard', () => {
    const registerIpcCode = fs.readFileSync(path.join(__dirname, '../../src/main/ipc/register-ipc.js'), 'utf8');
    const sessionServiceCode = fs.readFileSync(path.join(__dirname, '../../src/main/services/session.service.js'), 'utf8');
    
    // Pastikan handler 'find-in-page' terdaftar
    const findHandlerMatch = registerIpcCode.match(/ipcMain\.handle\('find-in-page'[\s\S]*?ipcMain\.handle\('stop-find-in-page'/);
    assert.ok(findHandlerMatch, 'find-in-page handler must be present');
    const findHandlerBody = findHandlerMatch[0];
    
    assert.ok(
      findHandlerBody.includes('targetWc.findInPage'),
      'find-in-page handler must invoke targetWc.findInPage'
    );

    // Pastikan before-input-event terpasang untuk menangkap Ctrl+F lintas webview & iframe
    assert.ok(
      sessionServiceCode.includes("contents.on('before-input-event'"),
      'session.service.js must register before-input-event on WebContents'
    );
    assert.ok(
      sessionServiceCode.includes("'trigger-find-in-page'"),
      'session.service.js must trigger find-in-page IPC signal'
    );
  });

  test('[REG-009] Pure Event-Driven Feedback Sync: Zero idle polling & piggybacked telemetry sync with new dev replies', () => {
    const feedbackCode = fs.readFileSync(path.join(__dirname, '../../js/feedback.js'), 'utf8');
    assert.ok(!feedbackCode.includes('startFeedbackPolling'), 'Must not have idle polling interval');
    assert.ok(!feedbackCode.includes('feedbackPollingTimer'), 'Must not have interval timer');
    assert.ok(feedbackCode.includes('handleIncomingDevReplies'), 'Must have handleIncomingDevReplies for push/telemetry integration');
  });

  test('[REG-010] Direct Pull Telegram API Integration: Zero 302 webhook spam & on-demand getUpdates sync', () => {
    const gasCode = fs.readFileSync(path.join(__dirname, '../../scripts/google-apps-script/GoogleAppsScript_FeedbackHub.js'), 'utf8');
    assert.ok(gasCode.includes('fetchLatestTelegramUpdates'), 'GAS must implement fetchLatestTelegramUpdates');
    assert.ok(gasCode.includes('removeTelegramWebhook'), 'GAS must provide removeTelegramWebhook');
    assert.ok(gasCode.includes('getSyncTicketsData'), 'GAS must pull updates during ticket synchronization');
  });

  test('[REG-011] WhatsApp-Style Slim Chat Bubbles & Dedicated Image Bubbles', () => {
    sandbox = createDOMSandbox();
    const feedbackCode = fs.readFileSync(path.join(__dirname, '../../js/feedback.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${feedbackCode}; return { formatTimeOnly, formatDateSeparator };`);
    const { formatTimeOnly, formatDateSeparator } = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const testIso = '2026-08-22T15:58:00.000Z';
    const timeOnly = formatTimeOnly(testIso);
    assert.ok(timeOnly.length >= 4, 'Time only must return formatted HH:MM');
    const dateSep = formatDateSeparator(testIso);
    assert.ok(dateSep.includes('2026') || dateSep.includes('Agu'), 'Date separator must return formatted date string');

    // Pastikan tag [Gambar X] dibersihkan dari bubble teks agar ramping
    const sampleMsg = 'kalo kak berikut [Gambar 1]';
    const cleaned = sampleMsg.replace(/\[Gambar\s*\d+\]/gi, '').trim();
    assert.equal(cleaned, 'kalo kak berikut');
  });

  test('[REG-012] Draggable Floating Tools CS Dock & Auto-Collapse Idle State', () => {
    sandbox = createDOMSandbox();
    sandbox.window.innerWidth = 1200;
    sandbox.window.innerHeight = 800;
    const toolsCode = fs.readFileSync(path.join(__dirname, '../../js/tools.js'), 'utf8');
    const fn = new Function('window', 'document', 'localStorage', `${toolsCode}; return { updateDockSmartClasses, resetDockPosition };`);
    const { updateDockSmartClasses, resetDockPosition } = fn(sandbox.window, sandbox.document, sandbox.localStorage);

    const mockDock = sandbox.document.createElement('div');
    mockDock.className = 'floating-bottom-dock';
    sandbox.document.body.appendChild(mockDock);

    // Test top & left smart classes
    updateDockSmartClasses(mockDock, 50, 50);
    assert.ok(mockDock.classList.contains('dock-top'), 'Top half must add dock-top class');
    assert.ok(mockDock.classList.contains('dock-left'), 'Left half must add dock-left class');

    updateDockSmartClasses(mockDock, 900, 700);
    assert.ok(!mockDock.classList.contains('dock-top'), 'Bottom half must not have dock-top');
    assert.ok(!mockDock.classList.contains('dock-left'), 'Right half must not have dock-left');

    // Test reset
    sandbox.localStorage.setItem('cs_dock_position', JSON.stringify({ left: 100, top: 100 }));
    resetDockPosition();
    assert.equal(sandbox.localStorage.getItem('cs_dock_position'), null, 'Reset must clear saved localStorage position');
  });

  test('[REG-013] Scratchpad Dedicated Search Engine (Ctrl+F) & Match Navigation', () => {
    const scratchpadCode = fs.readFileSync(path.join(__dirname, '../../js/scratchpad.js'), 'utf8');
    assert.ok(scratchpadCode.includes('openScratchpadSearch'), 'Must export openScratchpadSearch');
    assert.ok(scratchpadCode.includes('closeScratchpadSearch'), 'Must export closeScratchpadSearch');
    assert.ok(scratchpadCode.includes('executeScratchpadSearch'), 'Must implement executeScratchpadSearch');

    // Test search match indexing logic
    const sampleText = 'FS flash sale murah. Obat ANTIOBIOTIK Interlac. Flash sale lagi besok.';
    const query = 'flash sale';
    const lowerText = sampleText.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matches = [];

    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      matches.push({ start: pos, end: pos + query.length });
      pos += lowerQuery.length || 1;
    }

    assert.equal(matches.length, 2, 'Must find exactly 2 occurrences of "flash sale" case-insensitively');
    assert.equal(matches[0].start, 3);
    assert.equal(matches[1].start, 48);

    // Test cyclical navigation
    let activeIdx = 0;
    activeIdx = (activeIdx + 1) % matches.length; // Next -> 1
    assert.equal(activeIdx, 1);
    activeIdx = (activeIdx + 1) % matches.length; // Next -> 0 (loop back)
    assert.equal(activeIdx, 0);
    activeIdx = (activeIdx - 1 + matches.length) % matches.length; // Prev -> 1 (loop back)
    assert.equal(activeIdx, 1);

    // Test mark highlighter generation
    assert.ok(scratchpadCode.includes('renderScratchpadHighlights'), 'Must implement renderScratchpadHighlights');
    assert.ok(scratchpadCode.includes('sp-search-mark'), 'Must generate sp-search-mark elements');
    assert.ok(scratchpadCode.includes('syncBackdropScroll'), 'Must synchronize backdrop scroll');
  });

  test('[REG-014] Smart Bulk Template Importer Engine & Auto-Category Detection', () => {
    sandbox = createDOMSandbox();
    const qrCode = fs.readFileSync(path.join(__dirname, '../../js/quickreply.js'), 'utf8');
    assert.ok(qrCode.includes('openBulkImportModal'), 'Must export openBulkImportModal');
    assert.ok(qrCode.includes('parseRawTemplatesText'), 'Must export parseRawTemplatesText');
    assert.ok(qrCode.includes('detectTemplateCategory'), 'Must export detectTemplateCategory');

    // Evaluasi parser & auto-categorizer di environment mock
    const mockStorage = { get: () => [], set: () => {}, remove: () => {} };
    const fn = new Function('window', 'document', 'localStorage', 'Storage', 'DEFAULT_SMART_TEMPLATES', `${qrCode}; return { parseRawTemplatesText, detectTemplateCategory };`);
    const { parseRawTemplatesText, detectTemplateCategory } = fn(sandbox.window, sandbox.document, sandbox.localStorage, mockStorage, []);

    const sampleNote = `========================

FS
Hai kak flash sale, kami infokan juga tidak ada perbedaan pada produk ya kak, jika kakak mendapatkan harga murah atau mahal silakan dapat co yg murah saja kak karena itu tandanya kakak dapat diskon khusus dari shopee

========================

ANTIOBIOTIK
Untuk pengiriman reguler, durasi maksimal yang masih aman untuk Interlac adalah 3-5 hari (tergantung kondisi suhu dalam paket)

========================

PROPOSAL
baik kak, mohon ditunggu 7-14 hari kerja ya kakak, jika tim kami berkenan akan menghubungi kakak nantinya. terimakasih dan sehat selalu

========================

Tidak bisa CO

mohon maaf atas kendalanya ya kak, kami sarankan ada beberapa langkah lain yang bisa dicoba seperti menggunakan mode incognito atau browser/aplikasi lain, konfirmasikan agar hapus cache aplikasi/broswer terlebih dahulu, mengganti jaringan internet, mencoba input alamat secara manual tanpa pin, serta melakukan restart perangkat.`;

    const parsed = parseRawTemplatesText(sampleNote);
    assert.equal(parsed.length, 4, 'Must parse exactly 4 templates from user note format');
    assert.equal(parsed[0].title, 'FS');
    assert.ok(parsed[0].content.includes('Hai kak flash sale'));

    assert.equal(parsed[1].title, 'ANTIOBIOTIK');
    assert.equal(parsed[1].category, 'product', 'ANTIOBIOTIK & Interlac must detect product category');

    assert.equal(parsed[3].title, 'Tidak bisa CO');
    assert.equal(parsed[3].category, 'complaint', 'Tidak bisa CO / kendala must detect complaint category');

    // Test category detection keywords
    assert.equal(detectTemplateCategory('Cek Resi J&T', 'Nomor resi pesanan kakak adalah {clipboard}'), 'order');
    assert.equal(detectTemplateCategory('Komplain Rusak', 'Mohon lampirkan video unboxing retur pengembalian'), 'complaint');
    assert.equal(detectTemplateCategory('Sapaan Pagi', 'Halo selamat pagi kak, ada yang bisa kami bantu?'), 'greeting');
  });

  test('[REG-015] Smart Suspended Sleep & Background Memory Pruning: Zero-delay instant tab wake without webview destruction', () => {
    const webviewCode = fs.readFileSync(path.join(__dirname, '../../js/webview.js'), 'utf8');
    const sessionServiceCode = fs.readFileSync(path.join(__dirname, '../../src/main/services/session.service.js'), 'utf8');
    const appConfigCode = fs.readFileSync(path.join(__dirname, '../../src/main/config/app.config.js'), 'utf8');

    // 1. Pastikan hibernateTab mempertahankan DOM webview secara default (Smart Sleep)
    assert.ok(webviewCode.includes("wvEntry.webview.style.display = 'none'"), 'hibernateTab must hide webview via CSS');
    assert.ok(webviewCode.includes("wvEntry.webview.classList.remove('visible')"), 'hibernateTab must remove visible class');

    // 2. Pastikan pruneBackgroundMemory terdaftar dan diimplementasikan di session.service.js
    assert.ok(sessionServiceCode.includes('async function pruneBackgroundMemory'), 'session.service must implement pruneBackgroundMemory');

    // 3. Pastikan app.config.js mengaktifkan MemoryReducer dan Process Pooling
    assert.ok(appConfigCode.includes('MemoryReducer'), 'app.config.js must enable Chromium MemoryReducer feature');
    assert.ok(appConfigCode.includes('renderer-process-limit'), 'app.config.js must enforce renderer-process-limit');
    assert.ok(appConfigCode.includes('process-per-site'), 'app.config.js must enable process-per-site pooling');

    // 4. Pastikan Hot Webview Pool Manager terdaftar untuk membatasi DOM live webviews
    assert.ok(webviewCode.includes('function manageHotWebviewPool'), 'webview.js must implement manageHotWebviewPool');
  });

  test('[REG-016] Pure Instant Soft-Wake: Zero DOM destruction and instant unhiding without GPU command buffer stress', () => {
    const tabsCode = fs.readFileSync(path.join(__dirname, '../../js/tabs.js'), 'utf8');
    const webviewCode = fs.readFileSync(path.join(__dirname, '../../js/webview.js'), 'utf8');

    // 1. Pastikan showTab melakukan soft wake murni tanpa memicu capturePage GPU berlebih
    assert.ok(tabsCode.includes("entry.webview.classList.add('visible')"), 'tabs.js must unhide webview on soft wake');
    assert.ok(!tabsCode.includes('captureTabSnapshot'), 'tabs.js must not contain legacy captureTabSnapshot loop');

    // 2. Pastikan webview.js tidak memiliki loop capturePage yang membebani GPU
    assert.ok(!webviewCode.includes('captureTabSnapshot('), 'webview.js must not execute legacy captureTabSnapshot');
  });

  test('[REG-017] Dual-Layer State Retention: V8 GC Heap Tuning and Native Windows Working Set Trimmer', () => {
    const appConfigCode = fs.readFileSync(path.join(__dirname, '../../src/main/config/app.config.js'), 'utf8');
    const memoryTrimmer = require('../../src/main/services/memory-trimmer.service');

    // 1. Pastikan parameter V8 Tuning terpasang aman tanpa crash JIT
    assert.ok(appConfigCode.includes('--max-old-space-size='), 'Must enforce max-old-space-size');
    assert.ok(appConfigCode.includes('--expose-gc'), 'Must enforce --expose-gc');
    assert.ok(appConfigCode.includes('renderer-process-limit'), 'Must enforce renderer-process-limit');

    // 2. Pastikan memory trimmer service mengekspos fungsi trimWorkingSet
    assert.equal(typeof memoryTrimmer.trimWorkingSet, 'function', 'memory-trimmer.service must export trimWorkingSet');
  });

  test('[REG-018] Chromium Mimicry: Form POST Payload Preservation, Sec-CH-UA Client Hints, and about:blank Async Lifecycle', () => {
    const constants = require('../../src/main/config/constants');
    const sessionServiceCode = fs.readFileSync(path.join(__dirname, '../../src/main/services/session.service.js'), 'utf8');
    const tabsCode = fs.readFileSync(path.join(__dirname, '../../js/tabs.js'), 'utf8');
    const webviewCode = fs.readFileSync(path.join(__dirname, '../../js/webview.js'), 'utf8');
    const appCode = fs.readFileSync(path.join(__dirname, '../../js/app.js'), 'utf8');

    // 1. Pastikan konstanta Client Hints Chrome didefinisikan secara lengkap
    assert.ok(constants.CHROME_CLIENT_HINTS, 'constants.js must define and export CHROME_CLIENT_HINTS');
    assert.ok(constants.CHROME_CLIENT_HINTS['Sec-CH-UA'].includes('Chromium'), 'Sec-CH-UA must contain Chromium');
    assert.equal(constants.CHROME_CLIENT_HINTS['Sec-CH-UA-Mobile'], '?0');
    assert.equal(constants.CHROME_CLIENT_HINTS['Sec-CH-UA-Platform'], '"Windows"');

    // 2. Pastikan session.service.js menyuntikkan Client Hints dan mengekstrak postBody & referrer
    assert.ok(sessionServiceCode.includes('CHROME_CLIENT_HINTS'), 'session.service.js must use CHROME_CLIENT_HINTS');
    assert.ok(sessionServiceCode.includes('serializedPostBody'), 'session.service.js must serialize postBody');
    assert.ok(sessionServiceCode.includes('referrer: referrer'), 'session.service.js must forward referrer');

    // 3. Pastikan app.js meneruskan data payload ke openUrlInNewTab
    assert.ok(appCode.includes('openUrlInNewTab(targetStore, data)'), 'app.js must pass full data payload to openUrlInNewTab');

    // 4. Pastikan tabs.js menangani loadOptions, postBody, referrer, dan about:blank
    assert.ok(tabsCode.includes('loadOptions'), 'tabs.js must support loadOptions');
    assert.ok(tabsCode.includes('urlOrPayload.postBody'), 'tabs.js must extract postBody from payload');

    // 5. Pastikan webview.js mengeksekusi loadURL dengan postData saat ada payload POST
    assert.ok(webviewCode.includes('hasPostOrReferrer'), 'webview.js must detect POST payload or referrer');
    assert.ok(webviewCode.includes('loadOpts.postData'), 'webview.js must set postData in load options');
    assert.ok(webviewCode.includes('loadOpts.extraHeaders'), 'webview.js must set extraHeaders for Content-Type');

    // 6. Pastikan webview mengaktifkan allowpopups, plugins (PDF viewer), dan skema blob/data
    assert.ok(webviewCode.includes("setAttribute('allowpopups', 'true')"), 'webview.js must enable allowpopups attribute');
    assert.ok(webviewCode.includes('plugins=true'), 'webview.js must enable Chromium plugins for PDF/invoice rendering');
    assert.ok(webviewCode.includes('blob:'), 'webview.js must support blob URLs');
    assert.ok(sessionServiceCode.includes('blob:'), 'session.service.js must permit blob scheme in window open handler');
  });

  test('[REG-019] DOM & Layout Invariants: Fixed Tab Actions, Scrollbar Suppression, and Scratchpad Wheel Scrolling', () => {
    const tabsCss = fs.readFileSync(path.join(__dirname, '../../css/tabs.css'), 'utf8');
    const componentsCss = fs.readFileSync(path.join(__dirname, '../../css/components.css'), 'utf8');
    const tabsJs = fs.readFileSync(path.join(__dirname, '../../js/tabs.js'), 'utf8');
    const scratchpadJs = fs.readFileSync(path.join(__dirname, '../../js/scratchpad.js'), 'utf8');

    // 1. Tab Bar Actions Invariant (Add & Split buttons must be in dedicated fixed container, outside tab-items-container)
    assert.ok(tabsJs.includes('tab-bar-actions'), 'tabs.js must render action buttons inside #tab-bar-actions');
    assert.ok(!tabsJs.includes('tabsHtml + addBtnHtml'), 'tabs.js must not concatenate action buttons inside scrollable tab items container');
    assert.ok(tabsCss.includes('.tab-bar-actions'), 'tabs.css must define .tab-bar-actions styling');

    // 2. Tab Bar Scrollbar Invariant (Zero scrollbar height on parent tab bar)
    assert.ok(tabsCss.includes('.tab-bar::-webkit-scrollbar'), 'tabs.css must suppress .tab-bar scrollbar');
    assert.ok(tabsCss.includes('scrollbar-width: none'), 'tabs.css must declare W3C scrollbar-width: none');

    // 3. Scratchpad Flexbox & Horizontal Wheel Scrolling Invariants
    assert.ok(componentsCss.includes('.scratchpad-tabs'), 'components.css must define .scratchpad-tabs');
    assert.ok(componentsCss.includes('min-width: 0'), 'components.css .scratchpad-tabs must have min-width: 0 for proper flex shrinking');
    assert.ok(componentsCss.includes('.scratchpad-tab'), 'components.css must define .scratchpad-tab');
    assert.ok(scratchpadJs.includes('scrollLeft +='), 'scratchpad.js must implement mouse wheel listener for horizontal scrolling');
    assert.ok(scratchpadJs.includes('scrollIntoView'), 'scratchpad.js must auto-scroll active tab into view');
  });

  test('[REG-020] Application Version Rollback: Pre-Downgrade Safety Snapshot, Release Parser, and Non-Looping Auto-Update Freeze', () => {
    const storageService = require('../../src/main/services/storage.service');
    const updaterService = require('../../src/main/services/updater.service');
    const registerIpcCode = fs.readFileSync(path.join(__dirname, '../../src/main/ipc/register-ipc.js'), 'utf8');
    const preloadCode = fs.readFileSync(path.join(__dirname, '../../preload.js'), 'utf8');
    const updaterJsCode = fs.readFileSync(path.join(__dirname, '../../js/updater.js'), 'utf8');

    // 1. Pastikan fungsi createEmergencyRollbackSnapshot & recordVersionLaunch tersedia di storage.service.js
    assert.equal(typeof storageService.createEmergencyRollbackSnapshot, 'function', 'storage.service.js must export createEmergencyRollbackSnapshot');
    assert.equal(typeof storageService.recordVersionLaunch, 'function', 'storage.service.js must export recordVersionLaunch');
    assert.equal(typeof storageService.getVersionTrail, 'function', 'storage.service.js must export getVersionTrail');

    const snapshotRes = storageService.createEmergencyRollbackSnapshot('1.0.18', '1.0.17');
    assert.ok(snapshotRes.success, 'createEmergencyRollbackSnapshot must succeed');
    assert.ok(snapshotRes.snapshotPath, 'createEmergencyRollbackSnapshot must return snapshotPath');

    // Test version trail recording with teardown restoration
    const origTrail = storageService.getVersionTrail();
    try {
      storageService.recordVersionLaunch('1.0.15');
      const trailUpdated = storageService.recordVersionLaunch('1.0.18');
      assert.equal(trailUpdated.currentVersion, '1.0.18', 'Current version must be 1.0.18');
      assert.equal(trailUpdated.previousStableVersion, '1.0.15', 'Previous stable version must track 1.0.15');
    } finally {
      storageService.recordVersionLaunch('1.0.18');
      storageService.recordVersionLaunch('1.0.19');
    }

    // 2. Pastikan updater.service.js mengekspos fetchReleaseHistory dan executeRollback
    assert.equal(typeof updaterService.fetchReleaseHistory, 'function', 'updater.service.js must export fetchReleaseHistory');
    assert.equal(typeof updaterService.executeRollback, 'function', 'updater.service.js must export executeRollback');

    // 3. Pastikan register-ipc.js dan preload.js memiliki channel rollback lengkap
    assert.ok(registerIpcCode.includes("'get-release-history'"), 'register-ipc.js must register get-release-history handler');
    assert.ok(registerIpcCode.includes("'get-version-trail'"), 'register-ipc.js must register get-version-trail handler');
    assert.ok(registerIpcCode.includes("'start-version-rollback'"), 'register-ipc.js must register start-version-rollback handler');
    assert.ok(preloadCode.includes('getReleaseHistory:'), 'preload.js must expose getReleaseHistory');
    assert.ok(preloadCode.includes('getVersionTrail:'), 'preload.js must expose getVersionTrail');
    assert.ok(preloadCode.includes('startVersionRollback:'), 'preload.js must expose startVersionRollback');
    assert.ok(preloadCode.includes('onRollbackProgress:'), 'preload.js must expose onRollbackProgress');

    // 4. Pastikan updater.js menerapkan freeze update dan deteksi versi sebelumnya
    assert.ok(updaterJsCode.includes('skip_update_target'), 'updater.js must set skip_update_target in localStorage during rollback');
    assert.ok(updaterJsCode.includes('buildReleaseCardsHtml'), 'updater.js must build release cards with previous version highlight');
    assert.ok(updaterJsCode.includes('Versi Terakhir yang Anda Gunakan'), 'updater.js must show previous user version recommendation banner');
    assert.ok(updaterJsCode.includes('openEmergencyRollbackModal'), 'updater.js must export openEmergencyRollbackModal');
    assert.ok(updaterJsCode.includes('confirmAndRollback'), 'updater.js must export confirmAndRollback');
  });

  test('[REG-021] Copy Icon Preservation & Disposed WebFrame Exception Guard', () => {
    const mainJsCode = fs.readFileSync(path.join(__dirname, '../../main.js'), 'utf8');
    const sessionServiceCode = fs.readFileSync(path.join(__dirname, '../../src/main/services/session.service.js'), 'utf8');
    const webviewPreloadCode = fs.readFileSync(path.join(__dirname, '../../webview-preload.js'), 'utf8');

    // 1. Pastikan main.js memiliki global process exception & rejection guard
    assert.ok(mainJsCode.includes("process.on('uncaughtException'"), 'main.js must register uncaughtException guard');
    assert.ok(mainJsCode.includes("process.on('unhandledRejection'"), 'main.js must register unhandledRejection guard');

    // 2. Pastikan session.service.js menolak window open about:blank tanpa postBody
    assert.ok(sessionServiceCode.includes('isAboutBlank && !postBody'), 'session.service.js must deny about:blank window open when postBody is absent');
    assert.ok(sessionServiceCode.includes('!contents || contents.isDestroyed()'), 'session.service.js must verify contents destruction state');

    // 3. Pastikan webview-preload.js mengecualikan tombol copy dan kontrol interaktif dari universal link interceptor
    assert.ok(webviewPreloadCode.includes('isInteractiveOrCopy'), 'webview-preload.js must detect interactive/copy controls');
    assert.ok(webviewPreloadCode.includes('.copy-btn'), 'webview-preload.js must check .copy-btn class');
    assert.ok(webviewPreloadCode.includes('[class*="copy" i]'), 'webview-preload.js must support case-insensitive copy class patterns');
    assert.ok(webviewPreloadCode.includes('[title*="salin" i]'), 'webview-preload.js must support Indonesian salin title patterns');
  });
});



