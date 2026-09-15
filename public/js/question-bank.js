document.addEventListener('DOMContentLoaded', async () => {
  await window.AppConfig.loadConfig();

  const token = localStorage.getItem('kdk_admin_token');
  const authHeaders = { 'Content-Type': 'application/json' };
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

  let activeRoundNumber = 1;
  let cachedRounds = [];
  let cachedQuestions = [];

  const tabBtns = document.querySelectorAll('.tab-btn');
  const questionsList = document.getElementById('questions-list');
  const emptyState = document.getElementById('empty-questions-state');
  const modal = document.getElementById('question-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalRoundSelect = document.getElementById('modal-round-id');
  const modalQuestionId = document.getElementById('modal-question-id');
  const modalText = document.getElementById('modal-text');
  const modalOptA = document.getElementById('modal-opt-a');
  const modalOptB = document.getElementById('modal-opt-b');
  const modalOptC = document.getElementById('modal-opt-c');
  const modalOptD = document.getElementById('modal-opt-d');
  const modalCorrectOpt = document.getElementById('modal-correct-opt');
  const modalMediaUrl = document.getElementById('modal-media-url');
  const form = document.getElementById('question-form');

  // Load Questions from Server
  async function loadQuestions() {
    try {
      const res = await fetch(`/api/questions?roundNumber=${activeRoundNumber}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        cachedRounds = data.rounds || [];
        cachedQuestions = data.questions || [];
        populateRoundsDropdown();
        renderQuestions();
      }
    } catch (err) {
      window.AppConfig.showToast('Failed to load questions: ' + err.message, 'error');
    }
  }

  function populateRoundsDropdown() {
    modalRoundSelect.innerHTML = '';
    cachedRounds.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `Round ${r.number}: ${r.name}`;
      if (r.number === activeRoundNumber) opt.selected = true;
      modalRoundSelect.appendChild(opt);
    });
  }

  function renderQuestions() {
    if (cachedQuestions.length === 0) {
      questionsList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    questionsList.innerHTML = '';

    cachedQuestions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'cyber-card p-5 bg-card/95 border border-white/10 space-y-3';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-md bg-cyan/10 border border-cyan/30 text-cyan text-xs font-bold font-heading flex items-center justify-center">
              Q${idx + 1}
            </span>
            <span class="text-xs text-slate-400 font-mono">Round ${q.round?.number || activeRoundNumber}</span>
          </div>
          <div class="flex items-center gap-2">
            <button data-id="${q.id}" class="btn-edit text-xs text-cyan hover:underline py-1 px-2.5 rounded bg-cyan/10 border border-cyan/20">Edit</button>
            <button data-id="${q.id}" class="btn-delete text-xs text-rose-400 hover:underline py-1 px-2.5 rounded bg-rose-950/40 border border-rose-800">Delete</button>
          </div>
        </div>

        <h4 class="text-base font-semibold text-white">${q.text}</h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <div class="p-2 rounded bg-surface border ${q.correctOption === 'A' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-white/5 text-slate-300'}">
            A: ${q.optionA} ${q.correctOption === 'A' ? '✓' : ''}
          </div>
          <div class="p-2 rounded bg-surface border ${q.correctOption === 'B' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-white/5 text-slate-300'}">
            B: ${q.optionB} ${q.correctOption === 'B' ? '✓' : ''}
          </div>
          <div class="p-2 rounded bg-surface border ${q.correctOption === 'C' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-white/5 text-slate-300'}">
            C: ${q.optionC} ${q.correctOption === 'C' ? '✓' : ''}
          </div>
          <div class="p-2 rounded bg-surface border ${q.correctOption === 'D' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-white/5 text-slate-300'}">
            D: ${q.optionD} ${q.correctOption === 'D' ? '✓' : ''}
          </div>
        </div>

        ${q.mediaUrl ? `<div class="text-[11px] text-cyan font-mono truncate">Media: ${q.mediaUrl}</div>` : ''}
      `;
      questionsList.appendChild(card);
    });

    // Edit and Delete Handlers
    document.querySelectorAll('.btn-edit').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const q = cachedQuestions.find(item => item.id === id);
        if (q) openEditModal(q);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this question?')) {
          try {
            const res = await fetch(`/api/questions/${id}`, {
              method: 'DELETE',
              headers: authHeaders
            });
            if (res.ok) {
              window.AppConfig.showToast('Question deleted', 'success');
              loadQuestions();
            }
          } catch (err) {
            window.AppConfig.showToast(err.message, 'error');
          }
        }
      });
    });
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.className = 'tab-btn px-4 py-2 rounded-lg text-xs font-bold font-heading uppercase tracking-wider bg-surface border border-white/10 text-slate-400 hover:text-white transition-all';
      });
      btn.className = 'tab-btn px-4 py-2 rounded-lg text-xs font-bold font-heading uppercase tracking-wider bg-cyan/20 border border-cyan text-cyan transition-all';
      activeRoundNumber = Number(btn.getAttribute('data-round'));
      loadQuestions();
    });
  });

  // Modal handlers
  function openAddModal() {
    modalTitle.textContent = 'Add New Question';
    modalQuestionId.value = '';
    form.reset();
    populateRoundsDropdown();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function openEditModal(q) {
    modalTitle.textContent = 'Edit Question';
    modalQuestionId.value = q.id;
    modalRoundSelect.value = q.roundId;
    modalText.value = q.text;
    modalOptA.value = q.optionA;
    modalOptB.value = q.optionB;
    modalOptC.value = q.optionC;
    modalOptD.value = q.optionD;
    modalCorrectOpt.value = q.correctOption;
    modalMediaUrl.value = q.mediaUrl || '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  document.getElementById('open-add-modal-btn').addEventListener('click', openAddModal);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

  // Submit Question (Create / Update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = modalQuestionId.value;
    const isEdit = Boolean(id);

    const payload = {
      roundId: modalRoundSelect.value,
      text: modalText.value.trim(),
      optionA: modalOptA.value.trim(),
      optionB: modalOptB.value.trim(),
      optionC: modalOptC.value.trim(),
      optionD: modalOptD.value.trim(),
      correctOption: modalCorrectOpt.value,
      mediaUrl: modalMediaUrl.value.trim() || null
    };

    try {
      const url = isEdit ? `/api/questions/${id}` : '/api/questions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save question');
      }

      window.AppConfig.showToast(isEdit ? 'Question updated' : 'Question created', 'success');
      closeModal();
      loadQuestions();
    } catch (err) {
      window.AppConfig.showToast(err.message, 'error');
    }
  });

  await loadQuestions();
});
