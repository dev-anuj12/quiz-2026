// 1080p 16:9 Fullscreen Projector Engine for KDK Induction Quiz 2026
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  // Fullscreen Button
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  });

  // DOM Elements
  const projRoundBadge = document.getElementById('proj-round-badge');
  const projStandby = document.getElementById('proj-standby');
  const projStandbySubtext = document.getElementById('proj-standby-subtext');
  const projActiveQuestion = document.getElementById('proj-active-question');
  const projQuestionText = document.getElementById('proj-question-text');
  const projTimerNum = document.getElementById('proj-timer-num');
  const projOptA = document.getElementById('proj-opt-A');
  const projOptB = document.getElementById('proj-opt-B');
  const projOptC = document.getElementById('proj-opt-C');
  const projOptD = document.getElementById('proj-opt-D');
  const projTextA = document.getElementById('proj-text-A');
  const projTextB = document.getElementById('proj-text-B');
  const projTextC = document.getElementById('proj-text-C');
  const projTextD = document.getElementById('proj-text-D');
  const projPctA = document.getElementById('proj-pct-A');
  const projPctB = document.getElementById('proj-pct-B');
  const projPctC = document.getElementById('proj-pct-C');
  const projPctD = document.getElementById('proj-pct-D');
  const projLeaderboardView = document.getElementById('proj-leaderboard-view');
  const projPodiumDeck = document.getElementById('proj-podium-deck');
  let timerInterval = null;
  let currentState = null;

  // Render Projector QR Code
  const projQrContainer = document.getElementById('proj-qrcode');
  const projJoinUrlLabel = document.getElementById('proj-join-url-label');
  const joinUrl = window.AppConfig.publicJoinUrl || (window.location.origin + '/register.html');

  if (projJoinUrlLabel) {
    projJoinUrlLabel.textContent = joinUrl;
  }

  if (projQrContainer && typeof QRCode !== 'undefined') {
    try {
      projQrContainer.innerHTML = '';
      new QRCode(projQrContainer, {
        text: joinUrl,
        width: 170,
        height: 170,
        colorDark: '#0c0e13',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      console.warn('Projector QR generation error:', e);
    }
  }

  function syncTimer(startedAt, duration, isPaused) {
    if (timerInterval) clearInterval(timerInterval);

    const startMs = startedAt ? new Date(startedAt).getTime() : null;
    const durSec = Number(duration) || 20;

    function update() {
      if (!startMs || isPaused) {
        if (projTimerNum) {
          projTimerNum.textContent = `${durSec}`;
          projTimerNum.className = 'text-6xl font-black font-mono text-cyan tracking-tight';
        }
        return;
      }

      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, Math.ceil(durSec - elapsed));

      if (projTimerNum) {
        projTimerNum.textContent = `${remaining}`;
        if (remaining <= 5) {
          projTimerNum.className = 'text-6xl font-black font-mono text-magenta animate-pulse tracking-tight';
        } else {
          projTimerNum.className = 'text-6xl font-black font-mono text-cyan tracking-tight';
        }
      }
    }

    update();
    timerInterval = setInterval(update, 200);
  }

  async function loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        renderLeaderboard(data);
      }
    } catch (err) {
      console.warn('Could not load leaderboard:', err);
    }
  }

  function renderLeaderboard(data) {
    if (!data || !data.leaderboard || data.leaderboard.length === 0 || !data.hasScores) {
      projPodiumDeck.innerHTML = '';
      projLeaderboardTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-slate-400 font-mono">
            No scores available yet.
          </td>
        </tr>
      `;
      return;
    }

    const { leaderboard, podium } = data;

    // 1. Render Top 3 Podium
    if (podium && podium.first) {
      const first = podium.first;
      const second = podium.second;
      const third = podium.third;

      projPodiumDeck.innerHTML = `
        <!-- 2nd Place -->
        <div class="flex flex-col items-center">
          ${second ? `
            <div class="text-3xl mb-1">${second.avatar || '🥈'}</div>
            <span class="text-xs font-bold text-slate-200 truncate max-w-[130px]">${second.teamName}</span>
            <span class="text-xs font-mono text-cyan font-bold">${second.totalPoints} pts</span>
            <div class="w-full h-24 bg-card border-t-4 border-cyan rounded-t-xl flex items-center justify-center font-heading font-black text-2xl text-slate-400 mt-2">
              2nd
            </div>
          ` : '<div class="h-24"></div>'}
        </div>

        <!-- 1st Place (Champion) -->
        <div class="flex flex-col items-center">
          <div class="text-4xl mb-1 filter drop-shadow-[0_0_12px_rgba(255,183,3,0.8)]">${first.avatar || '👑'}</div>
          <span class="text-sm font-black text-amber truncate max-w-[150px]">${first.teamName}</span>
          <span class="text-sm font-mono text-amber font-black">${first.totalPoints} pts</span>
          <div class="w-full h-36 bg-card border-t-4 border-amber rounded-t-xl flex items-center justify-center font-heading font-black text-3xl text-amber shadow-[0_0_20px_rgba(255,183,3,0.3)] mt-2">
            1st
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="flex flex-col items-center">
          ${third ? `
            <div class="text-3xl mb-1">${third.avatar || '🥉'}</div>
            <span class="text-xs font-bold text-slate-200 truncate max-w-[130px]">${third.teamName}</span>
            <span class="text-xs font-mono text-magenta font-bold">${third.totalPoints} pts</span>
            <div class="w-full h-16 bg-card border-t-4 border-magenta rounded-t-xl flex items-center justify-center font-heading font-black text-xl text-slate-400 mt-2">
              3rd
            </div>
          ` : '<div class="h-16"></div>'}
        </div>
      `;
    } else {
      projPodiumDeck.innerHTML = '';
    }

    // 2. Render Ranked Table
    projLeaderboardTbody.innerHTML = '';
    leaderboard.slice(0, 10).forEach(entry => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-white/5 transition-colors font-mono';
      row.innerHTML = `
        <td class="py-2.5 px-3 font-bold ${entry.rank === 1 ? 'text-amber' : entry.rank <= 3 ? 'text-cyan' : 'text-slate-400'}">
          #${entry.rank}
        </td>
        <td class="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-2">
          <span>${entry.avatar || '⚡'}</span>
          <span>${entry.teamName}</span>
        </td>
        <td class="py-2.5 px-3 text-right font-bold text-cyan">
          ${entry.totalPoints}
        </td>
      `;
      projLeaderboardTbody.appendChild(row);
    });
  }

  function renderState(state) {
    if (!state) return;
    currentState = state;

    if (projRoundBadge) {
      projRoundBadge.textContent = `ROUND ${state.currentRound}`;
    }

    // Rankings are an explicit host-controlled display, including after end.
    if (state.leaderboardVisible) {
      projStandby.classList.add('hidden');
      projActiveQuestion.classList.add('hidden');
      projLeaderboardView.classList.remove('hidden');
      loadLeaderboard();
      return;
    }

    projLeaderboardView.classList.add('hidden');

    // 2. Question Hidden / Standby
    if (!state.currentQuestionId || !state.questionVisible || !state.currentQuestion) {
      projStandby.classList.remove('hidden');
      projActiveQuestion.classList.add('hidden');
      if (state.status === 'PAUSED') {
        projStandbySubtext.textContent = 'Arena is currently paused by the host.';
      } else {
        projStandbySubtext.textContent = 'Waiting for the host to broadcast the question to the arena...';
      }
      return;
    }

    // 3. Active Question
    projStandby.classList.add('hidden');
    projActiveQuestion.classList.remove('hidden');

    const q = state.currentQuestion;
    if (projQuestionText) projQuestionText.textContent = q.text;
    if (projTextA) projTextA.textContent = q.optionA;
    if (projTextB) projTextB.textContent = q.optionB;
    if (projTextC) projTextC.textContent = q.optionC;
    if (projTextD) projTextD.textContent = q.optionD;

    // Reset option card styles and hide stats until answer reveal.
    const projResponseSummary = document.getElementById('proj-response-summary');
    const projTotalSubmissions = document.getElementById('proj-total-submissions');

    const optCards = [
      { el: projOptA, key: 'A' },
      { el: projOptB, key: 'B' },
      { el: projOptC, key: 'C' },
      { el: projOptD, key: 'D' }
    ];

    if (state.answerRevealed && state.answerStats) {
      if (projResponseSummary && projTotalSubmissions) {
        const total = state.answerStats.totalSubmissions || 0;
        projTotalSubmissions.textContent = total;
        projResponseSummary.classList.remove('hidden');
      }

      const pcts = state.answerStats.percentages || {};
      const counts = state.answerStats.breakdown || {};

      optCards.forEach(({ el, key }) => {
        const pctEl = document.getElementById(`proj-pct-${key}`);
        const cntEl = document.getElementById(`proj-cnt-${key}`);
        const statBox = document.getElementById(`proj-stat-box-${key}`);
        const barWrap = document.getElementById(`proj-bar-wrap-${key}`);
        const barEl = document.getElementById(`proj-bar-${key}`);
        const pct = Number(pcts[key] || 0);
        const count = Number(counts[key] || 0);

        if (pctEl) pctEl.textContent = `${pct}%`;
        if (cntEl) cntEl.textContent = `${count} ${count === 1 ? 'team' : 'teams'}`;
        if (statBox) statBox.classList.remove('hidden');
        if (barWrap) barWrap.classList.remove('hidden');
        if (barEl) barEl.style.width = `${pct}%`;

        if (q.correctOption === key) {
          el.className = 'proj-opt-card p-6 rounded-xl bg-emerald-950/80 border-2 border-emerald-400 text-white flex flex-col justify-between transition-all shadow-[0_0_30px_rgba(0,245,155,0.6)] scale-[1.02] relative overflow-hidden';
          if (pctEl) pctEl.className = 'text-2xl font-black font-mono text-emerald-400 block';
          if (barEl) barEl.className = 'h-full bg-emerald-400 rounded-full transition-all duration-700';
        } else {
          el.className = 'proj-opt-card p-6 rounded-xl bg-card border-2 border-white/10 flex flex-col justify-between transition-all opacity-75 relative overflow-hidden';
          if (pctEl) pctEl.className = 'text-2xl font-black font-mono text-slate-300 block';
          if (barEl) barEl.className = 'h-full bg-cyan rounded-full transition-all duration-700';
        }
      });
    } else {
      if (projResponseSummary) projResponseSummary.classList.add('hidden');

      optCards.forEach(({ el, key }) => {
        el.className = 'proj-opt-card p-6 rounded-xl bg-card border-2 border-white/10 flex flex-col justify-between transition-all relative overflow-hidden';
        const statBox = document.getElementById(`proj-stat-box-${key}`);
        const barWrap = document.getElementById(`proj-bar-wrap-${key}`);
        const barEl = document.getElementById(`proj-bar-${key}`);
        if (statBox) statBox.classList.add('hidden');
        if (barWrap) barWrap.classList.add('hidden');
        if (barEl) barEl.style.width = '0%';
      });
    }

    // Timer Sync
    syncTimer(state.timerStartedAt, state.timerDuration, state.timerPaused);
  }

  // Load Initial State
  try {
    const res = await fetch('/api/game/state');
    if (res.ok) {
      const data = await res.json();
      renderState(data.state);
    }
  } catch (err) {
    console.warn('Could not load initial projector state:', err);
  }

  // Socket.IO Real-time Events (falls back to polling on Vercel)
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);
  if (socket && socket.socket) socket.socket.emit('join_projector');

  window.quizSocket.on('game_state_updated', renderState);
  socket?.on('question_changed', renderState);
  socket?.on('question_shown', renderState);
  socket?.on('question_hidden', renderState);
  socket?.on('timer_started', renderState);
  socket?.on('timer_paused', renderState);
  socket?.on('timer_reset', renderState);
  socket?.on('answers_locked', renderState);
  socket?.on('answer_revealed', renderState);
  socket?.on('leaderboard_shown', () => {
    if (currentState) currentState.leaderboardVisible = true;
    renderState(currentState);
  });
  socket?.on('leaderboard_hidden', () => {
    if (currentState) currentState.leaderboardVisible = false;
    renderState(currentState);
  });
});
