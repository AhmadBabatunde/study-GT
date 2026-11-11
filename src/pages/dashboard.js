/**
 * Candidate dashboard built from the signed-in user's activity and question-bank data.
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

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export async function renderDashboardPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  const firstName = escapeHtml((user.name || 'Candidate').trim().split(/\s+/)[0]);
  const loadingContent = `
    <div class="mx-auto flex min-h-64 max-w-7xl items-center justify-center gap-3 text-primary" role="status">
      <span class="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
      <span>Loading your dashboard…</span>
    </div>
  `;
  appEl.innerHTML = renderWorkspaceLayout({
    user,
    streak: null,
    activePath: '/dashboard',
    content: loadingContent,
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
    console.error('Failed to load dashboard progress:', error);
    appEl.querySelector('.workspace-main').innerHTML = `
      <div class="mx-auto max-w-3xl rounded-xl border border-error/30 bg-surface-container-lowest p-6" role="alert">
        <h1 class="text-xl font-bold text-on-surface">Your progress could not be loaded</h1>
        <p class="mt-2 text-sm text-on-surface-variant">${escapeHtml(error.message)}</p>
        <button type="button" id="retry-dashboard" class="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary">
          Try again
        </button>
      </div>
    `;
    appEl.querySelector('#retry-dashboard')?.addEventListener('click', () => renderDashboardPage(appEl, { navigate }));
    return () => {};
  }

  const summary = progress.summary;
  const recommendation = progress.recommendation;
  const practiceUrl = `#/practice?category=${encodeURIComponent(recommendation.category)}`;
  const categories = progress.categories || [];
  const recentSessions = progress.recent_sessions || [];
  const weeklyActivity = getEightWeekActivity(progress.weekly_activity);
  const content = `
    <div class="mx-auto max-w-7xl space-y-6 pb-8">
      <section class="flex flex-col justify-between gap-5 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 class="text-display-lg-mobile font-bold tracking-tight text-on-surface">Welcome, ${firstName}</h1>
          <p class="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Your Study GT progress updates as you answer questions.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <a href="#/practice" class="inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-label-lg font-semibold text-on-primary hover:bg-primary">
            <span class="material-symbols-outlined">play_arrow</span> Practise questions
          </a>
          <a href="#/mocks" class="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-label-lg font-semibold text-on-surface hover:bg-surface-container-low">
            <span class="material-symbols-outlined">assignment</span> Take a mock exam
          </a>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Your progress">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Questions answered</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.questions_answered.toLocaleString()}</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">${summary.correct_answers.toLocaleString()} correct</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Accuracy</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.accuracy}%</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">Based on questions you have answered</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Average answer time</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">${summary.average_response_seconds}s</p>
          <p class="mt-2 text-label-sm text-on-surface-variant">${summary.questions_answered ? 'Across answered questions with timing recorded' : 'Timing starts with your first answered question'}</p>
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5">
          <p class="text-label-md text-on-surface-variant">Study streak</p>
          <p class="mt-2 text-3xl font-bold text-on-surface">
            <span data-study-streak-count>${Number.isInteger(workspaceData.streak?.current_streak) ? `${workspaceData.streak.current_streak} days` : '…'}</span>
          </p>
          <p class="mt-2 text-label-sm text-on-surface-variant" data-study-streak-status>
            ${workspaceData.streak?.studied_today ? 'Studied today' : 'Study streak loads from your activity'}
          </p>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">lightbulb</span>
            <h2 class="text-headline-sm font-bold text-on-surface">A good next step</h2>
          </div>
          <p class="mt-3 font-semibold text-on-surface">${escapeHtml(recommendation.category)} practice</p>
          <p class="mt-2 text-body-sm leading-relaxed text-on-surface-variant">${escapeHtml(recommendation.reason)}</p>
          ${recommendation.accuracy === null ? '' : `
            <p class="mt-2 text-label-sm text-on-surface-variant">
              Accuracy so far: ${recommendation.accuracy}% across ${recommendation.based_on_questions} answered questions.
            </p>
          `}
          ${recommendation.model ? `
            <p class="mt-2 text-label-sm text-on-surface-variant">
              Adaptive model updated from ${Number(recommendation.trained_on_answers || 0).toLocaleString()} of your categorized answers.
            </p>
          ` : ''}
          <a href="${practiceUrl}" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary">
            Start this practice
          </a>
        </article>

        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-headline-sm font-bold text-on-surface">Section progress</h2>
            <a href="#/analytics" class="text-label-md font-semibold text-primary hover:underline">View all progress</a>
          </div>
          ${categories.length ? `
            <ul class="mt-4 space-y-4">
              ${categories.slice(0, 4).map((category) => `
                <li>
                  <div class="mb-1 flex justify-between gap-3 text-label-md">
                    <span class="min-w-0 break-words font-semibold text-on-surface">${escapeHtml(category.category)}</span>
                    <span class="shrink-0 text-on-surface-variant">${category.accuracy}% · ${category.questions_answered} answered</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-label="${escapeHtml(category.category)} accuracy" aria-valuenow="${category.accuracy}" aria-valuemin="0" aria-valuemax="100">
                    <div class="h-full rounded-full bg-primary-container" style="width:${Math.min(100, category.accuracy)}%"></div>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="mt-4 text-body-sm text-on-surface-variant">Answer some questions to see your section-by-section accuracy here.</p>'}
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm xl:col-span-2">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-headline-sm font-bold text-on-surface">Weekly practice</h2>
              <p class="mt-1 text-body-sm text-on-surface-variant">Correct and incorrect answers over the last eight weeks.</p>
            </div>
            <a href="#/analytics" class="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-label-md font-semibold text-primary hover:bg-surface-container-low">
              More <span class="material-symbols-outlined text-base">arrow_forward</span>
            </a>
          </div>
          <div class="mt-3 flex items-center gap-4 text-label-sm text-on-surface-variant">
            <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-secondary"></span>Correct</span>
            <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-secondary-container"></span>Incorrect</span>
          </div>
          ${weeklyActivity.some((week) => week.answered) ? renderWeeklyActivityChart(weeklyActivity) : `
            <div class="mt-4 rounded-lg bg-surface-container-low px-4 py-3 text-center text-body-sm text-on-surface-variant">
              Your weekly chart will fill in as you answer questions.
            </div>
            ${renderWeeklyActivityChart(weeklyActivity)}
          `}
        </article>
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
          <h2 class="text-headline-sm font-bold text-on-surface">Answer outcomes</h2>
          <p class="mt-1 text-body-sm text-on-surface-variant">Your total correct and incorrect answers.</p>
          ${renderAnswerOutcomeChart(
            summary.correct_answers,
            summary.questions_answered - summary.correct_answers
          )}
        </article>
      </section>

      <section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-headline-sm font-bold text-on-surface">Recent activity</h2>
          <span class="text-label-sm text-on-surface-variant">${summary.sessions_started} sessions started · ${summary.sessions_completed} completed</span>
        </div>
        ${recentSessions.length ? `
          <div class="overflow-x-auto">
            <table class="w-full min-w-[36rem] text-left text-body-sm">
              <thead>
                <tr class="border-b border-outline-variant/50 text-label-sm uppercase text-on-surface-variant">
                  <th class="pb-3 pr-4">Date</th>
                  <th class="pb-3 pr-4">Session</th>
                  <th class="pb-3 pr-4">Questions answered</th>
                  <th class="pb-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/20">
                ${recentSessions.map((session) => `
                  <tr>
                    <td class="py-3 pr-4 text-on-surface-variant">${formatDate(session.started_at)}</td>
                    <td class="py-3 pr-4 font-medium text-on-surface">${escapeHtml(session.employer || 'All providers')} · ${escapeHtml(session.exam_category || 'Mixed')}</td>
                    <td class="py-3 pr-4 text-on-surface-variant">${session.questions_answered}/${session.total_questions} · ${session.correct_answers} correct</td>
                    <td class="py-3 text-right">
                      ${['completed', 'cancelled'].includes(session.status)
                        ? `<a href="#/results/${encodeURIComponent(session.session_id)}" class="font-semibold text-primary hover:underline">View results</a>`
                        : `<a href="#/exam/${encodeURIComponent(session.session_id)}" class="font-semibold text-primary hover:underline">Continue</a>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-body-sm text-on-surface-variant">No practice or mock sessions yet. Start practising to build your activity history.</p>'}
      </section>
    </div>
  `;

  appEl.innerHTML = renderWorkspaceLayout({
    user,
    streak: workspaceData.streak,
    activePath: '/dashboard',
    content,
  });
  bindWorkspaceLayout(appEl, { auth, navigate });
  return () => {};
}
