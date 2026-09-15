document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  // Check if already authenticated
  try {
    const token = localStorage.getItem('kdk_admin_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const meRes = await fetch('/api/auth/me', { headers });
    if (meRes.ok) {
      const meData = await meRes.json();
      if (meData.success) {
        window.location.href = '/admin.html';
        return;
      }
    }
  } catch (_) {}

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      errorBox.textContent = 'Please enter both email and password.';
      errorBox.classList.remove('hidden');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.classList.add('opacity-70', 'cursor-not-allowed');
    loginBtn.innerHTML = `<span>Authenticating...</span>`;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(`Server returned ${res.status} without valid JSON. Please redeploy the backend.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Authentication failed (HTTP ${res.status})`);
      }

      // Save token for Authorization headers
      if (data.token) {
        localStorage.setItem('kdk_admin_token', data.token);
      }

      window.location.href = '/admin.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      loginBtn.innerHTML = `<span>Authenticate & Open Dashboard</span>`;
    }
  });
});
