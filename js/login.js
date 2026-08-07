document.addEventListener('DOMContentLoaded', async () => {
  const loginLayout = document.getElementById('login-layout');
  const appLayout = document.getElementById('app-layout');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginSubtitle = document.getElementById('login-subtitle');
  const selectUsername = document.getElementById('login-username');
  
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');
  
  // Elements for registration
  const regUsername = document.getElementById('reg-username');
  const regPassword = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  
  // Elements for login
  const loginPassword = document.getElementById('login-password');
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');

  let users = [];

  // Initialize Login Screen
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

  function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginSubtitle.textContent = 'Pilih akun dan masukkan PIN untuk masuk';
    document.getElementById('reg-footer-back').style.display = 'block';
    
    // Populate select
    selectUsername.innerHTML = '';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = u.username;
      selectUsername.appendChild(opt);
    });
    
    // Remember last logged in user if any
    const lastUser = localStorage.getItem('currentUser');
    if (lastUser && users.find(u => u.username === lastUser)) {
      selectUsername.value = lastUser;
    }
  }

  function showRegisterForm(canCancel = true) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginSubtitle.textContent = 'Buat akun pengguna baru';
    
    document.getElementById('reg-footer-back').style.display = canCancel ? 'block' : 'none';
  }

  linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm(true);
  });

  linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // Handle Registration
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = regUsername.value.trim();
    const password = regPassword.value;
    const confirm = regPasswordConfirm.value;

    if (!username || !password) {
      showToast('Harap isi semua kolom', 'error');
      return;
    }
    
    if (password !== confirm) {
      showToast('Konfirmasi PIN tidak cocok', 'error');
      return;
    }

    btnRegister.disabled = true;
    btnRegister.setAttribute('aria-busy', 'true');
    btnRegister.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-top-color: white; border-right-color: transparent;"></span> Membuat...';

    try {
      const res = await window.electronAPI.createUser({ username, password });
      if (res.success) {
        showToast('Akun berhasil dibuat!', 'success');
        // Clear form
        regUsername.value = '';
        regPassword.value = '';
        regPasswordConfirm.value = '';
        // Reload users
        await initLoginScreen();
      } else {
        showToast(res.error || 'Gagal membuat akun', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btnRegister.disabled = false;
      btnRegister.removeAttribute('aria-busy');
      btnRegister.textContent = 'Buat Akun';
    }
  });

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = selectUsername.value;
    const password = loginPassword.value;

    if (!username || !password) {
      showToast('Harap pilih pengguna dan masukkan PIN', 'error');
      return;
    }

    btnLogin.disabled = true;
    btnLogin.setAttribute('aria-busy', 'true');
    btnLogin.innerHTML = '<span class="spinner" style="width: 14px; height: 14px; border-width: 2px; border-top-color: white; border-right-color: transparent;"></span> Masuk...';

    try {
      const res = await window.electronAPI.loginUser({ username, password });
      if (res.success) {
        // Success login
        localStorage.setItem('currentUser', username);
        loginLayout.style.display = 'none';
        appLayout.style.display = 'flex';
        
        // Let app know who is logged in (global variable for sidebar, etc)
        window.currentUser = username;
        
        // Start main app
        if (typeof window.initApp === 'function') {
          window.initApp();
        }
      } else {
        showToast(res.error || 'PIN salah', 'error');
        loginPassword.value = '';
        loginPassword.focus();
      }
    } catch (err) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      btnLogin.disabled = false;
      btnLogin.removeAttribute('aria-busy');
      btnLogin.textContent = 'Masuk';
    }
  });

  // Check if we need to show login on load
  initLoginScreen();
});
