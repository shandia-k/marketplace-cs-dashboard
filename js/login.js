document.addEventListener('DOMContentLoaded', async () => {
  const loginLayout  = document.getElementById('login-layout');
  const appLayout    = document.getElementById('app-layout');
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const resetForm    = document.getElementById('reset-form');
  const loginSubtitle = document.getElementById('login-subtitle');
  const selectUsername = document.getElementById('login-username');

  // Register fields
  const regUsername        = document.getElementById('reg-username');
  const regPassword        = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const regSecurityQuestion = document.getElementById('reg-security-question');
  const regSecurityAnswerGroup = document.getElementById('reg-security-answer-group');
  const regSecurityAnswer  = document.getElementById('reg-security-answer');

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

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function populateUserSelect(selectEl) {
    selectEl.innerHTML = '';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = u.username;
      selectEl.appendChild(opt);
    });
    const lastUser = localStorage.getItem('currentUser');
    if (lastUser && users.find(u => u.username === lastUser)) {
      selectEl.value = lastUser;
    }
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
    loginSubtitle.textContent = 'Pilih akun dan masukkan PIN untuk masuk';
    document.getElementById('reg-footer-back').style.display = 'block';
    populateUserSelect(selectUsername);
    loginPassword.value = '';
  }

  function showRegisterForm(canCancel = true) {
    hideAllForms();
    registerForm.style.display = 'block';
    loginSubtitle.textContent  = 'Buat akun pengguna baru';
    document.getElementById('reg-footer-back').style.display = canCancel ? 'block' : 'none';
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

  // ── Security Question Toggle ───────────────────────────────────────────────────
  regSecurityQuestion.addEventListener('change', () => {
    regSecurityAnswerGroup.style.display = regSecurityQuestion.value ? 'block' : 'none';
  });

  // ── Handle Registration ────────────────────────────────────────────────────────
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = regUsername.value.trim();
    const password = regPassword.value;
    const confirm  = regPasswordConfirm.value;
    const securityQuestion = regSecurityQuestion.value;
    const securityAnswer   = regSecurityAnswer.value.trim();

    if (!username || !password) {
      showToast('Harap isi semua kolom', 'error');
      return;
    }
    if (password !== confirm) {
      showToast('Konfirmasi PIN tidak cocok', 'error');
      return;
    }
    if (securityQuestion && !securityAnswer) {
      showToast('Harap isi jawaban pertanyaan keamanan', 'error');
      return;
    }

    btnRegister.disabled    = true;
    btnRegister.textContent = 'Membuat...';

    try {
      const res = await window.electronAPI.createUser({
        username,
        password,
        securityQuestion: securityQuestion || null,
        securityAnswer: securityAnswer || null
      });
      if (res.success) {
        showToast('Akun berhasil dibuat!', 'success');
        regUsername.value         = '';
        regPassword.value         = '';
        regPasswordConfirm.value  = '';
        regSecurityQuestion.value = '';
        regSecurityAnswer.value   = '';
        regSecurityAnswerGroup.style.display = 'none';
        await initLoginScreen();
      } else {
        showToast(res.error || 'Gagal membuat akun', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
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
        if (typeof window.initApp === 'function') window.initApp();
      } else {
        showToast(res.error || 'PIN salah', 'error');
        loginPassword.value = '';
        loginPassword.focus();
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
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
        // Pre-select the user they just reset
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
