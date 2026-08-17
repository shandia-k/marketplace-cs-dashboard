document.addEventListener('DOMContentLoaded', async () => {
  const loginLayout  = document.getElementById('login-layout');
  const appLayout    = document.getElementById('app-layout');
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const resetForm    = document.getElementById('reset-form');
  const loginSubtitle = document.getElementById('login-subtitle');
  const selectUsername = document.getElementById('login-username');
  const loginUserGrid  = document.getElementById('login-user-grid');

  // Register fields
  const regUsername        = document.getElementById('reg-username');
  const regDisplayName    = document.getElementById('reg-display-name');
  const regAvatarPreview  = document.getElementById('reg-avatar-preview');
  const regColorSwatches  = document.getElementById('reg-color-swatches');
  const regIconSwatches   = document.getElementById('reg-icon-swatches');
  const regPassword        = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const regSecurityQuestion = document.getElementById('reg-security-question');
  const regSecurityAnswerGroup = document.getElementById('reg-security-answer-group');
  const regSecurityAnswer  = document.getElementById('reg-security-answer');

  // Selected avatar state for register
  let selectedRegColor = AVATAR_COLORS[0];
  let selectedRegIcon  = AVATAR_ICONS[0];

  // Login fields
  const loginPassword = document.getElementById('login-password');
  const btnLogin      = document.getElementById('btn-login');
  const btnRegister   = document.getElementById('btn-register');

  // Reset fields
  const resetUsernameSelect  = document.getElementById('reset-username');
  const resetStep1           = document.getElementById('reset-step-1');
  const resetStep2           = document.getElementById('reset-step-2');
  const resetQuestionBox     = document.getElementById('reset-question-box');
  const resetSecurityAnswer  = document.getElementById('reset-security-answer');
  const resetNewPassword     = document.getElementById('reset-new-password');
  const btnGetQuestion       = document.getElementById('btn-get-question');
  const btnResetPassword     = document.getElementById('btn-reset-password');

  let users = [];

  // ── Password Toggle Helper ───────────────────────────────────────────────────
  function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      // Remove old listeners by replacing or checking flag
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        btn.innerHTML = isPassword ? `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ` : `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        `;
        btn.title = isPassword ? 'Sembunyikan PIN' : 'Lihat PIN';
      });
    });
  }
  window.initPasswordToggles = initPasswordToggles;
  initPasswordToggles();

  // ── Render Avatar Swatches in Register Form ──────────────────────────────────
  function renderRegisterAvatarPicker() {
    if (!regColorSwatches || !regIconSwatches) return;

    regColorSwatches.innerHTML = '';
    AVATAR_COLORS.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `color-swatch-btn ${color === selectedRegColor ? 'active' : ''}`;
      btn.style.backgroundColor = color;
      btn.title = color;
      btn.addEventListener('click', () => {
        selectedRegColor = color;
        regColorSwatches.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.toggle('active', b === btn));
        updateRegAvatarPreview();
      });
      regColorSwatches.appendChild(btn);
    });

    regIconSwatches.innerHTML = '';
    AVATAR_ICONS.forEach(icon => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `icon-swatch-btn ${icon === selectedRegIcon ? 'active' : ''}`;
      btn.textContent = icon;
      btn.addEventListener('click', () => {
        selectedRegIcon = icon;
        regIconSwatches.querySelectorAll('.icon-swatch-btn').forEach(b => b.classList.toggle('active', b === btn));
        updateRegAvatarPreview();
      });
      regIconSwatches.appendChild(btn);
    });

    updateRegAvatarPreview();
  }

  function updateRegAvatarPreview() {
    if (!regAvatarPreview) return;
    regAvatarPreview.style.backgroundColor = selectedRegColor;
    regAvatarPreview.textContent = selectedRegIcon;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function populateUserSelect(selectEl) {
    selectEl.innerHTML = '';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      const isSuperAdmin = !!(u.isSuperAdmin || u.role === 'Super Admin' || u.username === 'superadmin');
      opt.textContent = `${u.displayName || u.username}${isSuperAdmin ? ' (👑 Super Admin)' : ''}`;
      selectEl.appendChild(opt);
    });
    const lastUser = localStorage.getItem('currentUser');
    if (lastUser && users.find(u => u.username === lastUser)) {
      selectEl.value = lastUser;
    }
  }

  function renderLoginUserGrid() {
    if (!loginUserGrid) return;
    loginUserGrid.innerHTML = '';

    if (users.length === 0) {
      loginUserGrid.style.display = 'none';
      if (selectUsername) selectUsername.style.display = 'none';
      return;
    }

    const lastUser = localStorage.getItem('currentUser') || (users[0] && users[0].username);
    const selectedUser = users.find(u => u.username === selectUsername.value) || users.find(u => u.username === lastUser) || users[0];
    if (selectUsername) selectUsername.value = selectedUser.username;

    const userLabel = document.getElementById('login-user-label');

    // ── Kasus 1 Pengguna di Komputer ──────────────────────────
    if (users.length === 1) {
      if (userLabel) userLabel.textContent = 'Masuk Sebagai';
      loginUserGrid.style.display = 'block';
      const u = users[0];
      const isSuperAdmin = !!(u.isSuperAdmin || u.role === 'Super Admin' || u.username === 'superadmin');
      const avatarColor = u.avatarColor || (isSuperAdmin ? '#e11d48' : '#df1683');
      const avatarIcon  = u.avatarIcon || (isSuperAdmin ? '👑' : '👩‍💼');
      const name = u.displayName || u.username;
      const role = isSuperAdmin ? '👑 Super Admin' : (u.role || 'Customer Service');

      loginUserGrid.innerHTML = `
        <div class="user-single-card ${isSuperAdmin ? 'is-superadmin' : ''}">
          <div class="user-single-avatar" style="background-color: ${escapeHtml(avatarColor)}">
            ${escapeHtml(avatarIcon)}
          </div>
          <div class="user-single-info">
            <div class="user-single-name">${escapeHtml(name)}</div>
            <div class="user-single-meta">
              <span class="role-badge ${isSuperAdmin ? 'superadmin' : 'cs'}" style="font-size:11px;padding:3px 10px;">${escapeHtml(role)}</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // ── Kasus Banyak Pengguna (Grid Pilihan) ───────────────────
    if (userLabel) userLabel.textContent = 'Pilih Pengguna';
    loginUserGrid.style.display = 'grid';

    users.forEach(u => {
      const card = document.createElement('div');
      const isSelected = u.username === selectUsername.value;
      const isSuperAdmin = !!(u.isSuperAdmin || u.role === 'Super Admin' || u.username === 'superadmin');
      card.className = `user-selector-card ${isSelected ? 'selected' : ''} ${isSuperAdmin ? 'is-superadmin' : ''}`;
      card.dataset.username = u.username;
      
      const avatarColor = u.avatarColor || (isSuperAdmin ? '#e11d48' : '#df1683');
      const avatarIcon  = u.avatarIcon || (isSuperAdmin ? '👑' : '👩‍💼');
      const name = u.displayName || u.username;
      const role = isSuperAdmin ? '👑 Super Admin' : (u.role || 'CS');

      card.innerHTML = `
        <div class="user-selector-avatar" style="background-color: ${escapeHtml(avatarColor)}">
          ${escapeHtml(avatarIcon)}
        </div>
        <div class="user-selector-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="user-selector-role">${escapeHtml(role)}</div>
      `;

      card.addEventListener('click', () => {
        selectUsername.value = u.username;
        loginUserGrid.querySelectorAll('.user-selector-card').forEach(c => c.classList.toggle('selected', c === card));
        loginPassword.value = '';
        loginPassword.focus();
      });

      loginUserGrid.appendChild(card);
    });
  }

  // ── Show Forms ────────────────────────────────────────────────────────────────
  function hideAllForms() {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'none';
    resetForm.style.display    = 'none';
  }

  function showLoginForm() {
    hideAllForms();
    loginForm.style.display = 'block';
    loginSubtitle.textContent = 'Pilih akun CS dan masukkan PIN untuk masuk';
    document.getElementById('reg-footer-back').style.display = 'block';
    populateUserSelect(selectUsername);
    renderLoginUserGrid();
    loginPassword.value = '';
    setTimeout(() => loginPassword.focus(), 150);
  }

  function showRegisterForm(canCancel = true) {
    hideAllForms();
    registerForm.style.display = 'block';
    loginSubtitle.textContent  = 'Daftarkan akun CS atau Administrator baru';
    document.getElementById('reg-footer-back').style.display = canCancel ? 'block' : 'none';
    renderRegisterAvatarPicker();
    setTimeout(() => regDisplayName?.focus(), 150);
  }

  function showResetForm() {
    hideAllForms();
    resetForm.style.display = 'block';
    loginSubtitle.textContent = 'Reset PIN menggunakan pertanyaan keamanan';
    // Reset to step 1
    resetStep1.style.display = 'block';
    resetStep2.style.display = 'none';
    resetQuestionBox.textContent = '';
    resetSecurityAnswer.value = '';
    resetNewPassword.value    = '';
    populateUserSelect(resetUsernameSelect);
  }

  // ── Init Login Screen ──────────────────────────────────────────────────────────
  async function initLoginScreen() {
    try {
      users = await window.electronAPI.getUsers();
      if (users.length === 0) {
        showRegisterForm(false);
        loginSubtitle.textContent = 'Buat akun administrator pertama Anda';
      } else {
        showLoginForm();
      }
    } catch (err) {
      console.error('Error getting users:', err);
      showToast('Gagal memuat daftar pengguna', 'error');
    }
  }

  // ── Navigation Links ──────────────────────────────────────────────────────────
  document.getElementById('link-to-register').addEventListener('click', e => {
    e.preventDefault();
    showRegisterForm(true);
  });

  document.getElementById('link-to-login').addEventListener('click', e => {
    e.preventDefault();
    showLoginForm();
  });

  document.getElementById('link-forgot-password').addEventListener('click', e => {
    e.preventDefault();
    showResetForm();
  });

  document.getElementById('link-reset-to-login').addEventListener('click', e => {
    e.preventDefault();
    showLoginForm();
  });

  // ── Role & Security Question Toggle ───────────────────────────────────────────
  const regRole = document.getElementById('reg-role');
  const regAdminPinGroup = document.getElementById('reg-admin-pin-group');
  const regAdminPin = document.getElementById('reg-admin-pin');

  if (regRole && regAdminPinGroup) {
    regRole.addEventListener('change', () => {
      const isSA = regRole.value === 'Super Admin';
      // Tampilkan PIN approval hanya jika sudah ada akun terdaftar sebelumnya
      regAdminPinGroup.style.display = (isSA && users.length > 0) ? 'block' : 'none';
      if (isSA) {
        selectedRegIcon = '👑';
        selectedRegColor = '#e11d48';
      } else {
        selectedRegIcon = '👩‍💼';
        selectedRegColor = '#df1683';
      }
      renderRegisterAvatarPicker();
      updateRegAvatarPreview();
    });
  }

  regSecurityQuestion.addEventListener('change', () => {
    regSecurityAnswerGroup.style.display = regSecurityQuestion.value ? 'block' : 'none';
  });

  // ── Handle Registration ────────────────────────────────────────────────────────
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = regDisplayName ? regDisplayName.value.trim() : '';
    const username    = regUsername ? regUsername.value.trim() : '';
    const role        = regRole ? regRole.value : 'Customer Service';
    const password    = regPassword.value;
    const confirm     = regPasswordConfirm.value;
    const adminPin    = regAdminPin ? regAdminPin.value : '';
    const securityQuestion = regSecurityQuestion.value;
    const securityAnswer   = regSecurityAnswer.value.trim();

    if (!displayName) {
      showToast('Harap isi Nama Lengkap / Panggilan CS', 'error');
      regDisplayName?.focus();
      return;
    }
    if (!password) {
      showToast('Harap isi PIN / Password Masuk', 'error');
      regPassword?.focus();
      return;
    }
    if (password !== confirm) {
      showToast('Konfirmasi PIN tidak cocok', 'error');
      return;
    }
    if (role === 'Super Admin' && users.length > 0 && !adminPin) {
      showToast('Harap masukkan PIN Super Admin yang ada untuk otorisasi pembuatan Super Admin baru', 'error');
      regAdminPin?.focus();
      return;
    }
    if (securityQuestion && !securityAnswer) {
      showToast('Harap isi jawaban pertanyaan keamanan', 'error');
      return;
    }

    // Generate safe clean slug username for instant compatibility
    let baseSlug = displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'cs';
    let autoUsername = username || baseSlug;
    if (users.some(u => u.username.toLowerCase() === autoUsername.toLowerCase())) {
      autoUsername = `${baseSlug}_${Date.now().toString(36).slice(-4)}`;
    }

    try {
      const res = await window.electronAPI.createUser({
        username: autoUsername,
        displayName,
        role,
        avatarColor: selectedRegColor,
        avatarIcon: selectedRegIcon,
        password,
        adminApprovalPin: adminPin || null,
        securityQuestion: securityQuestion || null,
        securityAnswer: securityAnswer || null
      });
      if (res.success) {
        showToast(`Akun "${displayName}" (${role === 'Super Admin' ? '👑 Super Admin' : 'CS'}) berhasil dibuat! Silakan masuk.`, 'success');
        if (regUsername) regUsername.value = '';
        if (regDisplayName) regDisplayName.value = '';
        regPassword.value         = '';
        regPasswordConfirm.value  = '';
        if (regAdminPin) regAdminPin.value = '';
        if (regAdminPinGroup) regAdminPinGroup.style.display = 'none';
        if (regRole) regRole.value = 'Customer Service';
        regSecurityQuestion.value = '';
        regSecurityAnswer.value   = '';
        regSecurityAnswerGroup.style.display = 'none';
        if (res.user && res.user.username) {
          localStorage.setItem('currentUser', res.user.username);
        }
        await initLoginScreen();
      } else {
        showToast(res.error || 'Gagal membuat akun', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem: ' + err.message, 'error');
    } finally {
      btnRegister.disabled    = false;
      btnRegister.textContent = 'Buat Akun';
    }
  });

  // ── Handle Login ───────────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = selectUsername.value;
    const password = loginPassword.value;

    if (!username || !password) {
      showToast('Harap pilih pengguna dan masukkan PIN', 'error');
      return;
    }

    btnLogin.disabled    = true;
    btnLogin.textContent = 'Masuk...';

    try {
      const res = await window.electronAPI.loginUser({ username, password });
      if (res.success) {
        localStorage.setItem('currentUser', username);
        loginLayout.style.display = 'none';
        appLayout.style.display   = 'flex';
        window.currentUser = username;
        window.currentUserProfile = res.user || { username, displayName: username, role: 'Customer Service' };
        if (typeof window.initApp === 'function') window.initApp();
      } else {
        showToast(res.error || 'PIN salah', 'error');
        loginPassword.value = '';
        loginPassword.focus();
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem: ' + err.message, 'error');
    } finally {
      btnLogin.disabled    = false;
      btnLogin.textContent = 'Masuk';
    }
  });

  // ── Handle Forgot Password: Step 1 (Fetch Question) ───────────────────────────
  btnGetQuestion.addEventListener('click', async () => {
    const username = resetUsernameSelect.value;
    if (!username) {
      showToast('Pilih pengguna terlebih dahulu', 'error');
      return;
    }

    btnGetQuestion.disabled    = true;
    btnGetQuestion.textContent = 'Memuat...';

    try {
      const res = await window.electronAPI.getSecurityQuestion({ username });
      if (res.success) {
        resetQuestionBox.textContent = res.question;
        resetStep1.style.display = 'none';
        resetStep2.style.display = 'block';
        resetSecurityAnswer.focus();
      } else {
        showToast(res.error || 'Gagal memuat pertanyaan', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btnGetQuestion.disabled    = false;
      btnGetQuestion.textContent = 'Lanjut →';
    }
  });

  // ── Handle Forgot Password: Step 2 (Reset) ────────────────────────────────────
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username       = resetUsernameSelect.value;
    const securityAnswer = resetSecurityAnswer.value.trim();
    const newPassword    = resetNewPassword.value;

    if (!securityAnswer || !newPassword) {
      showToast('Harap isi jawaban dan PIN baru', 'error');
      return;
    }

    btnResetPassword.disabled    = true;
    btnResetPassword.textContent = 'Menyimpan...';

    try {
      const res = await window.electronAPI.resetUserPassword({ username, securityAnswer, newPassword });
      if (res.success) {
        showToast('PIN berhasil direset! Silakan login kembali.', 'success');
        await initLoginScreen();
        if (users.find(u => u.username === username)) {
          selectUsername.value = username;
        }
        loginPassword.focus();
      } else {
        showToast(res.error || 'Gagal mereset PIN', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btnResetPassword.disabled    = false;
      btnResetPassword.textContent = 'Reset PIN';
    }
  });

  // ── Start ──────────────────────────────────────────────────────────────────────
  window.initLoginScreen = initLoginScreen;
  initLoginScreen();
});

