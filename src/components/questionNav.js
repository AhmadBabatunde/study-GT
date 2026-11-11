/**
 * Question Navigator Grid Component.
 * Displays summary telemetry (Answered, Flagged, Unanswered) and interactive question grid.
 */

export function renderQuestionNav({
  questions = [],
  currentIndex = 1,
  onSelectQuestion = null,
}) {
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-5';

  const total = questions.length;
  const answered = questions.filter((q) => q.selected_answer).length;
  const flagged = questions.filter((q) => q.is_flagged).length;
  const unanswered = total - answered;

  // Grid buttons
  const gridHtml = questions
    .map((q) => {
      const idx = q.question_index;
      const isCurrent = idx === currentIndex;
      const isAnswered = Boolean(q.selected_answer);
      const isFlagged = Boolean(q.is_flagged);

      let btnClass = 'bg-surface-container-low border-outline-variant/40 text-on-surface hover:bg-surface-container';

      if (isAnswered) {
        btnClass = 'bg-secondary-container/30 border-secondary text-secondary font-semibold';
      }

      if (isCurrent) {
        btnClass = 'bg-primary text-on-primary font-bold shadow-md ring-2 ring-primary ring-offset-2';
      }

      return `
        <button
          data-index="${idx}"
          type="button"
          class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg border text-xs sm:text-sm font-medium flex items-center justify-center transition-all ${btnClass}"
        >
          <span>${idx}</span>
          ${isFlagged ? `
            <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs">
              <span class="material-symbols-outlined text-[9px] leading-none">flag</span>
            </span>
          ` : ''}
        </button>
      `;
    })
    .join('');

  container.innerHTML = `
    <!-- Response Status Summary -->
    <div class="grid grid-cols-3 gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 text-center">
      <div class="flex flex-col">
        <span class="text-xs text-on-surface-variant font-medium">Answered</span>
        <span class="text-sm font-bold text-secondary">${answered}</span>
      </div>
      <div class="flex flex-col border-x border-outline-variant/40">
        <span class="text-xs text-on-surface-variant font-medium">Flagged</span>
        <span class="text-sm font-bold text-amber-600">${flagged}</span>
      </div>
      <div class="flex flex-col">
        <span class="text-xs text-on-surface-variant font-medium">Remaining</span>
        <span class="text-sm font-bold text-on-surface">${unanswered}</span>
      </div>
    </div>

    <!-- Question Matrix -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Question Matrix</span>
        <span class="text-xs text-outline">${total} Items</span>
      </div>
      <div class="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1 passage-scroll">
        ${gridHtml}
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-[11px] text-on-surface-variant">
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-primary"></span>
        <span>Active</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-secondary-container border border-secondary"></span>
        <span>Answered</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded bg-amber-500"></span>
        <span>Flagged</span>
      </div>
    </div>
  `;

  // Attach button click listeners
  if (typeof onSelectQuestion === 'function') {
    const buttons = container.querySelectorAll('button[data-index]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        onSelectQuestion(idx);
      });
    });
  }

  return container;
}

