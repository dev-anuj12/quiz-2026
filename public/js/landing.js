document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const qrContainer = document.getElementById('qrcode');
  const joinUrlText = document.getElementById('join-url-text');
  const arenaStatusText = document.getElementById('arena-status-text');
  const statusDot = document.getElementById('status-indicator-dot');
  const joinBtn = document.getElementById('join-arena-btn');

  const joinUrl = window.AppConfig.publicJoinUrl || (window.location.origin + '/register.html');
  if (joinUrlText) {
    joinUrlText.textContent = joinUrl;
  }

  // Generate Dynamic QR Code
  if (qrContainer && typeof QRCode !== 'undefined') {
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: joinUrl,
      width: 180,
      height: 180,
      colorDark: '#0c0e13',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  // Fetch initial game state to display authoritative status
  async function checkArenaStatus() {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) {
        const data = await res.json();
        updateStatusDisplay(data.state);
      }
    } catch (err) {
      if (arenaStatusText) {
        arenaStatusText.textContent = 'Waiting for the host to open the arena.';
      }
    }
  }

  function updateStatusDisplay(state) {
    if (!state) return;

    if (state.status === 'ENDED') {
      if (arenaStatusText) arenaStatusText.textContent = 'Registration is currently closed.';
      if (statusDot) statusDot.className = 'w-3 h-3 rounded-full bg-rose-500';
      if (joinBtn) {
        joinBtn.classList.add('opacity-50', 'pointer-events-none');
        joinBtn.textContent = 'Registration Closed';
      }
    } else if (state.status === 'LOBBY') {
      if (arenaStatusText) arenaStatusText.textContent = 'Registration is OPEN. Enter your team credentials.';
      if (statusDot) statusDot.className = 'w-3 h-3 rounded-full bg-emerald-400 animate-pulse';
      if (joinBtn) {
        joinBtn.classList.remove('opacity-50', 'pointer-events-none');
        joinBtn.innerHTML = `<span>Enter The Arena</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
      }
    } else if (state.status === 'ACTIVE' || state.status === 'PAUSED') {
      if (arenaStatusText) arenaStatusText.textContent = 'Quiz in progress! Enter waiting room if already registered.';
      if (statusDot) statusDot.className = 'w-3 h-3 rounded-full bg-cyan animate-pulse';
    } else {
      if (arenaStatusText) arenaStatusText.textContent = 'Waiting for the host to open the arena.';
      if (statusDot) statusDot.className = 'w-3 h-3 rounded-full bg-amber animate-pulse';
    }
  }

  await checkArenaStatus();

  // Socket.IO real-time updates
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);
  socket.on('game_state_updated', (state) => {
    updateStatusDisplay(state);
  });
  socket.on('game_started', (state) => {
    updateStatusDisplay(state);
  });
  socket.on('game_ended', (state) => {
    updateStatusDisplay(state);
  });
});
