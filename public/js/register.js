document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();
  // Socket.IO is optional for registration. The form must still work if the
  // realtime client is unavailable during deployment.
  let socket = null;
  try {
    if (window.quizSocket && typeof window.quizSocket.init === 'function' && typeof window.io === 'function') {
      socket = window.quizSocket.init(window.AppConfig.socketUrl);
    }
  } catch (socketError) {
    console.warn('Realtime connection unavailable during registration:', socketError);
  }

  const avatars = [
    { icon: '⚡', label: 'Lightning' },
    { icon: '🚀', label: 'Rocket' },
    { icon: '🤖', label: 'Cyborg' },
    { icon: '🛡️', label: 'Shield' },
    { icon: '🦅', label: 'Falcon' },
    { icon: '🐉', label: 'Dragon' },
    { icon: '⚙️', label: 'Gear' },
    { icon: '🛰️', label: 'Satellite' },
    { icon: '🔬', label: 'Quantum' },
    { icon: '💻', label: 'Matrix' },
    { icon: '🎯', label: 'Target' },
    { icon: '🌌', label: 'Cosmos' }
  ];

  const grid = document.getElementById('avatar-grid');
  const avatarInput = document.getElementById('selectedAvatar');
  const form = document.getElementById('registration-form');
  const errorBox = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  // Populate Avatars
  avatars.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `h-11 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl transition-all border ${
      index === 0
        ? 'border-cyan bg-cyan/20 text-cyan shadow-[0_0_10px_rgba(0,229,255,0.4)]'
        : 'border-white/10 bg-card hover:border-cyan/50 hover:bg-white/5 text-white'
    }`;
    btn.setAttribute('aria-label', item.label);
    btn.textContent = item.icon;

    btn.addEventListener('click', () => {
      document.querySelectorAll('#avatar-grid button').forEach(b => {
        b.className = 'h-11 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl transition-all border border-white/10 bg-card hover:border-cyan/50 hover:bg-white/5 text-white';
      });
      btn.className = 'h-11 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl transition-all border border-cyan bg-cyan/20 text-cyan shadow-[0_0_10px_rgba(0,229,255,0.4)]';
      avatarInput.value = item.icon;
    });

    grid.appendChild(btn);
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    errorBox.textContent = '';

    const teamName = document.getElementById('teamName').value.trim();
    const leaderName = document.getElementById('leaderName').value.trim();
    const avatar = avatarInput.value.trim();

    if (!teamName || !leaderName || !avatar) {
      errorBox.textContent = 'Please fill out all required fields.';
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    submitBtn.innerHTML = `<span>Registering...</span>`;

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: teamName,
          leaderName,
          avatar
        })
      });

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(`Server returned ${res.status} without valid JSON. Please check the deployment.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Registration failed (HTTP ${res.status})`);
      }

      // Store team session credentials in localStorage
      localStorage.setItem('kdk_team_id', data.team.id);
      localStorage.setItem('kdk_team_name', data.team.name);
      localStorage.setItem('kdk_team_avatar', data.team.avatar);
      localStorage.setItem('kdk_session_token', data.team.sessionToken);

      // Register with Socket.IO
      if (socket) {
        socket.emit('register_team', { teamId: data.team.id });
      }

      // Navigate to Waiting Lobby
      window.location.href = '/lobby.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      submitBtn.innerHTML = `<span>Join Arena Lobby</span>`;
    }
  });
});
