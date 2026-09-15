// Host Command Center Engine for KDK Induction Quiz 2026
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const token = localStorage.getItem('kdk_admin_token');
  const authHeaders = {
    'Content-Type': 'application/json'
  };
  if (token) authHeaders['Authorization'] = `Bearer ${token}`;

  // Verify Admin Session
  try {
    const meRes = await fetch('/api/auth/me', { headers: authHeaders });
    if (!meRes.ok) {
      window.location.href = '/admin-login.html';
      return;
    }
  } catch (err) {
    window.location.href = '/admin-login.html';
    return;
  }

  // DOM Elements
  const gameStatusBadge = document.getElementById('game-status-badge');
  const regStatusLabel = document.getElementById('reg-status-label');
  const projectorStatusLabel = document.getElementById('projector-status-label');
  const leaderboardStatusLabel = document.getElementById('leaderboard-status-label');
  const adminQuestionRound = document.getElementById('admin-question-round');
  const adminQuestionId = document.getElementById('admin-question-id');
  const adminQuestionText = document.getElementById('admin-question-text');
  const questionVisibilityBadge = document.getElementById('question-visibility-badge');
  const adminOptA = document.getElementById('admin-opt-A');
  const adminOptB = document.getElementById('admin-opt-B');
  const adminOptC = document.getElementById('admin-opt-C');
  const adminOptD = document.getElementById('admin-opt-D');
  const adminTimerDisplay = document.getElementById('admin-timer-display');
  const adminTimerStatus = document.getElementById('admin-timer-status');
  const adminSubmissionCount = document.getElementById('admin-submission-count');
  const adminTeamCount = document.getElementById('admin-team-count');
  const teamsTableBody = document.getElementById('teams-table-body');
  const auditLogStream = document.getElementById('audit-log-stream');
  const logoutBtn = document.getElementById('logout-btn');

  const adminQuestionSelect = document.getElementById('admin-question-select');
  const answerDistribution = document.getElementById('answer-distribution');
  const distributionTotal = document.getElementById('distribution-total');

  let currentState = null;
  let timerInterval = null;
  let currentRoundQuestions = [];

  function renderAnswerDistribution(state) {
    if (!answerDistribution) return;
    const stats = state?.answerStats;
    if (!state?.answerRevealed || !stats) {
      answerDistribution.classList.add('hidden');
      return;
    }

    answerDistribution.classList.remove('hidden');
    if (distributionTotal) distributionTotal.textContent = `${stats.totalSubmissions || 0} responses`;
    for (const option of ['A', 'B', 'C', 'D']) {
      const pct = Number(stats.percentages?.[option] || 0);
      const label = document.getElementById(`percent-${option}`);
      const bar = document.getElementById(`bar-${option}`);
      if (label) label.textContent = `${pct}%`;
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  // Generic Admin API caller with dynamic token & credentials
  async function apiCall(url, method = 'POST', body = null) {
    try {
      const currentToken = localStorage.getItem('kdk_admin_token');
      const headers = { 'Content-Type': 'application/json' };
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

      const res = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : null
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        throw new Error(`Server returned ${res.status} without valid JSON`);
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Operation failed (HTTP ${res.status})`);
      }
      // Instantly render returned state without waiting for next polling cycle
      if (data.state) {
        renderState(data.state);
      }
      return data;
    } catch (err) {
      window.AppConfig.showToast(err.message, 'error');
      throw err;
    }
  }

  // Load questions for the current round into the dropdown
  async function loadRoundQuestions(roundNum) {
    try {
      const res = await fetch(`/api/questions?roundNumber=${roundNum}`);
      if (res.ok) {
        const data = await res.json();
        currentRoundQuestions = data.questions || [];
        if (adminQuestionSelect) {
          adminQuestionSelect.innerHTML = '<option value="">Select Question...</option>';
          currentRoundQuestions.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = q.id;
            opt.textContent = `Q${idx + 1}: ${q.text.substring(0, 38)}…`;
            if (currentState && currentState.currentQuestionId === q.id) {
              opt.selected = true;
            }
            adminQuestionSelect.appendChild(opt);
          });
        }
      }
    } catch (err) {
      console.warn('Could not load round questions:', err);
    }
  }

  if (adminQuestionSelect) {
    adminQuestionSelect.addEventListener('change', async (e) => {
      const qId = e.target.value;
      if (qId) {
        // Activating a question hides the leaderboard server-side and starts
        // its timer, so this remains one responsive request.
        await apiCall('/api/game/question', 'POST', { questionId: qId, show: true });
        window.AppConfig.showToast('Question activated and visible to arena', 'success');
      }
    });
  }

  // Render Game State
  function renderState(state) {
    if (!state) return;
    const previousRound = currentState?.currentRound;
    currentState = state;
    renderAnswerDistribution(state);

    if (previousRound !== state.currentRound || currentRoundQuestions.length === 0) {
      loadRoundQuestions(state.currentRound);
    } else if (adminQuestionSelect && state.currentQuestionId) {
      adminQuestionSelect.value = state.currentQuestionId;
    }

    // Status Badge
    if (gameStatusBadge) {
      gameStatusBadge.textContent = state.status;
      if (state.status === 'ACTIVE') {
        gameStatusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-600';
      } else if (state.status === 'PAUSED') {
        gameStatusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber/20 text-amber border border-amber/40';
      } else if (state.status === 'ENDED') {
        gameStatusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-400 border border-rose-600';
      } else {
        gameStatusBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/20';
      }
    }

    // Round Selector Styling
    document.querySelectorAll('.round-btn').forEach((btn, idx) => {
      const rNum = idx + 1;
      if (state.currentRound === rNum) {
        btn.className = 'round-btn p-3 rounded-lg bg-surface border border-cyan text-cyan font-heading font-black text-center transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]';
      } else {
        btn.className = 'round-btn p-3 rounded-lg bg-surface border border-white/10 text-slate-400 font-heading font-black text-center hover:border-cyan/40 transition-all';
      }
    });

    // Projector State
    if (projectorStatusLabel) {
      projectorStatusLabel.textContent = state.projectorEnabled ? 'Enabled' : 'Disabled';
      projectorStatusLabel.className = state.projectorEnabled ? 'text-[11px] text-cyan' : 'text-[11px] text-slate-400';
    }

    if (leaderboardStatusLabel) {
      leaderboardStatusLabel.textContent = state.leaderboardVisible ? 'Visible' : 'Hidden';
      leaderboardStatusLabel.className = state.leaderboardVisible ? 'ml-1 text-amber' : 'ml-1 text-slate-500';
    }

    // Question Details
    if (questionVisibilityBadge) {
      questionVisibilityBadge.textContent = state.questionVisible ? 'Visible on Arena' : 'Hidden from Arena';
      questionVisibilityBadge.className = state.questionVisible 
        ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-700'
        : 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-slate-400';
    }

    if (state.currentQuestion) {
      const q = state.currentQuestion;
      if (adminQuestionRound) adminQuestionRound.textContent = `Round ${state.currentRound} - Question Active`;
      if (adminQuestionId) adminQuestionId.textContent = `ID: ${q.id.substring(0, 8)}…`;
      if (adminQuestionText) adminQuestionText.textContent = q.text;

      const correct = q.adminCorrectOption || q.correctOption;
      if (adminOptA) {
        adminOptA.textContent = `A: ${q.optionA}`;
        adminOptA.className = correct === 'A' ? 'p-2 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold' : 'p-2 rounded bg-card border border-white/5 text-slate-300';
      }
      if (adminOptB) {
        adminOptB.textContent = `B: ${q.optionB}`;
        adminOptB.className = correct === 'B' ? 'p-2 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold' : 'p-2 rounded bg-card border border-white/5 text-slate-300';
      }
      if (adminOptC) {
        adminOptC.textContent = `C: ${q.optionC}`;
        adminOptC.className = correct === 'C' ? 'p-2 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold' : 'p-2 rounded bg-card border border-white/5 text-slate-300';
      }
      if (adminOptD) {
        adminOptD.textContent = `D: ${q.optionD}`;
        adminOptD.className = correct === 'D' ? 'p-2 rounded bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-bold' : 'p-2 rounded bg-card border border-white/5 text-slate-300';
      }
    } else {
      if (adminQuestionRound) adminQuestionRound.textContent = `Round ${state.currentRound}`;
      if (adminQuestionId) adminQuestionId.textContent = 'No question selected';
      if (adminQuestionText) adminQuestionText.textContent = 'No question currently active. Use "Next ▶" or choose from Question Bank.';
      if (adminOptA) adminOptA.textContent = 'A: —';
      if (adminOptB) adminOptB.textContent = 'B: —';
      if (adminOptC) adminOptC.textContent = 'C: —';
      if (adminOptD) adminOptD.textContent = 'D: —';
    }

    // Timer Sync
    syncTimer(state.timerStartedAt, state.timerDuration, state.timerPaused);
  }

  function syncTimer(startedAt, duration, isPaused) {
    if (timerInterval) clearInterval(timerInterval);

    const startMs = startedAt ? new Date(startedAt).getTime() : null;
    const durSec = Number(duration) || 20;

    function update() {
      if (!startMs || isPaused) {
        if (adminTimerDisplay) adminTimerDisplay.textContent = `${durSec}s`;
        if (adminTimerStatus) adminTimerStatus.textContent = isPaused ? 'Paused' : 'Ready';
        return;
      }

      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, Math.ceil(durSec - elapsed));

      if (adminTimerDisplay) {
        adminTimerDisplay.textContent = `${remaining}s`;
        adminTimerDisplay.className = remaining <= 5 
          ? 'text-5xl font-black font-mono text-magenta animate-pulse'
          : 'text-5xl font-black font-mono text-cyan tracking-tight';
      }
      if (adminTimerStatus) {
        adminTimerStatus.textContent = remaining <= 0 ? 'Expired' : 'Countdown Active';
      }
    }

    update();
    timerInterval = setInterval(update, 200);
  }

  // Load Registered Teams Table
  async function loadTeams() {
    try {
      const res = await fetch('/api/teams', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (adminTeamCount) adminTeamCount.textContent = `${data.count} Teams`;

        if (!data.teams || data.teams.length === 0) {
          teamsTableBody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">No teams registered yet.</td></tr>`;
          return;
        }

        teamsTableBody.innerHTML = '';
        data.teams.forEach(team => {
          const row = document.createElement('tr');
          row.className = 'hover:bg-white/5 transition-colors';
          row.innerHTML = `
            <td class="py-2.5 font-emoji text-lg">${team.avatar || '⚡'}</td>
            <td class="py-2.5 font-bold text-white">${team.name}</td>
            <td class="py-2.5 text-slate-400">${team.leaderName || '—'}</td>
            <td class="py-2.5 text-right">
              <button data-id="${team.id}" class="btn-delete-team text-[11px] text-rose-400 hover:text-rose-300 py-0.5 px-2 rounded bg-rose-950/40 border border-rose-800 hover:bg-rose-900/60">
                Remove
              </button>
            </td>
          `;
          teamsTableBody.appendChild(row);
        });

        // Attach delete events
        document.querySelectorAll('.btn-delete-team').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Are you sure you want to remove this team from the arena?')) {
              await apiCall(`/api/teams/${id}`, 'DELETE');
              window.AppConfig.showToast('Team removed from arena', 'success');
              loadTeams();
            }
          });
        });
      }
    } catch (err) {
      console.warn('Could not load teams:', err);
    }
  }

  // Load Audit Logs
  async function loadAuditLogs() {
    try {
      const res = await fetch('/api/game/audit-logs', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (!data.logs || data.logs.length === 0) {
          auditLogStream.innerHTML = `<div class="text-slate-500 text-center py-6">No audit records yet.</div>`;
          return;
        }

        auditLogStream.innerHTML = '';
        data.logs.forEach(log => {
          const item = document.createElement('div');
          item.className = 'p-2 rounded bg-surface border border-white/5 text-[11px] flex items-center justify-between';
          const time = new Date(log.createdAt).toLocaleTimeString();
          item.innerHTML = `
            <span class="text-slate-300 font-bold">${log.action}</span>
            <span class="text-slate-500 text-[10px]">${time}</span>
          `;
          auditLogStream.appendChild(item);
        });
      }
    } catch (err) {
      console.warn('Could not load audit logs:', err);
    }
  }

  // Initialize Data
  const initialRes = await apiCall('/api/game/state', 'GET');
  renderState(initialRes.state);
  await loadTeams();
  await loadAuditLogs();

  // Socket.IO Real-time Synchronization (falls back to polling on Vercel)
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);
  if (socket) socket.emit('join_admin');

  window.quizSocket.on('game_state_updated', (state) => {
    renderState(state);
    loadAuditLogs();
  });
  window.quizSocket.on('team_joined', () => {
    loadTeams();
  });
  window.quizSocket.on('team_left', () => {
    loadTeams();
  });
  window.quizSocket.on('submission_count_updated', (data) => {
    if (adminSubmissionCount && data.questionId === currentState?.currentQuestionId) {
      adminSubmissionCount.textContent = data.totalSubmissions;
    }
  });

  // Safe Click Listener Helper
  function addClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', async (e) => {
        el.style.opacity = '0.6';
        el.style.pointerEvents = 'none';
        try {
          await handler(e);
        } finally {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        }
      });
    }
  }

  // Action Button Listeners
  addClick('btn-game-start', () => {
    if (currentState) {
      currentState.status = 'ACTIVE';
      renderState(currentState);
    }
    return apiCall('/api/game/start');
  });

  addClick('btn-game-pause', () => {
    if (currentState) {
      currentState.status = 'PAUSED';
      renderState(currentState);
    }
    return apiCall('/api/game/pause');
  });

  addClick('btn-game-resume', () => {
    if (currentState) {
      currentState.status = 'ACTIVE';
      renderState(currentState);
    }
    return apiCall('/api/game/resume');
  });

  addClick('btn-game-end', () => {
    if (confirm('End the quiz and trigger final rankings?')) {
      if (currentState) {
        currentState.status = 'ENDED';
        currentState.answersLocked = true;
        renderState(currentState);
      }
      return apiCall('/api/game/end');
    }
  });

  addClick('btn-game-reset', () => {
    if (confirm('Reset the arena back to initial lobby status?')) {
      if (currentState) {
        currentState.status = 'LOBBY';
        currentState.currentRound = 1;
        currentState.questionVisible = false;
        currentState.answersLocked = false;
        currentState.answerRevealed = false;
        renderState(currentState);
      }
      return apiCall('/api/game/reset');
    }
  });

  // Round Selectors
  function selectRoundOptimistic(rNum) {
    if (currentState) {
      currentState.currentRound = rNum;
      renderState(currentState);
    }
    return apiCall('/api/game/round', 'POST', { roundNumber: rNum });
  }
  addClick('btn-round-1', () => selectRoundOptimistic(1));
  addClick('btn-round-2', () => selectRoundOptimistic(2));
  addClick('btn-round-3', () => selectRoundOptimistic(3));

  // Question Navigation & Controls
  async function navigateQuestion(direction) {
    if (currentState && currentRoundQuestions.length > 0) {
      const idx = currentRoundQuestions.findIndex(q => q.id === currentState.currentQuestionId);
      let targetIdx = direction === 'next'
        ? (idx === -1 ? 0 : Math.min(idx + 1, currentRoundQuestions.length - 1))
        : (idx === -1 ? 0 : Math.max(idx - 1, 0));
      const targetQ = currentRoundQuestions[targetIdx];
      if (targetQ) {
        currentState.currentQuestionId = targetQ.id;
        currentState.currentQuestion = targetQ;
        currentState.questionVisible = true;
        currentState.answerRevealed = false;
        currentState.answersLocked = false;
        currentState.timerStartedAt = null;
        currentState.timerDuration = 30;
        currentState.timerPaused = false;
        currentState.leaderboardVisible = false;
        renderState(currentState);
      }
    }
    await apiCall('/api/game/question-nav', 'POST', { direction });
  }

  addClick('btn-prev-question', () => navigateQuestion('prev'));
  addClick('btn-next-question', () => navigateQuestion('next'));

  addClick('btn-toggle-q-visibility', () => {
    if (currentState) {
      currentState.questionVisible = !currentState.questionVisible;
      renderState(currentState);
    }
    const isVisible = currentState?.questionVisible;
    return apiCall('/api/game/question-visibility', 'POST', { visible: isVisible });
  });

  // Timer Controls
  addClick('btn-timer-start', () => {
    if (currentState) {
      currentState.status = 'ACTIVE';
      currentState.timerStartedAt = new Date().toISOString();
      currentState.timerDuration = 30;
      currentState.timerPaused = false;
      currentState.answersLocked = false;
      renderState(currentState);
    }
    return apiCall('/api/game/timer', 'POST', { action: 'start', duration: 30 });
  });

  addClick('btn-timer-pause', () => {
    if (currentState) {
      currentState.timerPaused = true;
      renderState(currentState);
    }
    return apiCall('/api/game/timer', 'POST', { action: 'pause' });
  });

  addClick('btn-timer-reset', () => {
    if (currentState) {
      currentState.timerStartedAt = null;
      currentState.timerDuration = 30;
      currentState.timerPaused = false;
      currentState.answersLocked = false;
      currentState.answerRevealed = false;
      renderState(currentState);
    }
    return apiCall('/api/game/timer', 'POST', { action: 'reset', duration: 30 });
  });

  // Answer Controls
  addClick('btn-lock-answers', () => {
    if (currentState) {
      currentState.answersLocked = true;
      renderState(currentState);
    }
    return apiCall('/api/game/answer-lock', 'POST', { locked: true });
  });

  addClick('btn-unlock-answers', () => {
    if (currentState) {
      currentState.answersLocked = false;
      renderState(currentState);
    }
    return apiCall('/api/game/answer-lock', 'POST', { locked: false });
  });

  addClick('btn-reveal-answer', () => {
    if (currentState) {
      currentState.answerRevealed = true;
      currentState.answersLocked = true;
      renderState(currentState);
    }
    return apiCall('/api/game/reveal', 'POST', { reveal: true });
  });

  // Leaderboard & Projector Controls
  addClick('btn-leaderboard-show', () => {
    if (currentState) {
      currentState.leaderboardVisible = true;
      renderState(currentState);
    }
    return apiCall('/api/game/leaderboard', 'POST', { visible: true });
  });

  addClick('btn-leaderboard-hide', () => {
    if (currentState) {
      currentState.leaderboardVisible = false;
      renderState(currentState);
    }
    return apiCall('/api/game/leaderboard', 'POST', { visible: false });
  });

  addClick('btn-projector-toggle', () => {
    if (currentState) {
      currentState.projectorEnabled = !currentState.projectorEnabled;
      renderState(currentState);
    }
    const isEnabled = currentState?.projectorEnabled;
    return apiCall('/api/game/projector', 'POST', { enabled: isEnabled });
  });

  // Registration Open/Close
  addClick('btn-reg-open', async () => {
    await apiCall('/api/game/reset'); // Returns to LOBBY
    window.AppConfig.showToast('Registration opened', 'success');
  });
  addClick('btn-reg-close', async () => {
    await apiCall('/api/game/start'); // Moves to ACTIVE, closing registration
    window.AppConfig.showToast('Registration closed (Arena Active)', 'info');
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('kdk_admin_token');
      window.location.href = '/admin-login.html';
    });
  }
});
