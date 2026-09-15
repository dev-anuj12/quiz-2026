// Server-Authoritative Live Quiz Client Engine
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const teamId = localStorage.getItem('kdk_team_id');
  const sessionToken = localStorage.getItem('kdk_session_token');
  const teamName = localStorage.getItem('kdk_team_name');
  const teamAvatar = localStorage.getItem('kdk_team_avatar');

  // If student hasn't registered a team, redirect to registration
  if (!teamId || !sessionToken) {
    window.location.href = '/register.html';
    return;
  }

  // Validate team session against server
  try {
    const checkRes = await fetch(`/api/teams/${teamId}`);
    if (!checkRes.ok) {
      localStorage.removeItem('kdk_team_id');
      localStorage.removeItem('kdk_session_token');
      localStorage.removeItem('kdk_team_name');
      localStorage.removeItem('kdk_team_avatar');
      window.location.href = '/register.html';
      return;
    }
  } catch (e) {
    // Ignore network error on check
  }

  // Populate Team Pill
  const playerAvatar = document.getElementById('player-avatar');
  const playerTeamName = document.getElementById('player-team-name');
  if (playerAvatar) playerAvatar.textContent = teamAvatar || '⚡';
  if (playerTeamName) playerTeamName.textContent = teamName || 'My Team';

  // DOM Elements
  const quizStandby = document.getElementById('quiz-standby');
  const standbyTitle = document.getElementById('standby-title');
  const standbyDesc = document.getElementById('standby-desc');
  const quizActive = document.getElementById('quiz-active');
  const roundBadge = document.getElementById('round-badge');
  const timerNumber = document.getElementById('timer-number');
  const timerProgressBar = document.getElementById('timer-progress-bar');
  const questionText = document.getElementById('question-text');
  const mediaContainer = document.getElementById('media-container');
  const questionMediaImg = document.getElementById('question-media-img');
  const optTextA = document.getElementById('opt-text-A');
  const optTextB = document.getElementById('opt-text-B');
  const optTextC = document.getElementById('opt-text-C');
  const optTextD = document.getElementById('opt-text-D');
  const optionBtns = document.querySelectorAll('.option-btn');
  const statusPill = document.getElementById('status-pill');
  const statusExplanation = document.getElementById('status-explanation');
  const submitBtn = document.getElementById('submit-answer-btn');

  // Local Question State
  let currentQuestionId = null;
  let selectedOption = null;
  let answerState = 'UNSELECTED'; // UNSELECTED | SELECTED | SUBMITTED | LOCKED
  let isSubmitting = false;
  let timerInterval = null;
  let serverTimerStartedAt = null;
  let serverTimerDuration = 30;
  let serverTimerPaused = false;

  function setAnswerState(newState) {
    answerState = newState;
    if (statusPill) statusPill.textContent = newState;

    if (newState === 'UNSELECTED') {
      if (statusPill) statusPill.className = 'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400';
      if (statusExplanation) statusExplanation.textContent = 'Tap any option above to submit instantly.';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = 'btn-primary w-full sm:w-auto px-6 py-2.5 text-sm opacity-50 cursor-not-allowed hidden';
        submitBtn.textContent = 'Auto-Submit Ready';
      }
    } else if (newState === 'SELECTED' || newState === 'SUBMITTING') {
      if (statusPill) statusPill.className = 'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-cyan/20 border border-cyan/40 text-cyan animate-pulse';
      if (statusExplanation) statusExplanation.textContent = `Submitting Option ${selectedOption}...`;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = 'btn-primary w-full sm:w-auto px-6 py-2.5 text-sm cursor-wait';
        submitBtn.textContent = `Submitting (${selectedOption})...`;
      }
    } else if (newState === 'SUBMITTED') {
      if (statusPill) statusPill.className = 'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500 text-emerald-300';
      if (statusExplanation) statusExplanation.textContent = `Option ${selectedOption} submitted! Waiting for host.`;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = 'btn-outline w-full sm:w-auto px-6 py-2.5 text-sm border-emerald-500 text-emerald-400 cursor-default';
        submitBtn.textContent = `Option ${selectedOption} Submitted ✓`;
      }
      // Disable changing options once submitted
      optionBtns.forEach(btn => btn.classList.add('pointer-events-none'));
    } else if (newState === 'LOCKED') {
      if (statusPill) statusPill.className = 'px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-950/80 border border-rose-600 text-rose-300';
      if (statusExplanation) statusExplanation.textContent = 'Submissions are locked for this question.';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.className = 'btn-outline w-full sm:w-auto px-6 py-2.5 text-sm opacity-60 cursor-not-allowed';
        submitBtn.textContent = 'Time Expired 🔒';
      }
      optionBtns.forEach(btn => btn.classList.add('pointer-events-none'));
    }
  }

  // Instant Touch / Click Auto-Submit Engine
  async function submitSelectedAnswer(opt) {
    const targetOption = opt || selectedOption;
    if (!targetOption || !currentQuestionId || isSubmitting) return;
    if (answerState === 'SUBMITTED' || answerState === 'LOCKED') return;

    isSubmitting = true;
    selectedOption = targetOption;

    // Instant Visual Feedback
    optionBtns.forEach(btn => {
      const bOpt = btn.getAttribute('data-option');
      if (bOpt === targetOption) {
        btn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border-2 border-cyan bg-cyan/20 text-white transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] ring-2 ring-cyan/50';
      } else {
        btn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border border-white/10 opacity-50 transition-all bg-card pointer-events-none';
      }
    });

    setAnswerState('SELECTED');

    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-team-session': sessionToken
        },
        body: JSON.stringify({
          teamId,
          sessionToken,
          questionId: currentQuestionId,
          selectedOption: targetOption
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          localStorage.removeItem('kdk_team_id');
          localStorage.removeItem('kdk_session_token');
          localStorage.removeItem('kdk_team_name');
          localStorage.removeItem('kdk_team_avatar');
          window.AppConfig.showToast('Team session expired or database reset. Please re-register.', 'error');
          setTimeout(() => { window.location.href = '/register.html'; }, 1500);
          return;
        }
        if (res.status === 409) {
          // Already submitted on server
          localStorage.setItem(`answered_${currentQuestionId}`, targetOption);
          setAnswerState('SUBMITTED');
          return;
        }
        throw new Error(data.error || 'Failed to submit answer');
      }

      // Mark locally as answered to survive refresh
      localStorage.setItem(`answered_${currentQuestionId}`, targetOption);
      setAnswerState('SUBMITTED');
      window.AppConfig.showToast(`Option ${targetOption} submitted successfully!`, 'success');
    } catch (err) {
      if (err.message?.toLowerCase().includes('time expired') || err.message?.toLowerCase().includes('locked')) {
        setAnswerState('LOCKED');
      } else {
        window.AppConfig.showToast(err.message, 'error');
        setAnswerState('UNSELECTED');
        optionBtns.forEach(btn => btn.classList.remove('pointer-events-none'));
      }
    } finally {
      isSubmitting = false;
    }
  }

  // Handle Option Selection (Auto-Submits Immediately on Touch / Click!)
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (answerState === 'SUBMITTED' || answerState === 'LOCKED' || isSubmitting) return;
      const opt = btn.getAttribute('data-option');
      submitSelectedAnswer(opt);
    });
  });

  // Optional Submit Button Listener (if user taps it)
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (selectedOption) submitSelectedAnswer(selectedOption);
    });
  }

  // Authoritative Server Timer Sync Loop
  function startLocalTimerDisplay(startedAt, duration, isPaused) {
    if (timerInterval) clearInterval(timerInterval);

    serverTimerStartedAt = startedAt ? new Date(startedAt).getTime() : null;
    serverTimerDuration = Number(duration) || 30;
    serverTimerPaused = Boolean(isPaused);

    function update() {
      if (!serverTimerStartedAt || serverTimerPaused) {
        if (timerNumber) timerNumber.textContent = `${serverTimerDuration}s`;
        if (timerProgressBar) timerProgressBar.style.width = '100%';
        return;
      }

      const elapsed = (Date.now() - serverTimerStartedAt) / 1000;
      const remaining = Math.max(0, Math.ceil(serverTimerDuration - elapsed));
      const percentage = Math.max(0, Math.min(100, (remaining / serverTimerDuration) * 100));

      if (timerNumber) timerNumber.textContent = `${remaining}s`;
      if (timerProgressBar) {
        timerProgressBar.style.width = `${percentage}%`;
        if (remaining <= 5) {
          timerProgressBar.className = 'h-full bg-magenta transition-all duration-200';
          timerNumber.className = 'text-lg font-black font-mono text-magenta animate-pulse';
        } else {
          timerProgressBar.className = 'h-full bg-gradient-to-r from-cyan via-amber to-magenta transition-all duration-200';
          timerNumber.className = 'text-lg font-black font-mono text-cyan';
        }
      }

      // If timer completes / expires: auto-submit if selected, or lock
      if (remaining <= 0) {
        if (selectedOption && answerState !== 'SUBMITTED' && !isSubmitting) {
          submitSelectedAnswer(selectedOption);
        } else if (answerState !== 'SUBMITTED') {
          setAnswerState('LOCKED');
        }
      }
    }

    update();
    timerInterval = setInterval(update, 200);
  }

  // Render Authoritative Game State
  function renderGameState(state) {
    if (!state) return;

    if (roundBadge) roundBadge.textContent = `Round ${state.currentRound}`;

    // Scores are never exposed to participants until the host enables them.
    if (state.leaderboardVisible) {
      window.location.href = '/leaderboard.html';
      return;
    }

    // 2. If no active question or question is hidden
    if (!state.currentQuestionId || !state.questionVisible || !state.currentQuestion) {
      quizStandby.classList.remove('hidden');
      quizActive.classList.add('hidden');
      if (state.status === 'PAUSED') {
        standbyTitle.textContent = 'Arena Paused by Host';
        standbyDesc.textContent = 'Please wait for the host to resume the round.';
      } else {
        standbyTitle.textContent = 'Stand By for Next Question';
        standbyDesc.textContent = 'The host is preparing the arena. Your answers will be enabled shortly.';
      }
      return;
    }

    // 3. Active Question is Visible
    quizStandby.classList.add('hidden');
    quizActive.classList.remove('hidden');

    const q = state.currentQuestion;

    // Detect if this is a new question
    if (currentQuestionId !== q.id) {
      currentQuestionId = q.id;
      selectedOption = null;

      // Reset options styling
      optionBtns.forEach(btn => {
        btn.classList.remove('pointer-events-none');
        btn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border border-white/10 hover:border-cyan/50 transition-all bg-card group';
      });

      // Check if already answered in this browser session
      const savedAnswer = localStorage.getItem(`answered_${q.id}`);
      if (savedAnswer) {
        selectedOption = savedAnswer;
        const targetBtn = document.querySelector(`.option-btn[data-option="${savedAnswer}"]`);
        if (targetBtn) {
          targetBtn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border border-emerald-500 bg-emerald-950/40 text-white';
        }
        setAnswerState('SUBMITTED');
      } else {
        setAnswerState('UNSELECTED');
      }
    }

    // Populate question text & options
    if (questionText) questionText.textContent = q.text;
    if (optTextA) optTextA.textContent = q.optionA;
    if (optTextB) optTextB.textContent = q.optionB;
    if (optTextC) optTextC.textContent = q.optionC;
    if (optTextD) optTextD.textContent = q.optionD;

    // Optional media
    if (q.mediaUrl) {
      mediaContainer.classList.remove('hidden');
      questionMediaImg.src = q.mediaUrl;
    } else {
      mediaContainer.classList.add('hidden');
    }

    // Timer sync
    startLocalTimerDisplay(state.timerStartedAt, state.timerDuration, state.timerPaused);

    // Answer lock state
    if (state.answersLocked && answerState !== 'SUBMITTED') {
      setAnswerState('LOCKED');
    }

    // Reveal correct option styling if host revealed
    if (state.answerRevealed && q.correctOption) {
      optionBtns.forEach(btn => {
        const opt = btn.getAttribute('data-option');
        if (opt === q.correctOption) {
          btn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border-2 border-emerald-400 bg-emerald-950/80 text-white shadow-[0_0_20px_rgba(0,245,155,0.5)]';
        } else if (opt === selectedOption && selectedOption !== q.correctOption) {
          btn.className = 'option-btn cyber-card p-4 sm:p-5 flex items-center gap-4 text-left border-2 border-rose-500 bg-rose-950/80 text-white';
        }
      });
      if (statusExplanation) {
        statusExplanation.textContent = `Correct answer is Option ${q.correctOption}`;
      }
    }
  }

  // Initial Game State Request
  async function loadInitialGameState() {
    try {
      const res = await fetch('/api/game/state');
      if (res.ok) {
        const data = await res.json();
        renderGameState(data.state);
      }
    } catch (err) {
      console.warn('Could not fetch game state:', err);
    }
  }

  await loadInitialGameState();

  // Socket.IO Real-time Events
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);

  socket?.on('game_state_updated', renderGameState);
  socket?.on('question_changed', renderGameState);
  socket?.on('question_shown', renderGameState);
  socket?.on('question_hidden', renderGameState);
  socket?.on('timer_started', renderGameState);
  socket?.on('timer_paused', renderGameState);
  socket?.on('timer_reset', renderGameState);
  socket?.on('answers_locked', renderGameState);
  socket?.on('answer_revealed', renderGameState);
  socket?.on('leaderboard_shown', () => { window.location.href = '/leaderboard.html'; });
  socket?.on('game_ended', renderGameState);
  socket?.on('teams_cleared', () => {
    localStorage.removeItem('kdk_team_id');
    localStorage.removeItem('kdk_session_token');
    localStorage.removeItem('kdk_team_name');
    localStorage.removeItem('kdk_team_avatar');
    window.location.href = '/register.html';
  });
});
