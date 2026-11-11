/**
 * Mock examination setup with providers and question counts from the question bank.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';
import { bindProviderLogoFallbacks, getProviderLogoMarkup } from '../components/providerLogo.js';
import { ProctorManager } from '../components/proctor.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function renderMocksPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  const workspaceData = getWorkspaceData(api);
  let selectedEmployer = '';
  let totalQuestions = 60;
  let timeLimitMinutes = 60;
  let employers = null;
  let providersError = '';

  function render() {
    const currentTrack = employers?.find((provider) => provider.employer === selectedEmployer);
    totalQuestions = Math.min(60, Number(currentTrack?.question_count || 0));

    const content = `
        <div class="max-w-5xl w-full mx-auto px-6 py-10">
          <div class="mb-8">
            <div class="mb-1 text-label-sm font-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
              Timed practice environment
            </div>
            <h1 class="text-display-lg-mobile md:text-headline-lg font-headline-lg font-extrabold text-on-surface tracking-tight">
              Timed Mock Assessment
            </h1>
            <p class="text-body-md font-body-md text-on-surface-variant mt-1.5 leading-relaxed">
              Take a timed assessment using questions available from the selected provider in the Study GT question bank.
            </p>
          </div>

          <!-- Employer Track Selection Cards -->
          <div class="mb-8">
            <label class="block text-label-sm font-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              1. Select a provider
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${employers === null ? `
                <div class="col-span-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-center text-on-surface-variant" role="status">
                  <span class="animate-spin material-symbols-outlined mr-2 align-middle">progress_activity</span>
                  Loading providers from the question bank…
                </div>
              ` : providersError ? `
                <div class="col-span-full rounded-xl border border-error/30 bg-surface-container-lowest p-6 text-error" role="alert">
                  Could not load providers: ${escapeHtml(providersError)}
                </div>
              ` : employers.length === 0 ? `
                <p class="col-span-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 text-on-surface-variant">
                  No providers currently have questions in the question bank.
                </p>
              ` : employers.map((provider) => {
                const isSelected = provider.employer === selectedEmployer;
                return `
                  <div
                    data-track="${escapeHtml(provider.employer)}"
                    class="track-card cursor-pointer p-5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-2 border-primary-container bg-surface-container-low ring-1 ring-primary-container shadow-sm'
                        : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }"
                  >
                    <div class="mb-2 flex min-w-0 items-center gap-3">
                      ${getProviderLogoMarkup(provider.employer)}
                      <h3 class="min-w-0 flex-1 font-bold text-headline-sm font-headline-sm text-on-surface break-words">${escapeHtml(provider.employer)}</h3>
                    </div>
                    <p class="text-body-sm font-body-sm text-on-surface-variant mb-4">
                      Sections: ${(provider.categories || []).map(escapeHtml).join(', ') || 'No section information available'}
                    </p>
                    <div class="flex items-center gap-4 text-label-sm font-label-sm font-semibold text-on-surface pt-3 border-t border-outline-variant/30">
                      <span class="flex items-center gap-1 text-primary">
                        <span class="material-symbols-outlined text-sm">schedule</span>
                        <span>${timeLimitMinutes} minutes</span>
                      </span>
                      <span class="flex items-center gap-1 text-secondary">
                        <span class="material-symbols-outlined text-sm">help</span>
                        <span>${Math.min(60, Number(provider.question_count || 0))} of ${Number(provider.question_count || 0).toLocaleString()} questions</span>
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Pre-Flight Security & Proctoring Checklist -->
          <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 sm:p-8 shadow-sm mb-8">
            <h2 class="text-headline-sm font-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-xl">gavel</span>
              <span>2. Proctoring &amp; examination rules</span>
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <!-- Rule 1 -->
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div class="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center font-bold text-sm mb-2">
                  <span class="material-symbols-outlined text-base">fullscreen</span>
                </div>
                <h4 class="text-label-sm font-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">Fullscreen Starts Automatically</h4>
                <p class="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  The assessment opens in fullscreen when supported. You can exit fullscreen at any time using the browser controls or Escape.
                </p>
              </div>

              <!-- Rule 2 -->
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm mb-2">
                  <span class="material-symbols-outlined text-base">tab</span>
                </div>
                <h4 class="text-label-sm font-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">Tab Switching Monitored</h4>
                <p class="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  Navigating away from the exam tab is logged. Reaching 3 strikes results in automatic test disqualification.
                </p>
              </div>

              <!-- Rule 3 -->
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div class="w-8 h-8 rounded-lg bg-secondary-container text-secondary flex items-center justify-center font-bold text-sm mb-2">
                  <span class="material-symbols-outlined text-base">lock_clock</span>
                </div>
                <h4 class="text-label-sm font-label-sm font-bold text-on-surface uppercase tracking-wider mb-1">Hard Clock Cutoff</h4>
                <p class="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  When the 60-minute countdown expires, your exam will auto-submit regardless of remaining items.
                </p>
              </div>
            </div>

            <!-- Agreement Checkbox -->
            <label class="flex items-center gap-3 p-3.5 rounded-lg border border-outline-variant/40 bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors">
              <input id="proctor-agree-checkbox" type="checkbox" class="w-4 h-4 rounded border-outline text-primary focus:ring-primary" />
              <span class="text-body-sm font-body-sm text-on-surface leading-snug">
                I understand and agree to the Study GT session rules. I confirm that I am in a quiet testing environment.
              </span>
            </label>
          </div>

          <!-- Launch Button -->
          <button
            id="launch-mock-btn"
            type="button"
            disabled
            class="w-full py-4 px-6 bg-primary-container text-on-primary font-bold rounded-xl text-label-lg font-label-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none hover:bg-primary"
          >
            <span class="material-symbols-outlined text-lg">rocket_launch</span>
            <span>Launch timed mock</span>
          </button>
        </div>
    `;
    appEl.innerHTML = renderWorkspaceLayout({
      user,
      streak: workspaceData.streak,
      activePath: '/mocks',
      content,
    });
    bindWorkspaceLayout(appEl, { auth, navigate });
    bindProviderLogoFallbacks(appEl);

    // Select a provider loaded from the question bank.
    appEl.querySelectorAll('.track-card').forEach((card) => {
      card.addEventListener('click', () => {
        selectedEmployer = card.getAttribute('data-track');
        render();
      });
    });

    const checkbox = appEl.querySelector('#proctor-agree-checkbox');
    const launchBtn = appEl.querySelector('#launch-mock-btn');

    if (checkbox && launchBtn) {
      checkbox.addEventListener('change', () => {
        launchBtn.disabled = !checkbox.checked || !selectedEmployer || totalQuestions < 1;
      });

      launchBtn.addEventListener('click', async () => {
        if (!selectedEmployer || totalQuestions < 1) return;
        const fullscreenRequest = ProctorManager.requestFullscreen();
        launchBtn.disabled = true;
        launchBtn.innerHTML = `
          <span class="animate-spin material-symbols-outlined text-sm">progress_activity</span>
          <span>Configuring Proctored Assessment Environment...</span>
        `;
        try {
          const res = await api.startExam({
            exam_type: 'mock',
            employer: selectedEmployer,
            exam_category: 'Mixed',
            total_questions: totalQuestions,
            time_limit_seconds: timeLimitMinutes * 60,
          });
          await fullscreenRequest;
          navigate(`/exam/${res.session.session_id}`);
        } catch (err) {
          const enteredFullscreen = await fullscreenRequest;
          if (enteredFullscreen) await ProctorManager.exitFullscreen();
          alert(`Failed to launch mock: ${err.message}`);
          launchBtn.disabled = false;
          launchBtn.innerHTML = `
            <span class="material-symbols-outlined text-lg">rocket_launch</span>
            <span>Launch timed mock</span>
          `;
        }
      });
    }
  }

  render();
  try {
    employers = await api.getEmployers();
    selectedEmployer = employers[0]?.employer || '';
  } catch (error) {
    console.error('Failed to load mock providers:', error);
    providersError = error.message || 'An unexpected error occurred.';
    employers = [];
  }
  render();
  return () => {};
}
