// Final Leaderboard & Podium Client Engine
document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const noScoresState = document.getElementById('no-scores-state');
  const leaderboardContainer = document.getElementById('leaderboard-container');
  const podiumDeck = document.getElementById('podium-deck');
  const tbody = document.getElementById('leaderboard-tbody');
  const emptyTitle = document.getElementById('leaderboard-empty-title');
  const emptyCopy = document.getElementById('leaderboard-empty-copy');
  let leaderboardVisible = false;

  function showEmpty(title, copy) {
    emptyTitle.textContent = title;
    emptyCopy.textContent = copy;
    noScoresState.classList.remove('hidden');
    leaderboardContainer.classList.add('hidden');
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        render(data);
      }
    } catch (err) {
      console.warn('Could not load leaderboard:', err);
    }
  }

  const personalBanner = document.getElementById('personal-banner');
  const myTeamId = localStorage.getItem('kdk_team_id');

  function render(data) {
    if (!data || !data.hasScores || !data.leaderboard || data.leaderboard.length === 0) {
      if (personalBanner) personalBanner.classList.add('hidden');
      showEmpty('No scores available yet.', 'Live rankings and podium will appear once answers are scored.');
      return;
    }

    noScoresState.classList.add('hidden');
    leaderboardContainer.classList.remove('hidden');

    const { leaderboard, podium } = data;

    // Check if the current logged-in participant is in the leaderboard
    const myEntry = myTeamId ? leaderboard.find(e => e.teamId === myTeamId) : null;

    if (personalBanner) {
      if (myEntry) {
        personalBanner.classList.remove('hidden');
        if (myEntry.rank === 1) {
          personalBanner.innerHTML = `
            <div class="cyber-card p-5 sm:p-6 bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border-2 border-amber-400 text-center rounded-2xl shadow-[0_0_35px_rgba(255,183,3,0.6)] animate-pulse">
              <div class="text-4xl sm:text-5xl mb-2">👑 🏆 🎉</div>
              <h2 class="text-2xl sm:text-4xl font-black font-heading text-amber tracking-tight">YOU ARE THE WINNER!</h2>
              <p class="text-xs sm:text-sm text-slate-200 font-mono mt-1 font-bold">1st Place Champion • Total Score: ${myEntry.totalPoints} pts</p>
            </div>
          `;
        } else if (myEntry.rank === 2) {
          personalBanner.innerHTML = `
            <div class="cyber-card p-4 sm:p-5 bg-cyan/10 border-2 border-cyan text-center rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              <div class="text-3xl mb-1">🥈 ⚡</div>
              <h2 class="text-xl sm:text-2xl font-black font-heading text-cyan">YOU SECURED 2ND PLACE!</h2>
              <p class="text-xs text-slate-300 font-mono mt-1">Runner Up • Total Score: ${myEntry.totalPoints} pts</p>
            </div>
          `;
        } else if (myEntry.rank === 3) {
          personalBanner.innerHTML = `
            <div class="cyber-card p-4 sm:p-5 bg-magenta/10 border-2 border-magenta text-center rounded-2xl shadow-[0_0_20px_rgba(217,27,92,0.3)]">
              <div class="text-3xl mb-1">🥉 ⚡</div>
              <h2 class="text-xl sm:text-2xl font-black font-heading text-magenta">YOU SECURED 3RD PLACE!</h2>
              <p class="text-xs text-slate-300 font-mono mt-1">2nd Runner Up • Total Score: ${myEntry.totalPoints} pts</p>
            </div>
          `;
        } else {
          personalBanner.innerHTML = `
            <div class="cyber-card p-4 bg-surface/90 border border-white/10 text-center rounded-2xl">
              <div class="text-2xl mb-1">⚡ 🎯</div>
              <h2 class="text-base sm:text-lg font-bold font-heading text-white">You Finished at Rank #${myEntry.rank}</h2>
              <p class="text-xs text-slate-400 font-mono mt-1">Total Score: ${myEntry.totalPoints} pts</p>
            </div>
          `;
        }
      } else {
        personalBanner.classList.add('hidden');
      }
    }

    // Render Top 3 Podium
    if (podium && podium.first) {
      const first = podium.first;
      const second = podium.second;
      const third = podium.third;

      const isFirstMe = myTeamId && first.teamId === myTeamId;
      const isSecondMe = myTeamId && second && second.teamId === myTeamId;
      const isThirdMe = myTeamId && third && third.teamId === myTeamId;

      podiumDeck.innerHTML = `
        <!-- 2nd Place -->
        <div class="flex flex-col items-center">
          ${second ? `
            <div class="text-4xl mb-1">${second.avatar || '⚡'}</div>
            <span class="text-xs sm:text-sm font-bold ${isSecondMe ? 'text-cyan font-black' : 'text-slate-200'} truncate max-w-[140px]">
              ${isSecondMe ? 'YOU (2nd Place)' : second.teamName}
            </span>
            <span class="text-xs sm:text-sm font-mono text-cyan font-extrabold">${second.totalPoints} pts</span>
            <div class="w-full h-28 sm:h-36 bg-card border-t-4 border-cyan rounded-t-2xl flex flex-col items-center justify-center font-heading font-black text-2xl sm:text-3xl text-slate-300 shadow-[0_0_20px_rgba(0,229,255,0.2)] mt-3">
              <span>2nd</span>
              <span class="text-[10px] text-slate-500 font-mono tracking-widest font-normal">RUNNER UP</span>
            </div>
          ` : '<div class="h-28 sm:h-36"></div>'}
        </div>

        <!-- 1st Place (Champion) -->
        <div class="flex flex-col items-center">
          <div class="text-5xl sm:text-6xl mb-1 filter drop-shadow-[0_0_15px_rgba(255,183,3,0.9)] animate-bounce">${first.avatar || '👑'}</div>
          <span class="text-sm sm:text-base font-black text-amber truncate max-w-[170px] ${isFirstMe ? 'animate-pulse' : ''}">
            ${isFirstMe ? 'YOU (WINNER 🏆)' : first.teamName}
          </span>
          <span class="text-sm sm:text-base font-mono text-amber font-black">${first.totalPoints} pts</span>
          <div class="w-full h-40 sm:h-52 bg-card border-t-4 border-amber rounded-t-2xl flex flex-col items-center justify-center font-heading font-black text-3xl sm:text-4xl text-amber shadow-[0_0_30px_rgba(255,183,3,0.35)] mt-3 relative">
            <div class="absolute -top-3 px-3 py-0.5 rounded-full bg-amber text-arena font-heading font-black text-[10px] uppercase tracking-widest">
              ${isFirstMe ? 'YOU ARE CHAMPION' : 'CHAMPION'}
            </div>
            <span>1st</span>
            <span class="text-[10px] text-amber/80 font-mono tracking-widest font-normal">${isFirstMe ? 'YOU WIN' : 'WINNER'}</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="flex flex-col items-center">
          ${third ? `
            <div class="text-4xl mb-1">${third.avatar || '⚡'}</div>
            <span class="text-xs sm:text-sm font-bold ${isThirdMe ? 'text-magenta font-black' : 'text-slate-200'} truncate max-w-[140px]">
              ${isThirdMe ? 'YOU (3rd Place)' : third.teamName}
            </span>
            <span class="text-xs sm:text-sm font-mono text-magenta font-extrabold">${third.totalPoints} pts</span>
            <div class="w-full h-20 sm:h-28 bg-card border-t-4 border-magenta rounded-t-2xl flex flex-col items-center justify-center font-heading font-black text-xl sm:text-2xl text-slate-300 shadow-[0_0_20px_rgba(217,27,92,0.2)] mt-3">
              <span>3rd</span>
              <span class="text-[10px] text-slate-500 font-mono tracking-widest font-normal">SECOND RUNNER UP</span>
            </div>
          ` : '<div class="h-20 sm:h-28"></div>'}
        </div>
      `;
    }

    // Render Table
    tbody.innerHTML = '';
    leaderboard.forEach(entry => {
      const isMe = myTeamId && entry.teamId === myTeamId;
      const row = document.createElement('tr');
      row.className = isMe 
        ? (entry.rank === 1 ? 'bg-amber-950/40 border-2 border-amber shadow-[0_0_15px_rgba(255,183,3,0.3)] transition-colors' : 'bg-cyan-950/40 border-l-4 border-cyan font-bold transition-colors')
        : 'hover:bg-white/5 transition-colors';
      
      let nameHtml = '';
      if (isMe) {
        if (entry.rank === 1) {
          nameHtml = `
            <span class="text-xl">${entry.avatar || '👑'}</span>
            <span class="text-amber font-black">YOU (Winner 🏆)</span>
            <span class="px-2 py-0.5 rounded-full bg-amber text-arena text-[10px] font-black uppercase tracking-wider">YOU</span>
          `;
        } else {
          nameHtml = `
            <span class="text-xl">${entry.avatar || '⚡'}</span>
            <span class="text-cyan font-bold">YOU (${entry.teamName})</span>
            <span class="px-2 py-0.5 rounded-full bg-cyan/20 text-cyan text-[10px] font-bold uppercase border border-cyan/40">YOU</span>
          `;
        }
      } else {
        nameHtml = `
          <span class="text-xl">${entry.avatar || '⚡'}</span>
          <span>${entry.teamName}</span>
        `;
      }

      row.innerHTML = `
        <td class="py-3 px-4 font-bold ${entry.rank === 1 ? 'text-amber' : entry.rank <= 3 ? 'text-cyan' : 'text-slate-400'}">
          #${entry.rank}
        </td>
        <td class="py-3 px-4 font-sans font-bold text-white flex items-center gap-3">
          ${nameHtml}
        </td>
        <td class="py-3 px-4 text-right font-bold text-base ${entry.rank === 1 ? 'text-amber' : 'text-cyan'}">
          ${entry.totalPoints}
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  async function applyGameState(state) {
    leaderboardVisible = Boolean(state?.leaderboardVisible);
    if (!leaderboardVisible) {
      // Students arrive here after the host reveals rankings. Once rankings are
      // hidden again, return them to the live quiz so the next question is not
      // trapped behind the leaderboard page.
      if (state?.status === 'ACTIVE' || state?.status === 'PAUSED') {
        window.location.replace('/quiz.html');
        return;
      }
      showEmpty('Leaderboard is hidden.', 'The host will reveal live rankings when the time is right.');
      return;
    }
    await fetchLeaderboard();
  }

  try {
    const res = await fetch('/api/game/state');
    if (res.ok) await applyGameState((await res.json()).state);
  } catch (err) {
    console.warn('Could not load game state:', err);
  }

  // Socket.IO updates
  const socket = window.quizSocket.init(window.AppConfig.socketUrl);
  socket.on('leaderboard_shown', applyGameState);
  socket.on('leaderboard_hidden', applyGameState);
  socket.on('game_state_updated', applyGameState);
  socket.on('game_ended', applyGameState);
});
