// Socket.IO Client Wrapper with Reconnection Management and Polling Fallback.
// When the backend is Vercel-only (no persistent Socket.IO server), the client
// automatically switches to 2.5-second HTTP polling of /api/game/state so all
// real-time features continue to work without Socket.IO.
class QuizSocket {
  constructor() {
    this.socket = null;
    this.statusBadge = null;
    this.statusText = null;
    this.callbacks = new Map();   // event -> [handler, ...]
    this._pollInterval = null;
    this._polling = false;
  }

  init(socketUrl = window.location.origin) {
    if (this.socket || this._polling) return this._polling ? this : this.socket;

    this.statusBadge = document.getElementById('connection-badge');
    this.statusText  = document.getElementById('connection-status-text');

    this.updateStatus('Connecting', 'amber');

    // If the server told us to use polling, skip Socket.IO entirely.
    if (window.AppConfig && window.AppConfig.realtime === 'polling') {
      this._startPolling();
      return this;
    }

    // Socket.IO is optional for pages that only need HTTP/API functionality.
    if (typeof window.io !== 'function') {
      this._startPolling();
      return this;
    }

    this.socket = window.io(socketUrl, {
      reconnection:           true,
      reconnectionAttempts:   Infinity,
      reconnectionDelay:      1000,
      reconnectionDelayMax:   5000,
      timeout:                10000,
      transports:             ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.updateStatus('Connected', 'emerald');
      // Auto-re-register team if stored in session/localStorage
      const savedTeamId = localStorage.getItem('kdk_team_id');
      if (savedTeamId) this.socket.emit('register_team', { teamId: savedTeamId });
    });

    this.socket.on('disconnect', () => this.updateStatus('Disconnected', 'magenta'));
    this.socket.on('reconnect_attempt', () => this.updateStatus('Reconnecting', 'amber'));
    this.socket.on('reconnect', () => {
      this.updateStatus('Connected', 'emerald');
      const savedTeamId = localStorage.getItem('kdk_team_id');
      if (savedTeamId) this.socket.emit('register_team', { teamId: savedTeamId });
    });

    // Fall back to polling if socket fails to connect within 8 seconds.
    const connectTimeout = setTimeout(() => {
      if (!this.socket || !this.socket.connected) {
        this.socket.disconnect();
        this.socket = null;
        this._startPolling();
      }
    }, 8000);

    this.socket.on('connect', () => clearTimeout(connectTimeout));

    return this.socket;
  }

  // ----- Polling fallback implementation -----
  _startPolling() {
    if (this._polling) return;
    this._polling = true;
    this.updateStatus('Polling', 'amber');

    let lastStateJson = null;

    const poll = async () => {
      try {
        const token = localStorage.getItem('kdk_admin_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/game/state', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;

        const stateJson = JSON.stringify(data.state);
        if (stateJson === lastStateJson) return;   // nothing changed
        lastStateJson = stateJson;

        // Fire game_state_updated so all pages update without any code change.
        this._fire('game_state_updated', data.state);

        // Derive convenience events pages might listen to.
        const s = data.state;
        if (s.status === 'ACTIVE')   this._fire('game_started',  s);
        if (s.status === 'ENDED')    this._fire('game_ended',     s);
        if (s.answerRevealed)        this._fire('answer_revealed', s);
        if (s.leaderboardVisible)    this._fire('leaderboard_shown', s);
        if (!s.leaderboardVisible)   this._fire('leaderboard_hidden', s);

        this.updateStatus('Live', 'emerald');
      } catch (_) {
        this.updateStatus('Offline', 'magenta');
      }
    };

    poll();   // immediate first fetch
    this._pollInterval = setInterval(poll, 2500);
  }

  _fire(event, data) {
    const handlers = this.callbacks.get(event) || [];
    handlers.forEach(h => { try { h(data); } catch (_) {} });
  }

  stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  // ----- Public interface (same as real socket) -----
  updateStatus(status, colorName) {
    if (this.statusText) this.statusText.textContent = status;
    if (this.statusBadge) {
      this.statusBadge.className = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        colorName === 'emerald' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
        : colorName === 'amber' ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
        : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
      }`;
    }
  }

  on(event, handler) {
    // Register on real socket if available.
    if (this.socket) {
      this.socket.on(event, handler);
      return;
    }
    // Otherwise store for polling fallback.
    if (!this.callbacks.has(event)) this.callbacks.set(event, []);
    this.callbacks.get(event).push(handler);
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
    // In polling mode, join_admin / join_projector / register_team are no-ops
    // (the server doesn't need them when all state is fetched via HTTP).
  }
}

window.quizSocket = new QuizSocket();

