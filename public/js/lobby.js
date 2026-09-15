// High-Performance 60 FPS Canvas Physics Engine for KDK Induction Quiz Waiting Lobby
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const canvas = document.getElementById('lobby-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const emptyStateOverlay = document.getElementById('empty-state-overlay');
  const teamCounter = document.getElementById('team-counter');
  const myTeamPill = document.getElementById('my-team-pill');
  const myTeamAvatar = document.getElementById('my-team-avatar');
  const myTeamName = document.getElementById('my-team-name');

  // Display user's own registered team badge if present
  const myTeamId = localStorage.getItem('kdk_team_id');
  const myTeamSavedName = localStorage.getItem('kdk_team_name');
  const myTeamSavedAvatar = localStorage.getItem('kdk_team_avatar');

  if (myTeamId && myTeamSavedName) {
    if (myTeamAvatar) myTeamAvatar.textContent = myTeamSavedAvatar || '⚡';
    if (myTeamName) myTeamName.textContent = myTeamSavedName;
    if (myTeamPill) myTeamPill.classList.remove('hidden');
    if (myTeamPill) myTeamPill.classList.add('flex');
  }

  // Resize Handling
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Background Ambient Particles (Very faint particles)
  const bgParticles = [];
  const BG_PARTICLE_COUNT = 35;
  for (let i = 0; i < BG_PARTICLE_COUNT; i++) {
    bgParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.25 + 0.05
    });
  }

  // Active Collision Ripples
  const ripples = [];

  // Team Bubbles Map (teamId -> Bubble)
  const bubbles = new Map();

  class TeamBubble {
    constructor(team, isInitial = false) {
      this.id = team.id;
      this.name = team.name;
      this.avatar = team.avatar || '⚡';
      this.baseRadius = width < 640 ? 38 : 46;
      this.radius = this.baseRadius;
      
      // Spawn at random edge/corner
      if (isInitial) {
        // Initial spread inside arena
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(width, height) * 0.3;
        this.x = width / 2 + Math.cos(angle) * dist;
        this.y = height / 2 + Math.sin(angle) * dist;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.scale = 1.0;
        this.alpha = 1.0;
        this.spawnPulse = 0;
      } else {
        // Edge spawning with inward velocity
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // Top
          this.x = Math.random() * width;
          this.y = -this.radius;
          this.vx = (Math.random() - 0.5) * 1.5;
          this.vy = Math.random() * 2 + 1;
        } else if (side === 1) { // Right
          this.x = width + this.radius;
          this.y = Math.random() * height;
          this.vx = -(Math.random() * 2 + 1);
          this.vy = (Math.random() - 0.5) * 1.5;
        } else if (side === 2) { // Bottom
          this.x = Math.random() * width;
          this.y = height + this.radius;
          this.vx = (Math.random() - 0.5) * 1.5;
          this.vy = -(Math.random() * 2 + 1);
        } else { // Left
          this.x = -this.radius;
          this.y = Math.random() * height;
          this.vx = Math.random() * 2 + 1;
          this.vy = (Math.random() - 0.5) * 1.5;
        }
        this.scale = 0.2;
        this.alpha = 0.1;
        this.spawnPulse = 1.0; // Starts join pulse
      }

      this.mass = this.baseRadius;
      this.phase = Math.random() * Math.PI * 2;
      this.isLeaving = false;
      this.leaveProgress = 0;

      // Deterministic cyber color accent
      const colors = ['#00e5ff', '#d91b5c', '#ffb703', '#00f59b', '#38bdf8', '#e879f9'];
      let hash = 0;
      for (let i = 0; i < this.name.length; i++) {
        hash = (hash << 5) - hash + this.name.charCodeAt(i);
      }
      this.accentColor = colors[Math.abs(hash) % colors.length];
    }

    update(dt, centerX, centerY) {
      // Handle join pulse expansion
      if (this.spawnPulse > 0) {
        this.spawnPulse -= dt * 2.0;
        this.scale = Math.min(1.0, this.scale + dt * 2.5);
        this.alpha = Math.min(1.0, this.alpha + dt * 2.5);
      }

      // Handle removal animation (fade & scale-down)
      if (this.isLeaving) {
        this.leaveProgress += dt * 3.0; // completes in ~330ms
        this.scale = Math.max(0, 1.0 - this.leaveProgress);
        this.alpha = Math.max(0, 1.0 - this.leaveProgress);
        return;
      }

      // Subtle breathing animation
      const breath = Math.sin(Date.now() * 0.003 + this.phase) * 1.8;
      this.radius = (this.baseRadius + breath) * this.scale;

      // Center Gravity
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const distFromCenter = Math.hypot(dx, dy);

      // Stronger attraction when far from center, weak near center
      const centerPull = distFromCenter > 350 ? 0.00045 : 0.00012;
      this.vx += dx * centerPull;
      this.vy += dy * centerPull;

      // Organic subtle floating drift
      this.vx += Math.sin(Date.now() * 0.0015 + this.phase) * 0.02;
      this.vy += Math.cos(Date.now() * 0.0015 + this.phase) * 0.02;

      // Damping / drag
      this.vx *= 0.988;
      this.vy *= 0.988;

      // Position update
      this.x += this.vx;
      this.y += this.vy;

      // Edge Bouncing & Clamp within bounds
      const pad = this.radius;
      if (this.x < pad) {
        this.x = pad;
        this.vx = Math.abs(this.vx) * 0.8;
      } else if (this.x > width - pad) {
        this.x = width - pad;
        this.vx = -Math.abs(this.vx) * 0.8;
      }

      if (this.y < pad + 60) {
        this.y = pad + 60;
        this.vy = Math.abs(this.vy) * 0.8;
      } else if (this.y > height - pad - 50) {
        this.y = height - pad - 50;
        this.vy = -Math.abs(this.vy) * 0.8;
      }
    }

    draw(ctx) {
      if (this.scale <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = this.alpha;

      // 1. Soft avatar-color glow
      ctx.shadowColor = this.accentColor;
      ctx.shadowBlur = 14 * this.scale;

      // 2. Bubble body (Dark card background with subtle stroke)
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#191c21';
      ctx.fill();

      // Outer accent border
      ctx.lineWidth = 2 * this.scale;
      ctx.strokeStyle = this.accentColor;
      ctx.stroke();

      // 3. Draw Avatar (Emoji/Icon)
      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(24 * this.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.avatar, this.x, this.y - 7 * this.scale);

      // 4. Draw Team Name
      ctx.font = `600 ${Math.round(10.5 * this.scale)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = '#f8fafc';
      let displayName = this.name;
      if (displayName.length > 12) {
        displayName = displayName.substring(0, 11) + '…';
      }
      ctx.fillText(displayName, this.x, this.y + 17 * this.scale);

      // Highlight indicator if this is the current user's team
      if (this.id === myTeamId) {
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.radius + 3, 3.5 * this.scale, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Circular Collision Detection, Overlap Correction & Elastic Response
  function handleCollisions() {
    const bubbleList = Array.from(bubbles.values()).filter(b => !b.isLeaving);
    const n = bubbleList.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const b1 = bubbleList[i];
        const b2 = bubbleList[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius + 6; // Separation padding

        if (dist < minDist && dist > 0.001) {
          // Normal vector
          const nx = dx / dist;
          const ny = dy / dist;

          // Overlap correction
          const overlap = minDist - dist;
          b1.x -= nx * (overlap * 0.5);
          b1.y -= ny * (overlap * 0.5);
          b2.x += nx * (overlap * 0.5);
          b2.y += ny * (overlap * 0.5);

          // Relative velocity
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

          // Elastic collision response (coefficient 0.72)
          b1.vx -= p * b2.mass * nx * 0.72;
          b1.vy -= p * b2.mass * ny * 0.72;
          b2.vx += p * b1.mass * nx * 0.72;
          b2.vy += p * b1.mass * ny * 0.72;

          // Small collision ripple effect lasting 150-350ms
          const collisionX = b1.x + nx * b1.radius;
          const collisionY = b1.y + ny * b1.radius;
          ripples.push({
            x: collisionX,
            y: collisionY,
            radius: 2,
            maxRadius: 28,
            color: b1.accentColor,
            alpha: 0.7,
            duration: 0.25, // 250ms
            elapsed: 0
          });
        }
      }
    }
  }

  // Load Real Initial Teams from Backend
  async function loadInitialTeams() {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        if (data.teams && Array.isArray(data.teams)) {
          const serverTeamIds = new Set(data.teams.map(team => team.id));
          data.teams.forEach(team => {
            if (!bubbles.has(team.id)) {
              bubbles.set(team.id, new TeamBubble(team, true));
            } else {
              const existing = bubbles.get(team.id);
              existing.name = team.name;
              existing.avatar = team.avatar || '⚡';
              existing.isLeaving = false;
              existing.alpha = 1;
              existing.scale = 1;
            }
          });

          // Also remove teams that disappeared when Socket.IO is unavailable.
          bubbles.forEach((bubble, id) => {
            if (!serverTeamIds.has(id)) bubble.isLeaving = true;
          });
          updateTeamCountUI();
        }
      }
    } catch (err) {
      console.warn('Could not fetch teams:', err);
    }
  }

  function updateTeamCountUI() {
    const activeCount = Array.from(bubbles.values()).filter(b => !b.isLeaving).length;
    if (teamCounter) teamCounter.textContent = activeCount;
    if (emptyStateOverlay) {
      if (activeCount === 0) {
        emptyStateOverlay.classList.remove('hidden');
      } else {
        emptyStateOverlay.classList.add('hidden');
      }
    }
  }

  await loadInitialTeams();

  // HTTP polling keeps team avatars visible even if realtime WebSockets are
  // temporarily unavailable on the hosting platform.
  setInterval(loadInitialTeams, 3000);

  // Socket.IO Real-time Events
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);

  socket?.on('team_joined', (team) => {
    if (!bubbles.has(team.id)) {
      bubbles.set(team.id, new TeamBubble(team, false));
    } else {
      const existing = bubbles.get(team.id);
      existing.isLeaving = false;
      existing.alpha = 1.0;
      existing.scale = 1.0;
    }
    updateTeamCountUI();
  });

  socket?.on('team_left', (data) => {
    if (data?.all) {
      bubbles.clear();
    } else if (bubbles.has(data.teamId)) {
      const b = bubbles.get(data.teamId);
      b.isLeaving = true;
    }
    updateTeamCountUI();
  });

  socket?.on('teams_cleared', () => {
    localStorage.removeItem('kdk_team_id');
    localStorage.removeItem('kdk_session_token');
    localStorage.removeItem('kdk_team_name');
    localStorage.removeItem('kdk_team_avatar');
    bubbles.clear();
    updateTeamCountUI();
    window.location.href = '/register.html';
  });

  // Authoritative Game Flow Transitions
  socket?.on('game_started', () => {
    window.location.href = '/quiz.html';
  });

  socket?.on('game_state_updated', (state) => {
    if (state && (state.status === 'ACTIVE' || state.status === 'PAUSED')) {
      window.location.href = '/quiz.html';
    }
  });

  // Check state immediately in case game was already active
  fetch('/api/game/state')
    .then(r => r.json())
    .then(d => {
      if (d.state && (d.state.status === 'ACTIVE' || d.state.status === 'PAUSED')) {
        window.location.href = '/quiz.html';
      }
    })
    .catch(() => {});

  // 60 FPS Render Loop
  let lastTime = performance.now();

  function animate(currentTime) {
    const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
    lastTime = currentTime;

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Clear & Render Background
    ctx.fillStyle = '#0c0e13';
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 48;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Soft Center Radial Ambient Glow
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, Math.min(width, height) * 0.45);
    glowGrad.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
    glowGrad.addColorStop(0.5, 'rgba(217, 27, 92, 0.03)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Faint Background Floating Particles
    bgParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
    });

    // 2. Physics & Bubble Collision Updates
    handleCollisions();

    // Clean up leaving bubbles that finished fading
    bubbles.forEach((bubble, id) => {
      bubble.update(dt, centerX, centerY);
      if (bubble.isLeaving && bubble.leaveProgress >= 1.0) {
        bubbles.delete(id);
      }
    });

    // 3. Draw Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      rip.elapsed += dt;
      const prog = rip.elapsed / rip.duration;

      if (prog >= 1.0) {
        ripples.splice(i, 1);
        continue;
      }

      const curRadius = rip.radius + (rip.maxRadius - rip.radius) * prog;
      const curAlpha = rip.alpha * (1.0 - prog);

      ctx.save();
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, curRadius, 0, Math.PI * 2);
      ctx.strokeStyle = rip.color;
      ctx.globalAlpha = curAlpha;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Real Bubbles
    bubbles.forEach(bubble => {
      bubble.draw(ctx);
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});
