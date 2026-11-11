/**
 * Timed Mock Examination Page for Study GT.
 * Timed assessment interface with exam timing and answer persistence,
 * real-time answer persistence, and 3-strike violation enforcement.
 * Faithfully matches Google Stitch mockups and DESIGN.md tokens.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { ExamTimer } from '../components/timer.js';
import { ProctorManager } from '../components/proctor.js';
import { renderQuestionCard } from '../components/questionCard.js';
import { showToast } from '../components/toast.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function renderExamPage(appEl, { params, navigate }) {
  const sessionId = params.id;
  if (!sessionId) {
    navigate('/mocks');
    return;
  }

  appEl.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-surface">
      <div class="flex items-center gap-3 text-primary">
        <span class="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
        <span class="font-semibold text-base font-headline-sm">Restoring Examination Environment...</span>
      </div>
    </div>
  `;

  let examData = null;
  try {
    examData = await api.getExam(sessionId);
  } catch (err) {
    alert(`Could not load exam: ${err.message}`);
    navigate('/mocks');
    return;
  }

  const { session } = examData;
  let questions = examData.questions || [];

  if (session.status !== 'active') {
    navigate(`/results/${sessionId}`);
    return;
  }

  const user = auth.getUser() || { name: 'Candidate' };
  let currentIndex = 1;
  let qStartTime = Date.now();

  const timeLimit = session.time_limit_seconds || 3600;
  const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000));
  const remainingSecs = Math.max(0, timeLimit - elapsedSecs);

  let timer = null;
  let proctor = null;
  let cleanedUp = false;

  async function handleAutoSubmit() {
    try {
      await api.completeExam(sessionId);
    } catch (e) {
      console.warn('Auto submit error:', e);
    }
    cleanup();
    navigate(`/results/${sessionId}`);
  }

  proctor = new ProctorManager({
    sessionId,
    maxViolations: session.max_violations || 3,
    onViolation: async (type) => api.recordViolation(sessionId, type),
    onDisqualified: () => {
      cleanup();
      navigate(`/results/${sessionId}`);
    },
  });

  timer = new ExamTimer({
    totalSeconds: timeLimit,
    initialRemainingSeconds: remainingSecs,
    onTick: (state) => {
      const clockEl = document.getElementById('exam-clock-display');
      if (clockEl) {
        clockEl.textContent = state.formatted;
        clockEl.className = `font-data-timer text-data-timer tracking-tight tabular-nums ${state.colorClass || 'text-on-surface'}`;
      }
    },
    onTimeUp: handleAutoSubmit,
  });

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (timer) timer.destroy();
    if (proctor) proctor.stop();
    document.removeEventListener('fullscreenchange', syncFullscreenControl);
    document.removeEventListener('webkitfullscreenchange', syncFullscreenControl);
  }

  function syncFullscreenControl() {
    const button = appEl.querySelector('#exam-fullscreen-btn');
    const status = appEl.querySelector('#exam-fullscreen-status');
    if (!button || !status) return;

    const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    button.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    button.title = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
    button.innerHTML = `
      <span class="material-symbols-outlined text-lg">${isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
      <span>${isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
    `;
    status.textContent = isFullscreen ? 'Fullscreen on' : 'Fullscreen off';
  }

  function renderShell() {
    const currentQ = questions.find((q) => q.question_index === currentIndex) || questions[0];
    const total = questions.length;
    const answeredCount = questions.filter((q) => q.selected_answer).length;
    const flaggedCount = questions.filter((q) => q.is_flagged).length;
    const unvisitedCount = total - answeredCount;
    const employerName = escapeHtml(session.employer || 'All providers');
    const examCategory = escapeHtml(session.exam_category || 'Mixed');
    const sectionCategory = escapeHtml(session.exam_category || 'Comprehensive Reasoning');

    appEl.innerHTML = `
      <div class="exam-screen min-h-screen flex flex-col bg-background text-on-surface antialiased font-body-md text-body-md select-none selection:bg-primary selection:text-on-primary">
        <!-- Top Proctored Exam Header with Official Logo -->
        <header class="exam-header bg-surface-container-lowest shadow-sm z-30 sticky top-0 w-full border-b border-outline-variant/30">
          <div class="exam-header-inner max-w-7xl mx-auto">
            <!-- Brand & Assessment Identity -->
            <div class="exam-brand-group">
              <div class="exam-brand">
                <img src="/study-gt-logo.png" alt="Study GT" class="h-8 w-8 object-contain rounded-lg shadow-xs ring-1 ring-outline-variant/20" />
                <span class="text-headline-md font-headline-md font-extrabold text-primary tracking-tight">Study GT</span>
                <span class="exam-divider h-4 w-px bg-outline-variant/60"></span>
                <span class="exam-assessment-label font-label-md text-label-md bg-surface-container-low text-on-surface-variant px-2.5 py-0.5 rounded text-xs font-semibold">
                  Timed assessment
                </span>
              </div>
              <div class="exam-identity">
                <div class="flex items-center gap-2">
                  <span class="exam-identity-title font-headline-sm text-headline-sm text-on-surface">${employerName} · ${examCategory} Assessment</span>
                  <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/60 text-on-error-container text-xs font-medium">
                    <span class="w-2 h-2 rounded-full bg-error animate-pulse-beacon"></span>
                    <span class="font-label-sm text-label-sm">In progress</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center Digital Countdown Telemetry -->
            <div class="exam-timer-panel flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-xl border border-outline-variant/40">
              <div class="relative w-8 h-8 flex items-center justify-center">
                <svg class="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
                  <circle class="text-surface-dim" cx="18" cy="18" fill="none" r="15" stroke="currentColor" stroke-width="3"></circle>
                  <circle
                    class="text-primary-container"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="15"
                    stroke="currentColor"
                    stroke-dasharray="94.2"
                    stroke-dashoffset="${94.2 * (1 - Math.max(0, timer.remainingSeconds) / Math.max(1, timer.totalSeconds))}"
                    stroke-linecap="round"
                    stroke-width="3"
                  ></circle>
                </svg>
                <span class="material-symbols-outlined text-primary text-base absolute">timer</span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Time Remaining</span>
                <div class="flex items-baseline gap-1">
                  <span id="exam-clock-display" class="font-data-timer text-data-timer text-on-surface tracking-tight tabular-nums">
                    ${timer.formatTime()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right Submission & Progress Action -->
            <div class="exam-actions">
              <div class="exam-progress-summary">
                <div class="font-label-md text-label-md text-on-surface-variant">Question Progress</div>
                <div class="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  <span>${answeredCount}</span> <span class="text-on-surface-variant font-normal">/ ${total}</span>
                </div>
              </div>
              <button
                id="exam-fullscreen-btn"
                type="button"
                class="exam-fullscreen-btn inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-2 text-label-sm font-semibold text-on-surface-variant hover:bg-surface-container-low"
              ></button>
              <button
                id="submit-exam-btn"
                type="button"
                class="flex items-center gap-2 bg-error hover:bg-on-error-container text-on-error px-4 py-2 rounded-lg font-label-lg text-label-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-error"
              >
                <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">lock</span>
                <span>Submit Examination</span>
              </button>
            </div>
          </div>
        </header>

        <!-- High-Trust Proctoring Banner -->
        <div class="exam-proctor-banner bg-surface-container-high/60 border-b border-outline-variant/30">
          <div class="exam-proctor-banner-inner max-w-7xl mx-auto text-xs text-on-surface-variant">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-sm">verified_user</span>
              <span class="font-label-sm text-label-sm">
                <strong class="font-semibold text-on-surface">Assessment in progress:</strong> Answers and explanations stay hidden until you submit.
              </span>
            </div>
            <div class="exam-fullscreen-status font-label-sm text-label-sm" aria-live="polite">
              <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span id="exam-fullscreen-status"></span>
            </div>
          </div>
        </div>

        <!-- Primary Assessment Workspace (Split Grid) -->
        <main class="exam-layout flex-1 max-w-7xl w-full mx-auto items-start">
          <!-- 8-Column Main Interaction Workspace -->
          <div class="exam-question-column flex flex-col gap-5">
            <!-- Section Indicator Card -->
            <div class="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded font-semibold uppercase">Section 1</span>
                  <span class="text-on-surface-variant font-label-sm text-label-sm">• Questions 1 – ${total}</span>
                </div>
                <h2 class="font-headline-md text-headline-md text-on-surface">${sectionCategory}</h2>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-on-surface-variant font-label-sm text-label-sm">Section Pace:</span>
                <div class="w-28 bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div class="bg-primary h-full rounded-full transition-all duration-300" style="width: ${Math.round((answeredCount / Math.max(1, total)) * 100)}%;"></div>
                </div>
                <span class="font-label-sm text-label-sm font-semibold text-primary">${answeredCount}/${total}</span>
              </div>
            </div>

            <!-- Question Prompt Box Card -->
            <div class="bg-surface-container-lowest rounded-xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div id="exam-question-card-container"></div>

              <!-- Bottom Navigation Bar inside Card -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-outline-variant/30">
                <div class="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    id="exam-prev-btn"
                    type="button"
                    ${currentIndex === 1 ? 'disabled' : ''}
                    class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-label-md font-label-md font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span class="material-symbols-outlined text-base">arrow_back</span>
                    <span>Previous</span>
                  </button>

                  <button
                    id="exam-clear-btn"
                    type="button"
                    class="px-3.5 py-2.5 rounded-lg border border-outline-variant/40 text-label-md font-label-md text-on-surface-variant hover:text-error hover:border-error transition-all"
                  >
                    Clear Selection
                  </button>

                  <button
                    id="exam-flag-btn"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-label-md font-label-md font-medium transition-colors ${
                      currentQ.is_flagged
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-outline-variant/60 hover:bg-surface-container-low text-on-surface'
                    }"
                  >
                    <span class="material-symbols-outlined text-base ${currentQ.is_flagged ? 'text-amber-600' : ''}" style="font-variation-settings: 'FILL' ${currentQ.is_flagged ? 1 : 0};">bookmark</span>
                    <span>${currentQ.is_flagged ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>

                <button
                  id="exam-next-btn"
                  type="button"
                  ${currentIndex === total ? 'disabled' : ''}
                  class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-label-lg font-label-lg font-semibold transition-all duration-200 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                >
                  <span>Next Question</span>
                  <span class="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 4-Column Secondary Candidate Telemetry & Navigator Sidebar -->
          <div class="exam-sidebar flex flex-col gap-5">
            <!-- Candidate Status Card -->
            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-outline-variant/20">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs ring-2 ring-primary/20">
                    ${user.name ? user.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div class="text-label-md font-bold text-on-surface">${escapeHtml(user.name || 'Candidate')}</div>
                    <div class="text-label-sm text-outline">${employerName} assessment</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 text-label-sm font-semibold text-secondary">
                  <span class="w-2 h-2 rounded-full bg-secondary"></span>
                  <span>In progress</span>
                </div>
              </div>

              <!-- Question Matrix Header -->
              <div class="flex items-center justify-between pb-2 mb-3">
                <h3 class="text-headline-sm font-headline-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-base">grid_view</span>
                  <span>Question Matrix</span>
                </h3>
                <span class="text-label-sm font-label-sm text-outline">${total} Items</span>
              </div>

              <!-- Status Legend -->
              <div class="grid grid-cols-2 gap-2 text-label-sm font-label-sm mb-4 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span>${answeredCount} Answered</span>
                </div>
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  <span>Q${currentIndex} Current</span>
                </div>
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span id="exam-flagged-count">${flaggedCount} Flagged</span>
                </div>
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="w-2.5 h-2.5 rounded-full bg-outline-variant"></span>
                  <span>${unvisitedCount} Unvisited</span>
                </div>
              </div>

              <!-- Question Palette Grid -->
              <div class="grid grid-cols-5 gap-2 text-center text-label-md font-label-md max-h-72 overflow-y-auto passage-scroll p-1" id="exam-matrix-grid">
                ${questions.map((q) => {
                  const idx = q.question_index;
                  const isCur = idx === currentIndex;
                  const isAns = Boolean(q.selected_answer);
                  const isFlg = Boolean(q.is_flagged);

                  let btnClass = 'bg-surface-container-low text-on-surface-variant font-medium hover:bg-surface-container';

                  if (isAns) {
                    btnClass = 'bg-secondary text-on-secondary font-semibold hover:opacity-90';
                  }

                  if (isCur) {
                    btnClass = 'bg-primary-container text-on-primary font-bold ring-2 ring-primary ring-offset-2 shadow-sm';
                  }

                  return `
                    <button
                      type="button"
                      data-qidx="${idx}"
                      class="matrix-btn h-9 rounded-md relative transition-all ${btnClass}"
                    >
                      ${idx}
                      ${isFlg ? `<span class="flag-pip absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"></span>` : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Examination Policies Notice -->
            <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-body-sm text-on-surface-variant leading-relaxed">
              <div class="flex items-center gap-1.5 font-bold text-on-surface mb-1">
                <span class="material-symbols-outlined text-sm text-primary">info</span>
                <span class="text-label-md font-label-md">Grading Policy Note:</span>
              </div>
              <p>
                No deductions for incorrect answers in this recruitment track. You are strongly advised to allocate responses to all ${total} items before the session clock expires.
              </p>
            </div>
          </div>
        </main>
      </div>
    `;

    // Render Question Card
    syncFullscreenControl();
    appEl.querySelector('#exam-fullscreen-btn').addEventListener('click', async () => {
      const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (isFullscreen) {
        await ProctorManager.exitFullscreen();
      } else {
        const entered = await ProctorManager.requestFullscreen();
        if (!entered) {
          showToast('Fullscreen is unavailable in this browser. You can continue the assessment.', {
            icon: 'info',
            type: 'error',
          });
        }
      }
      syncFullscreenControl();
    });

    const cardContainer = appEl.querySelector('#exam-question-card-container');
    const cardEl = renderQuestionCard({
      question: currentQ,
      currentIndex,
      totalQuestions: total,
      showExplanation: false,
      readOnly: false,
      practiceMode: false,
      onSelectOption: async (optKey) => {
        const timeSpent = Date.now() - qStartTime;
        currentQ.selected_answer = optKey;
        try {
          await api.submitAnswer(sessionId, currentIndex, optKey, timeSpent);
        } catch (err) {
          console.error('Failed to submit answer:', err);
        }
        renderShell();
      },
    });
    cardContainer.appendChild(cardEl);

    // Matrix button clicks
    appEl.querySelectorAll('.matrix-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetIdx = parseInt(btn.getAttribute('data-qidx'), 10);
        currentIndex = targetIdx;
        qStartTime = Date.now();
        renderShell();
      });
    });

    // Navigation buttons
    appEl.querySelector('#exam-prev-btn').addEventListener('click', () => {
      if (currentIndex > 1) {
        currentIndex -= 1;
        qStartTime = Date.now();
        renderShell();
      }
    });

    appEl.querySelector('#exam-next-btn').addEventListener('click', () => {
      if (currentIndex < total) {
        currentIndex += 1;
        qStartTime = Date.now();
        renderShell();
      }
    });

    // Instant Optimistic Flag Button Handler
    const flagBtn = appEl.querySelector('#exam-flag-btn');
    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        const newFlag = !currentQ.is_flagged;
        currentQ.is_flagged = newFlag;

        // Instant DOM update
        if (newFlag) {
          flagBtn.className =
            'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-label-md font-label-md font-medium transition-all border-amber-400 bg-amber-50 text-amber-800 scale-[1.03]';
          flagBtn.innerHTML = `
            <span class="material-symbols-outlined text-base text-amber-600" style="font-variation-settings: 'FILL' 1;">bookmark</span>
            <span>Flagged</span>
          `;
        } else {
          flagBtn.className =
            'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border text-label-md font-label-md font-medium transition-all border-outline-variant/60 hover:bg-surface-container-low text-on-surface';
          flagBtn.innerHTML = `
            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 0;">bookmark</span>
            <span>Flag</span>
          `;
        }
        setTimeout(() => flagBtn.classList.remove('scale-[1.03]'), 150);

        // Update Matrix Pip
        const matrixBtn = appEl.querySelector(`[data-qidx="${currentIndex}"]`);
        if (matrixBtn) {
          let pip = matrixBtn.querySelector('.flag-pip');
          if (newFlag && !pip) {
            pip = document.createElement('span');
            pip.className = 'flag-pip absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400';
            matrixBtn.appendChild(pip);
          } else if (!newFlag && pip) {
            pip.remove();
          }
        }

        // Update Counter
        const totalFlagged = questions.filter((q) => q.is_flagged).length;
        const countEl = appEl.querySelector('#exam-flagged-count');
        if (countEl) countEl.textContent = `${totalFlagged} Flagged`;

        showToast(newFlag ? 'Question flagged for review' : 'Flag removed', {
          icon: newFlag ? 'bookmark_added' : 'bookmark_remove',
        });

        // Background API sync
        api.toggleFlag(sessionId, currentIndex, newFlag).catch((err) => {
          console.error('Failed to toggle flag:', err);
          currentQ.is_flagged = !newFlag;
          showToast('Failed to save flag state. Reverted.', { icon: 'error', type: 'error' });
          renderShell();
        });
      });
    }

    appEl.querySelector('#exam-clear-btn').addEventListener('click', async () => {
      currentQ.selected_answer = null;
      try {
        await api.submitAnswer(sessionId, currentIndex, null, 0);
      } catch (err) {
        console.error('Failed to clear answer:', err);
      }
      renderShell();
    });

    appEl.querySelector('#submit-exam-btn').addEventListener('click', async () => {
      const unanswered = questions.filter((q) => !q.selected_answer).length;
      let msg = 'Are you ready to submit your examination?';
      if (unanswered > 0) {
        msg = `You have ${unanswered} unanswered question(s). Are you sure you want to finalize and submit?`;
      }
      if (confirm(msg)) {
        await api.completeExam(sessionId);
        cleanup();
        navigate(`/results/${sessionId}`);
      }
    });
  }

  document.addEventListener('fullscreenchange', syncFullscreenControl);
  document.addEventListener('webkitfullscreenchange', syncFullscreenControl);
  await proctor.start();
  timer.start();
  renderShell();

  return cleanup;
}
