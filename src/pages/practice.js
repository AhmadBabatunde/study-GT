/**
 * Practice Mode Page for Study GT.
 * Untimed drill sessions with answer explanations from the question bank.
 * Faithfully matches Google Stitch mockups and DESIGN.md tokens.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { renderQuestionCard } from '../components/questionCard.js';
import { showToast } from '../components/toast.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function renderPracticePage(appEl, { navigate, query }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  const workspaceData = getWorkspaceData(api);
  let selectedCategory = query?.get('category') || 'Mixed';
  let questionCount = 10;
  let session = null;
  let questions = [];
  let currentIndex = 1;
  let employers = [];
  let categories = ['Mixed'];
  let selectedEmployer = query?.get('employer') || '';
  let activeEndDialog = null;

  function renderSetupView() {
    const content = `
        <div class="max-w-4xl w-full mx-auto px-6 py-10">
          <div class="mb-8">
            <div class="mb-2 text-label-sm font-label-sm font-medium text-on-surface-variant">
              Untimed Learning &amp; Solution Review Mode
            </div>
            <h1 class="text-display-lg-mobile md:text-headline-lg font-headline-lg text-on-surface tracking-tight">
              Aptitude Practice Bank &amp; Solution Review
            </h1>
            <p class="text-body-md font-body-md text-on-surface-variant mt-1.5">
              Select category and set length to start an untimed drill session with instant step-by-step explanations.
            </p>
          </div>

          <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 sm:p-8 shadow-sm">
            <!-- Category Selector -->
            <label class="block text-label-sm font-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              Select Assessment Section
            </label>
            <label for="practice-employer" class="mb-2 block text-label-sm font-label-sm font-bold text-outline uppercase tracking-wider">
              Company / Assessment Provider (Optional)
            </label>
            <select
              id="practice-employer"
              name="employer"
              class="mb-3 w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All providers (optional)</option>
              ${employers.map((item) => `
                <option value="${escapeHtml(item.employer)}" ${item.employer === selectedEmployer ? 'selected' : ''}>
                  ${escapeHtml(item.employer)} (${Number(item.question_count).toLocaleString()} questions)
                </option>
              `).join('')}
            </select>
            <p id="practice-employer-status" class="mb-5 text-label-sm text-on-surface-variant" aria-live="polite">
              ${employers.length ? `${employers.length} assessment providers available. Leave blank for all.` : 'Loading assessment providers…'}
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" id="category-selector">
              ${categories.map((cat) => `
                <button
                  type="button"
                  data-cat="${escapeHtml(cat)}"
                  class="cat-btn py-3 px-4 rounded-xl border text-label-md font-label-md font-semibold transition-all text-center ${
                    cat === selectedCategory
                      ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                  }"
                >
                  ${cat === 'Mixed' ? 'All Sections' : cat}
                </button>
              `).join('')}
            </div>

            <!-- Length Selector -->
            <label class="block text-label-sm font-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              Session Length
            </label>
            <div class="grid grid-cols-3 gap-3 mb-8" id="length-selector">
              ${[10, 20, 25].map((cnt) => `
                <button
                  type="button"
                  data-cnt="${cnt}"
                  class="cnt-btn py-3 px-4 rounded-xl border text-label-md font-label-md font-semibold transition-all text-center ${
                    cnt === questionCount
                      ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                  }"
                >
                  ${cnt} Questions
                </button>
              `).join('')}
            </div>

            <!-- Practice Features List -->
            <div class="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 mb-8 text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
              <span class="font-bold text-on-surface block mb-1">Untimed Study Features:</span>
              <ul class="list-disc pl-5 space-y-1">
                <li>Select an answer then hit "Submit Answer &amp; View Solution" — the correct answer is revealed instantly with a full rationale.</li>
                <li>No countdown timer pressure — take as long as you need to study passages, figures, and calculations.</li>
                <li>Optionally limit questions to one assessment provider, or practice across all available questions.</li>
              </ul>
            </div>

            <!-- Launch Button -->
            <button
              id="start-practice-btn"
              type="button"
              class="w-full py-3.5 px-6 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-label-lg font-label-lg transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-lg">play_arrow</span>
              <span>Start Practice Session</span>
            </button>
          </div>
        </div>
    `;
    appEl.innerHTML = renderWorkspaceLayout({
      user,
      streak: workspaceData.streak,
      activePath: '/practice',
      content,
    });
    bindWorkspaceLayout(appEl, { auth, navigate });

    appEl.querySelector('#practice-employer').addEventListener('change', (event) => {
      selectedEmployer = event.target.value;
    });

    appEl.querySelectorAll('.cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.getAttribute('data-cat');
        renderSetupView();
      });
    });

    appEl.querySelectorAll('.cnt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        questionCount = parseInt(btn.getAttribute('data-cnt'), 10);
        renderSetupView();
      });
    });

    const startBtn = appEl.querySelector('#start-practice-btn');
    startBtn.addEventListener('click', async () => {
      const employerInput = appEl.querySelector('#practice-employer');
      const employerValue = employerInput.value.trim();
      const selectedCompany = employers.find(
        (item) => item.employer.toLowerCase() === employerValue.toLowerCase()
      );
      if (employerValue && !selectedCompany) {
        employerInput.setCustomValidity('Choose a company from the available assessment providers.');
        employerInput.reportValidity();
        return;
      }
      employerInput.setCustomValidity('');

      startBtn.disabled = true;
      startBtn.innerHTML = `
        <span class="animate-spin material-symbols-outlined text-sm">progress_activity</span>
        <span>Loading Practice Pack...</span>
      `;
      try {
        const res = await api.startExam({
          exam_type: 'practice',
          exam_category: selectedCategory,
          employer: selectedCompany?.employer ?? null,
          total_questions: questionCount,
          time_limit_seconds: 7200,
        });
        session = res.session;
        questions = res.questions;
        currentIndex = 1;
        renderActivePracticeView();
      } catch (err) {
        alert(`Failed to start practice: ${err.message}`);
        startBtn.disabled = false;
        startBtn.innerHTML = 'Start Practice Session';
      }
    });
  }

  function renderActivePracticeView() {
    const currentQ = questions.find((q) => q.question_index === currentIndex) || questions[0];
    const total = questions.length;
    const answeredCount = questions.filter((q) => q.selected_answer).length;
    const correctCount = questions.filter((q) => q.selected_answer && q.selected_answer === q.correct_answer).length;
    const incorrectCount = questions.filter((q) => q.selected_answer && q.selected_answer !== q.correct_answer).length;
    const flaggedCount = questions.filter((q) => q.is_flagged).length;
    const unvisitedCount = total - answeredCount;
    const progressPercent = Math.round((currentIndex / Math.max(1, total)) * 100);
    const accuracyPercent = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : '0.0';

    const categoryTitle = selectedCategory === 'Mixed' ? 'Mixed Practice' : selectedCategory;
    const promptSnippet = currentQ.question_text || currentQ.question || '';

    const content = `
        <!-- Assessment Control Sub-Header -->
        <section class="practice-control-header bg-surface-container-lowest border-b border-outline-variant/30">
          <div class="practice-controls-inner">
            <!-- Context & Breadcrumbs -->
            <div class="practice-breadcrumb">
              <div class="flex flex-wrap items-center gap-1.5 text-label-md font-label-md text-on-surface-variant">
                <a href="#/practice" class="hover:text-primary transition-colors">Practice Questions</a>
                <span class="text-outline">/</span>
                <span class="hover:text-primary transition-colors capitalize">${escapeHtml(categoryTitle)}</span>
                <span class="text-outline">/</span>
                <span class="practice-question-prompt text-on-surface font-semibold truncate max-w-xs md:max-w-sm" title="${escapeHtml(promptSnippet)}">${escapeHtml(promptSnippet)}</span>
              </div>
            </div>

            <!-- Center Progress Indicator -->
            <div class="practice-progress flex items-center gap-4">
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-label-sm font-label-sm text-on-surface font-semibold">Question ${currentIndex} of ${total}</span>
                  <span class="text-label-sm font-label-sm text-primary font-bold">${progressPercent}% completed</span>
                </div>
                <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div class="bg-primary-container h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%;"></div>
                </div>
              </div>
            </div>

            <!-- Action Controls -->
            <div class="practice-action-controls">
              <button
                id="practice-bookmark-btn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-label-md font-label-md transition-colors shadow-xs ${
                  currentQ.is_flagged
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-surface-container-low text-primary border-primary/30 hover:bg-surface-container'
                }"
                type="button"
                title="Bookmark Question"
              >
                <span class="material-symbols-outlined text-base ${currentQ.is_flagged ? 'text-amber-600' : ''}" style="font-variation-settings: 'FILL' ${currentQ.is_flagged ? 1 : 0};">bookmark</span>
                <span>${currentQ.is_flagged ? 'Bookmarked' : 'Bookmark'}</span>
              </button>

              <button
                id="practice-report-btn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low text-label-md font-label-md transition-colors"
                type="button"
                title="Report Issue"
              >
                <span class="material-symbols-outlined text-base">flag</span>
                <span class="hidden sm:inline">Report</span>
              </button>

              <button
                id="practice-end-btn"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-outline-variant/60 text-error hover:bg-error-container hover:text-on-error-container text-label-md font-label-md font-medium transition-colors"
                type="button"
              >
                <span>End Practice</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Main Canvas -->
        <div class="w-full">
          <div class="practice-question-grid">
            <!-- Left/Center Question Area (8 Columns) -->
            <section class="practice-question-card flex flex-col gap-6">
              <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-6 md:p-8 shadow-sm">
                <div id="question-card-container"></div>

                <!-- Bottom Navigation Bar inside Card -->
                <div class="practice-session-footer flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-outline-variant/30">
                  <div class="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      id="practice-prev-btn"
                      type="button"
                      ${currentIndex === 1 ? 'disabled' : ''}
                      class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-label-md font-label-md font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span class="material-symbols-outlined text-base">arrow_back</span>
                      <span>Previous</span>
                    </button>

                    <button
                      id="practice-next-btn"
                      type="button"
                      ${currentIndex === total ? 'disabled' : ''}
                      class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-label-md font-label-md font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span>Next</span>
                      <span class="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>

                  <button
                    id="finish-review-btn"
                    type="button"
                    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-secondary text-on-secondary text-label-md font-label-md font-semibold hover:bg-secondary/90 shadow-xs transition-colors"
                  >
                    <span class="material-symbols-outlined text-base">check</span>
                    <span>Finish Session</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- Right Column Auxiliary Sidebar (4 Columns) -->
            <aside class="flex flex-col gap-6">
              <!-- Question Matrix Navigation Palette -->
              <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
                  <h3 class="text-headline-sm font-headline-sm text-on-surface font-bold flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-primary text-lg">grid_view</span>
                    <span>Question Matrix</span>
                  </h3>
                  <span class="text-label-sm font-label-sm text-outline">${total} Questions</span>
                </div>

                <!-- Status Legend matching Stitch -->
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
                    <span id="telemetry-flagged-count">${flaggedCount} Flagged</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-on-surface-variant">
                    <span class="w-2.5 h-2.5 rounded-full bg-outline-variant"></span>
                    <span>${unvisitedCount} Unvisited</span>
                  </div>
                </div>

                <!-- Matrix Grid -->
                <div class="grid grid-cols-5 gap-2 text-center text-label-md font-label-md max-h-72 overflow-y-auto passage-scroll p-1" id="matrix-grid-container">
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

                <!-- Fast Question Filters -->
                <div class="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-label-sm font-label-sm text-primary">
                  <button id="filter-bookmarked-btn" class="hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">bookmark</span>
                    <span id="filter-bookmarked-label">Bookmarked (${flaggedCount})</span>
                  </button>
                  <button id="filter-unanswered-btn" class="hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">visibility_off</span>
                    <span>Unanswered (${unvisitedCount})</span>
                  </button>
                </div>
              </div>

              <!-- Quick Stats Session Card -->
              <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 shadow-sm">
                <h3 class="text-headline-sm font-headline-sm text-on-surface font-bold mb-3 flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-lg">insights</span>
                  <span>Session Telemetry</span>
                </h3>
                <div class="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div class="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                    <span class="text-label-sm font-label-sm text-outline block">Correct</span>
                    <span class="text-headline-md font-headline-md text-secondary font-bold">${correctCount}</span>
                  </div>
                  <div class="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                    <span class="text-label-sm font-label-sm text-outline block">Incorrect</span>
                    <span class="text-headline-md font-headline-md text-error font-bold">${incorrectCount}</span>
                  </div>
                  <div class="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                    <span class="text-label-sm font-label-sm text-outline block">Accuracy</span>
                    <span class="text-headline-md font-headline-md text-primary font-bold">${accuracyPercent}%</span>
                  </div>
                </div>

                <!-- Session accuracy -->
                <div class="space-y-1.5">
                  <div class="flex justify-between text-label-sm font-label-sm">
                    <span class="text-on-surface-variant font-medium">Session accuracy</span>
                    <span class="text-on-surface-variant">${answeredCount} answered</span>
                  </div>
                  <div class="relative w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div class="bg-secondary h-full rounded-full" style="width: ${accuracyPercent}%;"></div>
                  </div>
                </div>
              </div>

              <!-- Secondary Workflow Actions -->
              <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 shadow-sm space-y-2.5">
                <button id="skip-q-btn" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-label-md font-label-md font-semibold transition-colors">
                  <span class="material-symbols-outlined text-base">skip_next</span>
                  <span>Skip Question</span>
                </button>
                <button id="save-revision-btn" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-label-md font-label-md font-semibold transition-colors">
                  <span class="material-symbols-outlined text-base">update</span>
                  <span>Save for Later Revision</span>
                </button>
                <button id="open-formula-btn" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high text-label-sm font-label-sm font-semibold transition-colors mt-2">
                  <span class="material-symbols-outlined text-base">functions</span>
                  <span>Formula Sheet &amp; Exchange Notes</span>
                </button>
              </div>
            </aside>
          </div>
        </div>

        <!-- Clean Status Footer -->
        <footer class="bg-surface-container-lowest border-t border-outline-variant/30 py-3 px-6 mt-8">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-label-sm font-label-sm text-outline">
            <div class="flex items-center gap-4">
              <span>Study GT · Practice session</span>
              <span class="hidden md:inline">•</span>
              <span class="hidden md:inline">Questions from the available question bank</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="hover:text-primary transition-colors cursor-pointer">Keyboard Shortcuts (1-4)</span>
              <span>•</span>
              <span class="hover:text-primary transition-colors cursor-pointer">Calculators Allowed</span>
              <span>•</span>
              <a href="#/support" class="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </footer>
    `;
    appEl.innerHTML = renderWorkspaceLayout({
      user,
      streak: workspaceData.streak,
      activePath: '/practice',
      content,
    });
    bindWorkspaceLayout(appEl, { auth, navigate });

    // Render Question Card
    const cardContainer = appEl.querySelector('#question-card-container');
    const cardEl = renderQuestionCard({
      question: currentQ,
      currentIndex,
      totalQuestions: total,
      practiceMode: true,
      userName: (user.name || 'Candidate').split(' ')[0],
      onSelectOption: async (optKey) => {
        currentQ.selected_answer = optKey;
        try {
          await api.submitAnswer(session.session_id, currentIndex, optKey);
        } catch (err) {
          console.error('Failed to submit practice answer:', err);
        }
      },
    });
    cardContainer.appendChild(cardEl);

    // Matrix button click listeners
    appEl.querySelectorAll('.matrix-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetIdx = parseInt(btn.getAttribute('data-qidx'), 10);
        currentIndex = targetIdx;
        renderActivePracticeView();
      });
    });

    // Navigation buttons
    const prevBtn = appEl.querySelector('#practice-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 1) {
          currentIndex -= 1;
          renderActivePracticeView();
        }
      });
    }

    const nextBtn = appEl.querySelector('#practice-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < total) {
          currentIndex += 1;
          renderActivePracticeView();
        }
      });
    }

    // Bookmark Toggle - Responsive & Optimistic
    const bookmarkBtn = appEl.querySelector('#practice-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        const newFlag = !currentQ.is_flagged;
        currentQ.is_flagged = newFlag;

        // Instant DOM update
        if (newFlag) {
          bookmarkBtn.className =
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-label-md font-label-md transition-all shadow-xs bg-amber-50 text-amber-800 border-amber-300 scale-[1.03]';
          bookmarkBtn.innerHTML = `
            <span class="material-symbols-outlined text-base text-amber-600" style="font-variation-settings: 'FILL' 1;">bookmark</span>
            <span>Bookmarked</span>
          `;
        } else {
          bookmarkBtn.className =
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-label-md font-label-md transition-all shadow-xs bg-surface-container-low text-primary border-primary/30 hover:bg-surface-container';
          bookmarkBtn.innerHTML = `
            <span class="material-symbols-outlined text-base" style="font-variation-settings: 'FILL' 0;">bookmark</span>
            <span>Bookmark</span>
          `;
        }
        setTimeout(() => bookmarkBtn.classList.remove('scale-[1.03]'), 150);

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

        // Update Counters
        const totalFlagged = questions.filter((q) => q.is_flagged).length;
        const countEl = appEl.querySelector('#telemetry-flagged-count');
        if (countEl) countEl.textContent = `${totalFlagged} Flagged`;
        const filterLbl = appEl.querySelector('#filter-bookmarked-label');
        if (filterLbl) filterLbl.textContent = `Bookmarked (${totalFlagged})`;

        showToast(
          newFlag ? 'Question saved to Bookmarks' : 'Removed from Bookmarks',
          { icon: newFlag ? 'bookmark_added' : 'bookmark_remove' }
        );

        // Background API sync
        api.toggleFlag(session.session_id, currentIndex, newFlag).catch((err) => {
          console.error('Failed to sync bookmark:', err);
          currentQ.is_flagged = !newFlag;
          showToast('Failed to save bookmark. Reverted.', { icon: 'error', type: 'error' });
          renderActivePracticeView();
        });
      });
    }

    // Report Issue button
    appEl.querySelector('#practice-report-btn').addEventListener('click', () => {
      alert(`Report submitted for Question ${currentIndex}. Our psychometrics team will review it shortly.`);
    });

    const endPracticeHandler = () => {
      if (activeEndDialog) return;

      const answered = questions.filter((question) => question.selected_answer).length;
      const unanswered = total - answered;
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/70 p-4 backdrop-blur-sm';
      modal.setAttribute('role', 'presentation');
      modal.innerHTML = `
        <section
          class="w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-practice-title"
          aria-describedby="end-practice-description"
        >
          <div class="mb-4 flex items-start gap-3">
            <span class="material-symbols-outlined rounded-full bg-error-container p-2 text-error" aria-hidden="true">logout</span>
            <div>
              <h2 id="end-practice-title" class="text-headline-sm font-headline-sm font-bold text-on-surface">End this practice session?</h2>
              <p id="end-practice-description" class="mt-2 text-body-sm text-on-surface-variant">
                You can finish now and review your results. Your saved answers will be kept; unanswered questions will remain unanswered.
              </p>
            </div>
          </div>
          <div class="mb-5 rounded-xl bg-surface-container-low p-3 text-label-md text-on-surface-variant">
            <span class="font-semibold text-on-surface">${answered} answered</span>
            <span aria-hidden="true"> · </span>
            <span>${unanswered} unanswered</span>
          </div>
          <p class="mb-4 hidden text-body-sm text-error" id="end-practice-error" role="alert"></p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="end-practice-cancel rounded-lg border border-outline-variant/60 px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-low">
              Keep Practicing
            </button>
            <button type="button" class="end-practice-confirm rounded-lg bg-error px-4 py-2.5 text-label-md font-semibold text-on-error hover:opacity-90">
              End Session &amp; View Results
            </button>
          </div>
        </section>
      `;
      document.body.appendChild(modal);

      const cancelButton = modal.querySelector('.end-practice-cancel');
      const confirmButton = modal.querySelector('.end-practice-confirm');
      const errorMessage = modal.querySelector('#end-practice-error');
      let isCompleting = false;
      const closeDialog = () => {
        modal.remove();
        document.removeEventListener('keydown', onKeyDown);
        if (activeEndDialog === closeDialog) activeEndDialog = null;
        if (document.contains(triggerButton)) triggerButton.focus();
      };
      const onKeyDown = (event) => {
        if (event.key === 'Escape' && !isCompleting) closeDialog();
      };
      const triggerButton = document.activeElement;
      activeEndDialog = closeDialog;
      document.addEventListener('keydown', onKeyDown);
      cancelButton.addEventListener('click', closeDialog);
      modal.addEventListener('click', (event) => {
        if (event.target === modal && !isCompleting) closeDialog();
      });
      confirmButton.addEventListener('click', async () => {
        if (isCompleting) return;
        isCompleting = true;
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        confirmButton.textContent = 'Ending session…';
        errorMessage.classList.add('hidden');

        try {
          await api.completeExam(session.session_id);
          closeDialog();
          navigate(`/results/${session.session_id}`);
        } catch (error) {
          console.error('Failed to finish practice session:', error);
          errorMessage.textContent = `Could not end the session: ${error.message || 'Please try again.'}`;
          errorMessage.classList.remove('hidden');
          confirmButton.disabled = false;
          cancelButton.disabled = false;
          confirmButton.textContent = 'End Session & View Results';
          isCompleting = false;
        }
      });
      confirmButton.focus();
    };

    appEl.querySelector('#practice-end-btn').addEventListener('click', endPracticeHandler);
    appEl.querySelector('#finish-review-btn').addEventListener('click', endPracticeHandler);
    const headerFinishBtn = appEl.querySelector('#header-finish-btn');
    if (headerFinishBtn) headerFinishBtn.addEventListener('click', endPracticeHandler);

    // Secondary actions
    appEl.querySelector('#skip-q-btn').addEventListener('click', () => {
      if (currentIndex < total) {
        currentIndex += 1;
        renderActivePracticeView();
      }
    });

    const saveRevBtn = appEl.querySelector('#save-revision-btn');
    if (saveRevBtn) {
      saveRevBtn.addEventListener('click', () => {
        currentQ.is_flagged = true;
        saveRevBtn.innerHTML = `
          <span class="material-symbols-outlined text-base text-secondary" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          <span class="text-secondary font-semibold">Saved for Revision</span>
        `;
        if (bookmarkBtn) {
          bookmarkBtn.className =
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-label-md font-label-md transition-all shadow-xs bg-amber-50 text-amber-800 border-amber-300';
          bookmarkBtn.innerHTML = `
            <span class="material-symbols-outlined text-base text-amber-600" style="font-variation-settings: 'FILL' 1;">bookmark</span>
            <span>Bookmarked</span>
          `;
        }
        const matrixBtn = appEl.querySelector(`[data-qidx="${currentIndex}"]`);
        if (matrixBtn && !matrixBtn.querySelector('.flag-pip')) {
          const pip = document.createElement('span');
          pip.className = 'flag-pip absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400';
          matrixBtn.appendChild(pip);
        }
        const totalFlagged = questions.filter((q) => q.is_flagged).length;
        const countEl = appEl.querySelector('#telemetry-flagged-count');
        if (countEl) countEl.textContent = `${totalFlagged} Flagged`;
        const filterLbl = appEl.querySelector('#filter-bookmarked-label');
        if (filterLbl) filterLbl.textContent = `Bookmarked (${totalFlagged})`;

        showToast('Question saved to Bookmarks for revision', { icon: 'bookmark_added' });

        api.toggleFlag(session.session_id, currentIndex, true).catch((e) => {
          console.error('Failed to save for revision:', e);
        });
      });
    }

    appEl.querySelector('#open-formula-btn').addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 bg-inverse-surface/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in';
      modal.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/30">
            <h3 class="text-headline-sm font-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">functions</span>
              <span>Formula Sheet &amp; Exchange Notes</span>
            </h3>
            <button class="close-formula-btn p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <div class="space-y-3 text-body-sm text-on-surface">
            <div class="p-3 bg-surface-container-low rounded-lg">
              <p class="font-bold text-label-md text-primary">Percentage Change:</p>
              <code>((New - Old) / Old) × 100</code>
            </div>
            <div class="p-3 bg-surface-container-low rounded-lg">
              <p class="font-bold text-label-md text-primary">Currency Conversion:</p>
              <code>Total (₦) = USD Amount ($) × Exchange Rate (₦/$)</code>
            </div>
            <div class="p-3 bg-surface-container-low rounded-lg">
              <p class="font-bold text-label-md text-primary">Weighted Average:</p>
              <code>Sum(Value × Weight) / Sum(Weights)</code>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('.close-formula-btn').addEventListener('click', close);
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    });
  }

  renderSetupView();
  Promise.all([api.getEmployers(), api.getCategories()]).then(([providerRows, categoryRows]) => {
    employers = Array.isArray(providerRows) ? providerRows : [];
    categories = [
      'Mixed',
      ...new Set(
        (Array.isArray(categoryRows) ? categoryRows : [])
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ];
    if (!categories.includes(selectedCategory)) selectedCategory = 'Mixed';
    if (selectedEmployer && !employers.some((item) => item.employer === selectedEmployer)) {
      selectedEmployer = '';
    }
    if (appEl.querySelector('#practice-employer')) renderSetupView();
  }).catch((error) => {
    console.error('Failed to load practice setup options:', error);
    const status = appEl.querySelector('#practice-employer-status');
    if (status) {
      status.textContent = 'Assessment options could not be loaded. You can still practice all questions.';
    }
  });

  return () => {
    if (activeEndDialog) activeEndDialog();
  };
}
