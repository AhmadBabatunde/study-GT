/**
 * Employer preparation hub backed by the assessment providers in the question bank.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';
import { bindProviderLogoFallbacks, getProviderLogoMarkup } from '../components/providerLogo.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function renderEmployerPrepPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  const workspaceData = getWorkspaceData(api);
  let providers = [];
  let activeFilter = 'All Providers';
  let searchTerm = '';
  let loadError = null;

  function render(restoreSearchFocus = false) {
    const categories = [...new Set(providers.flatMap((provider) => provider.categories || []))].sort();
    const filterChips = ['All Providers', ...categories];
    const filteredProviders = providers.filter((provider) => {
      const categoriesForProvider = provider.categories || [];
      const matchesFilter = activeFilter === 'All Providers' || categoriesForProvider.includes(activeFilter);
      const searchableText = `${provider.employer} ${categoriesForProvider.join(' ')}`.toLowerCase();
      return matchesFilter && searchableText.includes(searchTerm);
    });
    const questionCount = providers.reduce((sum, provider) => sum + Number(provider.question_count || 0), 0);
    const imageCount = providers.reduce((sum, provider) => sum + Number(provider.image_count || 0), 0);
    const content = `
      <div class="mx-auto max-w-7xl space-y-8">
        <header class="border-b border-outline-variant pb-6">
          <div class="max-w-3xl">
            <h1 class="text-display-lg font-display-lg text-on-surface tracking-tight mb-2">
              Prepare for Your Dream Company
            </h1>
            <p class="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              Browse the assessment providers and question sections available in the Study GT question bank.
            </p>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p class="text-headline-sm font-bold text-primary">${providers.length}</p>
              <p class="text-label-sm text-on-surface-variant">Providers in the question bank</p>
            </div>
            <div class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p class="text-headline-sm font-bold text-primary">${questionCount.toLocaleString()}</p>
              <p class="text-label-sm text-on-surface-variant">Available questions</p>
            </div>
            <div class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4">
              <p class="text-headline-sm font-bold text-primary">${imageCount.toLocaleString()}</p>
              <p class="text-label-sm text-on-surface-variant">Questions with diagrams</p>
            </div>
          </div>
          <div class="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label class="sr-only" for="employer-search-input">Search question-bank providers</label>
            <input
              id="employer-search-input"
              class="w-full max-w-xl rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search providers or assessment sections"
              type="search"
              value="${escapeHtml(searchTerm)}"
            />
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              ${filterChips.map((chip) => `
                <button
                  type="button"
                  data-filter="${escapeHtml(chip)}"
                  class="filter-chip shrink-0 rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-colors ${
                    chip === activeFilter
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                  }"
                >${escapeHtml(chip)}</button>
              `).join('')}
            </div>
          </div>
        </header>

        ${loadError ? `
          <div role="alert" class="rounded-xl border border-error/30 bg-error-container/40 p-5 text-on-surface">
            Could not load assessment providers: ${escapeHtml(loadError)}
          </div>
        ` : ''}
        ${!loadError && providers.length === 0 ? `
          <div class="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
            No providers are currently available in the question bank.
          </div>
        ` : ''}
        ${providers.length > 0 && filteredProviders.length === 0 ? `
          <div class="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center text-on-surface-variant">
            No providers match this search.
          </div>
        ` : ''}
        <section class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          ${filteredProviders.map((provider) => {
            const name = provider.employer;
            const questionLink = `#/practice?employer=${encodeURIComponent(name)}`;
            const providerCategories = provider.categories || [];
            return `
              <article class="flex min-w-0 flex-col rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-5 shadow-sm transition-colors hover:border-primary">
                <div class="flex min-w-0 items-center gap-3 border-b border-outline-variant/30 pb-4">
                  ${getProviderLogoMarkup(name)}
                  <h2 class="min-w-0 break-words text-headline-sm font-bold text-on-surface">${escapeHtml(name)}</h2>
                </div>
                <div class="flex-1 space-y-3 py-4 text-body-sm text-on-surface">
                  <p class="flex items-start gap-2">
                    <span class="material-symbols-outlined shrink-0 text-outline">folder_open</span>
                    <span>${Number(provider.question_count || 0).toLocaleString()} questions in the bank</span>
                  </p>
                  <p class="flex items-start gap-2">
                    <span class="material-symbols-outlined shrink-0 text-outline">image</span>
                    <span>${Number(provider.image_count || 0).toLocaleString()} questions with diagrams</span>
                  </p>
                  <div class="flex items-start gap-2">
                    <span class="material-symbols-outlined shrink-0 text-outline">quiz</span>
                    <ul class="min-w-0 space-y-1">
                      ${providerCategories.map((category) => `<li class="break-words">${escapeHtml(category)}</li>`).join('')}
                    </ul>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
                  <span class="text-label-sm text-on-surface-variant">Question-bank practice</span>
                  <a
                    href="${questionLink}"
                    class="shrink-0 rounded-lg bg-primary-container px-4 py-2 text-label-md font-semibold text-on-primary hover:bg-primary"
                  >Practice</a>
                </div>
              </article>
            `;
          }).join('')}
        </section>
      </div>
    `;

    appEl.innerHTML = renderWorkspaceLayout({
      user,
      streak: workspaceData.streak,
      activePath: '/employer-prep',
      content,
    });
    bindWorkspaceLayout(appEl, { auth, navigate });
    bindProviderLogoFallbacks(appEl);

    const searchEl = appEl.querySelector('#employer-search-input');
    searchEl?.addEventListener('input', (event) => {
      searchTerm = event.target.value.toLowerCase().trim();
      render(true);
    });
    appEl.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.getAttribute('data-filter');
        render();
      });
    });

    if (restoreSearchFocus) {
      const input = appEl.querySelector('#employer-search-input');
      input?.focus();
      input?.setSelectionRange(searchTerm.length, searchTerm.length);
    }
  }

  render();
  try {
    const response = await api.getEmployers();
    providers = Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to load assessment providers:', error);
    loadError = error.message;
  }
  render();
  return () => {};
}
