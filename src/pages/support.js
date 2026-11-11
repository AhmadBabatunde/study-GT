import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const helpItems = [
  {
    question: 'How do I practice questions?',
    answer: 'Open Practice Questions from the sidebar, choose a section and session length, then submit your answers to view explanations.',
  },
  {
    question: 'How do I take a timed mock?',
    answer: 'Open Mock Exams, choose an assessment track and complete the pre-flight checklist before starting the timed session.',
  },
  {
    question: 'Where are my saved questions?',
    answer: 'Select a question flag while reviewing a session. Flagged questions are collected on the Bookmarks page and can be removed there.',
  },
  {
    question: 'Where can I see my progress?',
    answer: 'Performance Analytics summarizes completed attempts, accuracy by section, and recent results.',
  },
];

export async function renderSupportPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate' };
  appEl.innerHTML = '<div class="flex h-screen items-center justify-center text-sm font-semibold text-primary">Loading support…</div>';
  try {
    const workspace = await getWorkspaceData(api);
    const content = `
      <div class="mx-auto max-w-3xl">
        <header class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Support</h1>
          <p class="mt-1 text-sm text-on-surface-variant">Help with practice sessions, mock exams, and your Study GT account.</p>
        </header>
        <section class="space-y-3">
          ${helpItems.map((item) => `
            <details class="rounded-xl border border-outline-variant/40 bg-white p-4 shadow-sm">
              <summary class="cursor-pointer font-semibold text-on-surface">${item.question}</summary>
              <p class="mt-3 text-sm leading-relaxed text-on-surface-variant">${item.answer}</p>
            </details>
          `).join('')}
        </section>
        <section class="mt-6 rounded-xl border border-outline-variant/40 bg-white p-5 shadow-sm">
          <h2 class="text-lg font-bold text-on-surface">Need more help?</h2>
          <p class="mt-1 text-sm text-on-surface-variant">Copy basic diagnostic details to include when you contact the Study GT administrator.</p>
          <button id="copy-support-details" type="button" class="mt-4 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low">Copy support details</button>
          <span id="support-copy-status" role="status" class="ml-3 text-sm text-on-surface-variant"></span>
        </section>
      </div>
    `;
    appEl.innerHTML = renderWorkspaceLayout({ user, streak: workspace.streak, activePath: '/support', content });
    bindWorkspaceLayout(appEl, { auth, navigate });
    appEl.querySelector('#copy-support-details').addEventListener('click', async () => {
      const status = appEl.querySelector('#support-copy-status');
      const details = [
        'Study GT support request',
        `Account: ${user.email || 'not available'}`,
        `Browser: ${navigator.userAgent}`,
        `Page: ${window.location.hash || '#/support'}`,
        `Time: ${new Date().toISOString()}`,
      ].join('\n');
      try {
        await navigator.clipboard.writeText(details);
        status.textContent = 'Copied. Include this with your support request.';
      } catch (error) {
        console.error('Could not copy support details:', error);
        status.textContent = 'Clipboard access was denied by the browser.';
      }
    });
  } catch (error) {
    console.error('Failed to load support page:', error);
    appEl.innerHTML = `<div class="p-8 text-sm text-error">Could not load support: ${escapeHtml(error.message)}</div>`;
  }
  return () => {};
}
