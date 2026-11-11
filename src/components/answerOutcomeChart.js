const formatCount = (value) => Number(value || 0).toLocaleString();

export function renderAnswerOutcomeChart(correctAnswers, incorrectAnswers) {
  const correct = Math.max(0, Number(correctAnswers) || 0);
  const incorrect = Math.max(0, Number(incorrectAnswers) || 0);
  const total = correct + incorrect;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const correctLength = total ? circumference * correct / total : 0;
  const incorrectLength = total ? circumference * incorrect / total : 0;
  const accuracy = total ? Math.round(correct * 100 / total) : 0;

  return `
    <div class="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg class="h-40 w-40 shrink-0" viewBox="0 0 120 120" role="img" aria-labelledby="answer-outcome-title answer-outcome-desc">
        <title id="answer-outcome-title">Correct and incorrect answers</title>
        <desc id="answer-outcome-desc">${formatCount(correct)} correct and ${formatCount(incorrect)} incorrect out of ${formatCount(total)} answered questions.</desc>
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e8e6f0" stroke-width="14" />
        ${correctLength ? `
          <circle
            cx="60" cy="60" r="${radius}" fill="none" stroke="#006c4a" stroke-width="14"
            stroke-dasharray="${correctLength} ${circumference - correctLength}"
            transform="rotate(-90 60 60)"
          >
            <title>${formatCount(correct)} correct</title>
          </circle>
        ` : ''}
        ${incorrectLength ? `
          <circle
            cx="60" cy="60" r="${radius}" fill="none" stroke="#ba1a1a" stroke-width="14"
            stroke-dasharray="${incorrectLength} ${circumference - incorrectLength}"
            stroke-dashoffset="${-correctLength}"
            transform="rotate(-90 60 60)"
          >
            <title>${formatCount(incorrect)} incorrect</title>
          </circle>
        ` : ''}
        <text x="60" y="56" text-anchor="middle" fill="#131b2e" font-size="20" font-weight="700">${formatCount(total)}</text>
        <text x="60" y="73" text-anchor="middle" fill="#777587" font-size="10">answered</text>
      </svg>
      <div class="flex flex-col gap-3 text-body-sm">
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 shrink-0 rounded-full bg-secondary"></span>
          <span class="text-on-surface-variant">Correct</span>
          <span class="ml-auto font-semibold text-on-surface">${formatCount(correct)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="h-3 w-3 shrink-0 rounded-full bg-error"></span>
          <span class="text-on-surface-variant">Incorrect</span>
          <span class="ml-auto font-semibold text-on-surface">${formatCount(incorrect)}</span>
        </div>
        <p class="text-label-sm text-on-surface-variant">${accuracy}% accuracy across answered questions</p>
      </div>
    </div>
  `;
}
