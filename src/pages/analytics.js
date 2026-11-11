/**
 * Performance analytics based on the signed-in user's answered questions.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceDataAsync, renderWorkspaceLayout } from '../components/workspaceLayout.js';
import { getEightWeekActivity, renderWeeklyActivityChart } from '../components/weeklyActivityChart.js';
import { renderAnswerOutcomeChart } from '../components/answerOutcomeChart.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

function renderAccuracyChart(categories) {
  const rows = [...categories].sort((a, b) =>
    Number(b.questions_answered || 0) - Number(a.questions_answered || 0)
  );
  const chartWidth = 680;
  const labelWidth = 190;
  const plotWidth = 380;
  const rowHeight = 38;
  const chartHeight = Math.max(90, rows.length * rowHeight + 20);
  const bars = rows.map((category, index) => {
    const y = 16 + index * rowHeight;
    const answered = Number(category.questions_answered || 0);
    const accuracy = Math.max(0, Math.min(100, Number(category.accuracy || 0)));
    const width = plotWidth * accuracy / 100;
    return `
      <text x="${labelWidth - 12}" y="${y + 16}" text-anchor="end" fill="#464555" font-size="12">${escapeHtml(category.category)}</text>
      <rect x="${labelWidth}" y="${y}" width="${plotWidth}" height="20" rx="8" fill="#f2f3ff" />
      ${answered ? `<rect x="${labelWidth}" y="${y}" width="${width}" height="20" rx="8" fill="#006c4a" />` : ''}
      <text x="${labelWidth + plotWidth + 12}" y="${y + 15}" fill="#464555" font-size="11">
        ${answered ? `${accuracy}% · ${answered} answered` : 'Not measured'}
      </text>
    `;
  }).join('');

  return `
    <svg class="mt-4 w-full" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-labelledby="accuracy-chart-title accuracy-chart-desc">
      <title id="accuracy-chart-title">Accuracy by section</title>
      <desc id="accuracy-chart-desc">Your accuracy for each section with answered question counts; unattempted sections are not measured.</desc>
      ${bars}
    </svg>
  `;
}

function renderQuestionBankChart(categories) {
  const rows = [...categories].sort((a, b) =>
    Number(b.question_count || 0) - Number(a.question_count || 0)
  );
  const chartWidth = 680;
  const labelWidth = 190;
  const plotWidth = 380;
  const rowHeight = 38;
  const chartHeight = Math.max(90, rows.length * rowHeight + 20);
  const maxQuestions = Math.max(1, ...rows.map((row) => Number(row.question_count || 0)));
  const bars = rows.map((category, index) => {
    const y = 16 + index * rowHeight;
    const bankCount = Number(category.question_count || 0);
    const answered = Number(category.questions_answered || 0);
    const bankWidth = plotWidth * bankCount / maxQuestions;
    const answeredWidth = plotWidth * Math.min(bankCount, answered) / maxQuestions;
    return `
      <text x="${labelWidth - 12}" y="${y + 16}" text-anchor="end" fill="#464555" font-size="12">${escapeHtml(category.category)}</text>
      <rect x="${labelWidth}" y="${y}" width="${bankWidth}" height="20" rx="8" fill="#d9d6ec">
        <title>${bankCount} questions in bank</title>
      </rect>
      ${answered ? `<rect x="${labelWidth}" y="${y}" width="${answeredWidth}" height="20" rx="8" fill="#3525cd"><title>${answered} answered</title></rect>` : ''}
      <text x="${labelWidth + plotWidth + 12}" y="${y + 15}" fill="#464555" font-size="11">${answered}/${bankCount}</text>
    `;
  }).join('');

  return `
    <svg class="mt-4 w-full" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-labelledby="bank-chart-title bank-chart-desc">
      <title id="bank-chart-title">Question bank coverage by section</title>
      <desc id="bank-chart-desc">Bar length shows available questions, with the darker overlay showing how many you have answered.</desc>
      ${bars}
    </svg>
  `;
}

export async function renderAnalyticsPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  appEl.innerHTML = renderWorkspaceLayout({
    user,
    streak: null,
    activePath: '/analytics',
    content: `
      <div class="mx-auto flex min-h-64 max-w-7xl items-center justify-center gap-3 text-primary" role="status">
        <span class="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
        <span>Loading your progress…</span>
      </div>
    `,
  });
  bindWorkspaceLayout(appEl, { auth, navigate });

  let progress;
  let workspaceData;
  try {
    [progress, workspaceData] = await Promise.all([
      api.getProgress(),
      getWorkspaceDataAsync(api),
    ]);
  } catch (error) {
    console.error('Failed to load performance analytics:', error);
    appEl.querySelector('.workspace-main').innerHTML = `
      <div class="mx-auto max-w-3xl rounded-xl border border-error/30 bg-surface-container-lowest p-6" role="alert">
        <h1 class="text-xl font-bold text-on-surface">Your progress could not be loaded</h1>
        <p class="mt-2 text-sm text-on-surface-variant">${escapeHtml(error.message)}</p>
        <button type="button" id="retry-analytics" class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">
          Try again
        </button>
      </div>
    `;
    appEl.querySelector('#retry-analytics')?.addEventListener('click', () => renderAnalyticsPage(appEl, { navigate }));
    return () => {};
  }

  const { summary, recommendation } = progress;
  const weeklyActivity = getEightWeekActivity(progress.weekly_activity);
  const metricsByCategory = new Map((progress.categories || []).map((category) => [category.category, category]));
  const availableCategories = progress.available_categories || [];
  const categories = [
    ...availableCategories.map((category) => ({
      category: category.category,
      question_count: Number(category.question_count || 0),
      ...(metricsByCategory.get(category.category) || {}),
    })),
    ...(progress.categories || [])
      .filter((category) => !availableCategories.some((available) => available.category === category.category))
      .map((category) => ({ ...category, question_count: 0 })),
  ];
  const content = `
    <div class="mx-auto max-w-7xl space-y-6 pb-8">
      <section class="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 class="text-display-lg-mobile font-bold tracking-tight text-on-surface">Performance</h1>
          <p class="mt-2 text-body-md text-on-surface-variant">
            Accuracy, timing, and practice activity calculated from your answered questions.
          </p>
        </div>
        <button id="export-progress-btn" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary-container">
          <span class="material-symbols-outlined text-lg">download</span>
          Download progress CSV
        </button>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Performance summary">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Questions answered</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.questions_answered.toLocaleString()}</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">${summary.correct_answers.toLocaleString()} correct</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Accuracy</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.accuracy}%</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">Correct answers divided by answered questions</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Average answer time</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.average_response_seconds}s</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">For answered questions with timing recorded</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Practice sessions</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.sessions_started.toLocaleString()}</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">${summary.sessions_completed.toLocaleString()} completed</p>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm xl:col-span-2">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-headline-sm font-bold text-on-surface">Your weekly practice</h2>
              <p class="mt-1 text-body-sm text-on-surface-variant">Correct and incorrect answers recorded in the last eight weeks.</p>
            </div>
            <div class="flex items-center gap-4 text-label-sm text-on-surface-variant">
              <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-secondary"></span>Correct</span>
              <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-secondary-container"></span>Incorrect</span>
            </div>
          </div>
          ${weeklyActivity.some((week) => week.answered) ? renderWeeklyActivityChart(weeklyActivity) : `
            <div class="mt-4 flex min-h-48 items-center justify-center rounded-lg bg-surface-container-low px-6 text-center text-body-sm text-on-surface-variant">
              Your weekly chart will appear after you answer your first questions.
            </div>
          `}
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <h2 class="text-headline-sm font-bold text-on-surface">Answer outcomes</h2>
            <p class="mt-1 text-body-sm text-on-surface-variant">Your total correct and incorrect answers.</p>
          </div>
          ${renderAnswerOutcomeChart(
            summary.correct_answers,
            summary.questions_answered - summary.correct_answers
          )}
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article class="overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <h2 class="text-headline-sm font-bold text-on-surface">Accuracy by section</h2>
            <p class="mt-1 text-body-sm text-on-surface-variant">Only answered questions are measured; there is no external benchmark.</p>
          </div>
          ${renderAccuracyChart(categories)}
        </article>
        <article class="overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <h2 class="text-headline-sm font-bold text-on-surface">Question bank coverage</h2>
            <p class="mt-1 text-body-sm text-on-surface-variant">Available questions compared with your answered questions by section.</p>
          </div>
          <div class="mt-3 flex items-center gap-4 text-label-sm text-on-surface-variant">
            <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-[#d9d6ec]"></span>In bank</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-primary"></span>Answered</span>
          </div>
          ${renderQuestionBankChart(categories)}
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article class="rounded-xl border border-primary/20 bg-surface-container-lowest p-6 lg:col-span-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">psychology</span>
            <h2 class="text-headline-sm font-bold text-on-surface">Adaptive practice recommendation</h2>
          </div>
          <p class="mt-3 font-semibold text-on-surface">${escapeHtml(recommendation.category)} practice</p>
          <p class="mt-2 text-body-sm leading-relaxed text-on-surface-variant">${escapeHtml(recommendation.reason)}</p>
          ${recommendation.accuracy === null ? '' : `
            <p class="mt-2 text-label-sm text-on-surface-variant">
              Estimated accuracy: ${recommendation.accuracy}% from ${recommendation.based_on_questions} answers in this section.
            </p>
          `}
          <p class="mt-2 text-label-sm text-on-surface-variant">
            Online Thompson-sampling bandit · trained from ${Number(recommendation.trained_on_answers || 0).toLocaleString()} of your answers
          </p>
          <a href="#/practice?category=${encodeURIComponent(recommendation.category)}" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary">
            Practise this section
          </a>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
          <h2 class="text-headline-sm font-bold text-on-surface">Study streak</h2>
          <p class="mt-3 text-3xl font-bold text-on-surface" data-study-streak-count>
            ${Number.isInteger(workspaceData.streak?.current_streak) ? `${workspaceData.streak.current_streak} Days` : '—'}
          </p>
          <p class="mt-2 text-body-sm text-on-surface-variant" data-study-streak-status>
            ${workspaceData.streak?.studied_today ? 'Studied today' : 'Study streak is based on your activity'}
          </p>
        </article>
      </section>

      <section class="overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
        <div class="mb-5">
          <h2 class="text-headline-sm font-bold text-on-surface">Section breakdown</h2>
          <p class="mt-1 text-body-sm text-on-surface-variant">Question counts come from the question bank; performance counts come from your answers. No external benchmarks are used.</p>
        </div>
        ${categories.length ? `
          <div class="overflow-x-auto">
            <table class="w-full min-w-[42rem] text-left text-body-sm">
              <thead>
                <tr class="border-b border-outline-variant/50 text-label-sm uppercase text-on-surface-variant">
                  <th class="pb-3 pr-4">Section</th>
                  <th class="pb-3 pr-4">Questions in bank</th>
                  <th class="pb-3 pr-4">Answered</th>
                  <th class="pb-3 pr-4">Correct</th>
                  <th class="pb-3 pr-4">Accuracy</th>
                  <th class="pb-3 text-right">Average time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/20">
                ${categories.map((category) => {
                  const answered = Number(category.questions_answered || 0);
                  const accuracy = Number(category.accuracy || 0);
                  return `
                    <tr>
                      <td class="py-3.5 pr-4 font-semibold text-on-surface">${escapeHtml(category.category)}</td>
                      <td class="py-3.5 pr-4 text-on-surface-variant">${Number(category.question_count || 0).toLocaleString()}</td>
                      <td class="py-3.5 pr-4 text-on-surface-variant">${answered.toLocaleString()}</td>
                      <td class="py-3.5 pr-4 text-on-surface-variant">${Number(category.correct_answers || 0).toLocaleString()}</td>
                      <td class="py-3.5 pr-4 font-semibold text-on-surface">${answered ? `${accuracy}%` : '0%'}</td>
                      <td class="py-3.5 text-right text-on-surface-variant">${answered ? `${Number(category.average_response_seconds || 0)}s` : '—'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-body-sm text-on-surface-variant">No question-bank sections are available yet.</p>'}
      </section>
    </div>
  `;

  appEl.innerHTML = renderWorkspaceLayout({
    user,
    streak: workspaceData.streak,
    activePath: '/analytics',
    content,
  });
  bindWorkspaceLayout(appEl, { auth, navigate });

  appEl.querySelector('#export-progress-btn')?.addEventListener('click', () => {
    const rows = [
      ['Section', 'Questions in bank', 'Questions answered', 'Correct answers', 'Accuracy (%)', 'Average answer time (seconds)'],
      ...categories.map((category) => [
        category.category,
        category.question_count || 0,
        category.questions_answered || 0,
        category.correct_answers || 0,
        category.accuracy || 0,
        category.average_response_seconds || 0,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-gt-progress.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  return () => {};
}
