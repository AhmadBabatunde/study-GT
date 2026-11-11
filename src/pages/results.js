/**
 * Score report and question-by-question review for a completed session.
 */

import { api } from '../api.js';
import { renderQuestionCard } from '../components/questionCard.js';
import { getWorkspaceData } from '../components/workspaceLayout.js';

export async function renderResultsPage(appEl, { params, navigate }) {
  const sessionId = params.id;
  if (!sessionId) {
    navigate('/dashboard');
    return;
  }

  appEl.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-surface">
      <div class="flex items-center gap-3 text-primary">
        <span class="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
        <span class="font-semibold text-base font-headline-sm">Loading your score report…</span>
      </div>
    </div>
  `;

  let resultsData = null;
  try {
    resultsData = await api.getResults(sessionId);
  } catch (err) {
    alert(`Could not load results: ${err.message}`);
    navigate('/dashboard');
    return;
  }

  const { session, analytics, questions } = resultsData;
  let activeFilter = 'all';

  function render() {
    const workspaceData = getWorkspaceData(api);
    const isCancelled = session.status === 'cancelled';

    const statusBadgeColor = isCancelled
      ? 'bg-error-container text-on-error-container'
      : 'bg-secondary-container text-on-secondary-container';
    const statusText = isCancelled ? 'Session cancelled' : 'Session completed';

    const filteredQuestions = questions.filter((q) => {
      if (activeFilter === 'incorrect') {
        return q.selected_answer && q.is_correct === false;
      }
      if (activeFilter === 'flagged') {
        return Boolean(q.is_flagged);
      }
      if (activeFilter === 'unanswered') {
        return !q.selected_answer;
      }
      return true;
    });

    appEl.innerHTML = `
      <div class="min-h-screen flex flex-col bg-background text-on-surface antialiased font-body-md text-body-md selection:bg-surface-variant selection:text-primary">
        <!-- Top Navigation Bar with clean Logo & Streak Only -->
        <header class="bg-surface-container-lowest sticky top-0 z-30 shadow-xs border-b border-outline-variant/30">
          <div class="flex justify-between items-center w-full px-6 py-3 max-w-7xl mx-auto">
            <a href="#/dashboard" class="flex items-center gap-3 group">
              <img src="/study-gt-logo.png" alt="Study GT" class="h-8 w-8 object-contain rounded-lg shadow-xs ring-1 ring-outline-variant/20" />
              <span class="text-headline-md font-headline-md font-extrabold text-primary tracking-tight">Study GT</span>
            </a>

            <!-- Right: ONLY Streak + Dashboard link -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-outline-variant/30 text-amber-600 font-label-md text-label-md">
                <span class="material-symbols-outlined text-base text-amber-500" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
                <span class="font-bold text-on-surface" data-study-streak-count>${Number.isInteger(workspaceData.streak?.current_streak) ? `${workspaceData.streak.current_streak} Days` : '…'}</span>
              </div>
              <a href="#/dashboard" class="text-label-md font-label-md font-semibold text-primary hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">arrow_back</span>
                <span>Dashboard</span>
              </a>
            </div>
          </div>
        </header>

        <!-- Main Results Container -->
        <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          <!-- Page Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-label-sm font-label-sm font-bold uppercase tracking-wider ${statusBadgeColor}">
                  ${statusText}
                </span>
                <span class="text-label-sm font-label-sm text-outline">• Session ID: ${session.session_id.slice(0, 8)}</span>
              </div>
              <h1 class="text-display-lg font-display-lg text-on-surface tracking-tight">
                Score report
              </h1>
              <p class="text-body-md font-body-md text-on-surface-variant mt-1">
                ${session.employer || 'All providers'} · ${session.exam_category || 'Mixed'} assessment
              </p>
            </div>
            <div class="flex items-center gap-3">
              <a href="#/mocks" class="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-label-md font-label-md shadow-xs hover:bg-primary-container transition-all">
                <span class="material-symbols-outlined text-base">replay</span>
                <span>Launch New Simulation</span>
              </a>
            </div>
          </div>

          <!-- Session summary -->
          <div class="mb-8 bg-surface-container-lowest border border-primary/20 rounded-xl p-5 shadow-sm relative overflow-hidden flex items-start gap-4">
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div class="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0">
              <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">psychology</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-label-lg font-label-lg text-primary font-bold tracking-wide uppercase">Session summary</h3>
              </div>
              <p class="text-body-md font-body-md text-on-surface mt-1 leading-relaxed">
                You answered ${analytics.answered_count} of ${analytics.total_questions} questions and got ${analytics.correct_count} correct.
                Review incorrect and unanswered questions below to see their explanations.
              </p>
            </div>
          </div>

          <!-- Key Analytics Telemetry Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
              <div class="text-label-sm font-label-sm text-on-surface-variant font-medium mb-1">Composite Score</div>
              <div class="text-headline-lg font-headline-lg font-extrabold text-on-surface">
                ${analytics.score} <span class="text-body-sm font-normal text-outline">/ ${analytics.total_questions}</span>
              </div>
              <div class="text-label-sm font-label-sm font-bold text-primary mt-1">${analytics.percentage}% Accuracy</div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
              <div class="text-label-sm font-label-sm text-on-surface-variant font-medium mb-1">Correct / Incorrect</div>
              <div class="text-headline-lg font-headline-lg font-extrabold text-on-surface">
                <span class="text-secondary">${analytics.correct_count}</span>
                <span class="text-outline font-normal text-base">/</span>
                <span class="text-error">${analytics.incorrect_count}</span>
              </div>
              <div class="text-label-sm font-label-sm text-outline mt-1">${analytics.unanswered_count} Unanswered</div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
              <div class="text-label-sm font-label-sm text-on-surface-variant font-medium mb-1">Average Pacing</div>
              <div class="text-headline-lg font-headline-lg font-extrabold text-on-surface">${analytics.avg_time_per_q_seconds}s</div>
              <div class="text-label-sm font-label-sm text-on-surface-variant mt-1">Per question item</div>
            </div>

            <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 shadow-sm">
              <div class="text-label-sm font-label-sm text-on-surface-variant font-medium mb-1">Proctor Status</div>
              <div class="text-headline-lg font-headline-lg font-extrabold ${analytics.violations > 0 ? 'text-amber-600' : 'text-secondary'}">
                ${analytics.violations} / ${analytics.max_violations}
              </div>
              <div class="text-label-sm font-label-sm text-outline mt-1">Security strikes</div>
            </div>
          </div>

          <!-- Answer Review Filter Tabs -->
          <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-outline-variant/30">
              <h2 class="text-headline-sm font-headline-sm font-bold text-on-surface">
                Detailed Question-by-Question Review
              </h2>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  data-filter="all"
                  class="filter-btn px-3 py-1.5 rounded-lg text-label-md font-label-md font-semibold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }"
                >
                  All (${questions.length})
                </button>
                <button
                  data-filter="incorrect"
                  class="filter-btn px-3 py-1.5 rounded-lg text-label-md font-label-md font-semibold transition-all ${
                    activeFilter === 'incorrect'
                      ? 'bg-error text-on-error'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }"
                >
                  Incorrect (${analytics.incorrect_count})
                </button>
                <button
                  data-filter="flagged"
                  class="filter-btn px-3 py-1.5 rounded-lg text-label-md font-label-md font-semibold transition-all ${
                    activeFilter === 'flagged'
                      ? 'bg-amber-500 text-white'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }"
                >
                  Flagged (${analytics.flagged_count})
                </button>
                <button
                  data-filter="unanswered"
                  class="filter-btn px-3 py-1.5 rounded-lg text-label-md font-label-md font-semibold transition-all ${
                    activeFilter === 'unanswered'
                      ? 'bg-surface-container-highest text-on-surface'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }"
                >
                  Unanswered (${analytics.unanswered_count})
                </button>
              </div>
            </div>

            <!-- List of Questions with full feedback -->
            <div class="space-y-8" id="questions-review-list">
              ${
                filteredQuestions.length === 0
                  ? `
                <div class="py-12 text-center text-outline">
                  <span class="material-symbols-outlined text-4xl mb-2">check_circle</span>
                  <p class="text-body-md">No questions match this filter.</p>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </main>
      </div>
    `;

    const qListContainer = appEl.querySelector('#questions-review-list');
    filteredQuestions.forEach((q) => {
      const cardEl = renderQuestionCard({
        question: q,
        currentIndex: q.question_index,
        totalQuestions: questions.length,
        showExplanation: true,
        readOnly: true,
        practiceMode: false,
      });
      cardEl.className = 'p-6 rounded-xl border border-outline-variant/30 bg-surface-container-low/40';
      qListContainer.appendChild(cardEl);
    });

    appEl.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-filter');
        render();
      });
    });
  }

  render();
  return () => {};
}
