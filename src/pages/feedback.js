/**
 * Community feedback page for sharing and ranking Study GT experiences.
 */

import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceDataAsync, renderWorkspaceLayout } from '../components/workspaceLayout.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const PAGE_SIZE = 20;
const categories = [
  { value: 'all', label: 'All topics' },
  { value: 'test', label: 'Assessment prep tips' },
  { value: 'employer', label: 'Employer insights' },
  { value: 'administrator', label: 'Test administrators' },
  { value: 'app', label: 'Study GT app' },
];

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export async function renderFeedbackPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  let workspaceData;
  try {
    workspaceData = await getWorkspaceDataAsync(api);
  } catch (error) {
    console.error('Failed to load workspace data for feedback:', error);
    workspaceData = { streak: null };
  }

  let selectedCategory = 'all';
  let sort = 'top';
  let offset = 0;
  let posts = [];
  let total = 0;
  let isLoading = false;
  let postsError = false;
  let loadRequestId = 0;
  let categoriesFromBank = [];
  let employersFromBank = [];

  const content = `
    <div class="mx-auto max-w-5xl space-y-6 pb-8">
      <section class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm sm:p-8">
        <p class="text-label-sm font-semibold uppercase tracking-wide text-black">Candidate knowledge exchange</p>
        <h1 class="mt-1 text-display-lg-mobile font-bold tracking-tight text-on-surface">Share assessment tips &amp; employer insights</h1>
        <p class="mt-2 max-w-3xl text-body-md leading-relaxed text-on-surface-variant">
          Help other candidates prepare with assessment strategies, useful test tips, interview experiences, recruitment updates, or salary insights. You can also suggest ways to improve Study GT. Share only information you are comfortable making public.
        </p>
      </section>

      <section class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article class="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
          <h2 class="text-headline-sm font-bold text-on-surface">Share a tip or insight</h2>
          <p class="mt-1 text-body-sm text-on-surface-variant">Choose what it relates to, then share something useful for other candidates. Your name is shown with your post.</p>
          <form id="feedback-form" class="mt-5 space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-label-md font-semibold text-on-surface">What is your tip or insight about?</span>
              <select id="feedback-category" name="category" required class="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20">
                ${categories.filter((item) => item.value !== 'all').map((item) => `
                  <option value="${item.value}">${item.label}</option>
                `).join('')}
              </select>
            </label>
            <label id="feedback-topic-field" class="block">
              <span id="feedback-topic-label" class="mb-1.5 block text-label-md font-semibold text-on-surface">Assessment section</span>
              <select id="feedback-topic-select" class="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"></select>
              <input id="feedback-topic-input" type="text" maxlength="120" class="hidden w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20" />
              <span id="feedback-topic-help" class="mt-1 block text-label-sm text-on-surface-variant" aria-live="polite"></span>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-label-md font-semibold text-on-surface">Your tip or insight</span>
              <textarea id="feedback-body" name="body" required minlength="1" maxlength="2000" rows="5" placeholder="Share an assessment strategy, interview experience, recruitment update, salary insight, or other useful thought that could help a candidate prepare." class="w-full resize-y rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"></textarea>
              <span class="mt-1 block text-right text-label-sm text-on-surface-variant"><span id="feedback-character-count">0</span>/2000</span>
            </label>
            <p id="feedback-form-error" class="hidden text-body-sm text-black" role="alert"></p>
            <button id="feedback-submit" type="submit" class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50">
              <span class="material-symbols-outlined text-lg">send</span>
              <span>Share with candidates</span>
            </button>
          </form>
        </article>

        <section aria-labelledby="feedback-list-heading">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="feedback-list-heading" class="text-headline-sm font-bold text-on-surface">Candidate tips &amp; insights</h2>
              <p id="feedback-total" class="mt-1 text-body-sm text-on-surface-variant" aria-live="polite">Loading posts…</p>
            </div>
            <label class="flex shrink-0 items-center gap-2 whitespace-nowrap text-label-sm font-semibold text-on-surface-variant">
              <span class="whitespace-nowrap">Sort by</span>
              <select id="feedback-sort" class="min-w-[9.5rem] rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-2.5 py-2 pr-9 text-on-surface focus:border-black focus:outline-none">
                <option value="top">Most useful</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
          <label class="mb-4 block">
            <span class="sr-only">Filter candidate tips by topic</span>
            <select id="feedback-filter" class="w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-3 py-2.5 text-body-sm text-on-surface focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20">
              ${categories.map((item) => `<option value="${item.value}">${item.label}</option>`).join('')}
            </select>
          </label>
          <div id="feedback-list" class="space-y-3" aria-live="polite"></div>
          <p id="feedback-list-error" class="hidden mt-3 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4 text-body-sm text-black" role="alert"></p>
          <button id="feedback-load-more" type="button" class="mt-4 hidden w-full rounded-lg border border-outline-variant/60 px-4 py-2.5 text-label-md font-semibold text-black hover:bg-surface-container-low">
            Load more feedback
          </button>
        </section>
      </section>
    </div>
  `;

  appEl.innerHTML = renderWorkspaceLayout({
    user,
    streak: workspaceData.streak,
    activePath: '/feedback',
    content,
  });
  bindWorkspaceLayout(appEl, { auth, navigate });

  const categorySelect = appEl.querySelector('#feedback-category');
  const topicField = appEl.querySelector('#feedback-topic-field');
  const topicLabel = appEl.querySelector('#feedback-topic-label');
  const topicSelect = appEl.querySelector('#feedback-topic-select');
  const topicInput = appEl.querySelector('#feedback-topic-input');
  const topicHelp = appEl.querySelector('#feedback-topic-help');
  const form = appEl.querySelector('#feedback-form');
  const bodyInput = appEl.querySelector('#feedback-body');
  const formError = appEl.querySelector('#feedback-form-error');
  const submitButton = appEl.querySelector('#feedback-submit');
  const listEl = appEl.querySelector('#feedback-list');
  const listError = appEl.querySelector('#feedback-list-error');
  const totalLabel = appEl.querySelector('#feedback-total');
  const loadMoreButton = appEl.querySelector('#feedback-load-more');
  const categoryFilter = appEl.querySelector('#feedback-filter');
  const sortSelect = appEl.querySelector('#feedback-sort');

  function setTopicMode() {
    const category = categorySelect.value;
    topicSelect.innerHTML = '';
    topicInput.value = '';
    topicHelp.textContent = '';
    topicInput.required = false;
    topicSelect.required = false;

    if (category === 'app') {
      topicField.classList.add('hidden');
      return;
    }

    topicField.classList.remove('hidden');
    if (category === 'test' || category === 'employer') {
      const options = category === 'test' ? categoriesFromBank : employersFromBank;
      const label = category === 'test' ? 'Assessment section or general tips' : 'Employer';
      topicLabel.textContent = label;
      topicSelect.classList.remove('hidden');
      topicInput.classList.add('hidden');
      topicSelect.required = true;
      const bankOptions = options.map((item) => {
        const value = category === 'test' ? item.category : item.employer;
        return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
      }).join('');
      const generalTipsOption = category === 'test'
        ? '<option value="General assessment tips">General assessment tips (all sections)</option>'
        : '';
      topicSelect.innerHTML = category === 'test' || options.length
        ? `<option value="">Choose ${category === 'test' ? 'a section or general tips' : 'an employer'}</option>${generalTipsOption}${bankOptions}`
        : '<option value="">No employers are currently available</option>';
      topicSelect.disabled = category === 'employer' && options.length === 0;
      topicHelp.textContent = category === 'test'
        ? options.length
          ? 'Share ways to approach a section, manage time, or prepare for the assessment.'
          : 'Question-bank sections are unavailable right now, but you can still share general assessment tips.'
        : options.length
          ? 'Interview process, recruitment stages, salary news, or other employer-specific insights are welcome.'
          : 'Employer options could not be loaded from the question bank. Please try again later.';
      return;
    }

    topicLabel.textContent = 'Administrator or recruitment stage';
    topicSelect.classList.add('hidden');
    topicSelect.disabled = true;
    topicInput.classList.remove('hidden');
    topicInput.required = true;
    topicInput.placeholder = 'For example, assessment day check-in or Dragnet administration';
    topicHelp.textContent = 'Share a useful experience with the assessment or recruitment process.';
  }

  function renderPosts() {
    if (isLoading && !posts.length) {
      listEl.innerHTML = `
        <div class="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-body-sm text-on-surface-variant" role="status">
          <span class="animate-spin material-symbols-outlined">progress_activity</span>
          Loading community feedback…
        </div>
      `;
      return;
    }
    if (postsError && !posts.length) {
      listEl.innerHTML = '';
      return;
    }
    if (!posts.length) {
      listEl.innerHTML = `
        <div class="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
          <span class="material-symbols-outlined text-3xl text-outline" aria-hidden="true">forum</span>
          <p class="mt-2 font-semibold text-on-surface">No feedback here yet</p>
          <p class="mt-1 text-body-sm text-on-surface-variant">Be the first to share a tip that helps another candidate prepare.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = posts.map((post) => {
      const isOwner = Number(post.user_id) === Number(user.id);
      const categoryLabel = categories.find((item) => item.value === post.category)?.label || 'Feedback';
      return `
        <article class="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm sm:p-5" data-post-id="${Number(post.id)}">
          <div class="flex flex-col items-center gap-1" aria-label="${Number(post.score)} votes">
            <button
              type="button"
              data-vote="1"
              aria-label="Upvote useful feedback"
              aria-pressed="${Number(post.user_vote) === 1}"
              ${isOwner ? 'disabled title="You cannot vote on your own post"' : ''}
              class="rounded-md p-1 text-on-surface-variant hover:bg-neutral-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 ${Number(post.user_vote) === 1 ? 'bg-neutral-200 text-black' : ''}"
            >
              <span class="material-symbols-outlined">thumb_up</span>
            </button>
            <span class="text-label-md font-bold text-on-surface" data-score>${Number(post.score)}</span>
            <button
              type="button"
              data-vote="-1"
              aria-label="Downvote feedback"
              aria-pressed="${Number(post.user_vote) === -1}"
              ${isOwner ? 'disabled title="You cannot vote on your own post"' : ''}
              class="rounded-md p-1 text-on-surface-variant hover:bg-neutral-100 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 ${Number(post.user_vote) === -1 ? 'bg-neutral-200 text-black' : ''}"
            >
              <span class="material-symbols-outlined">thumb_down</span>
            </button>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-semibold text-on-surface">${escapeHtml(post.author_name || 'Study GT user')}</span>
              <span class="text-label-sm text-on-surface-variant">${escapeHtml(formatDate(post.created_at))}</span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-1 text-label-sm font-semibold text-neutral-800">${escapeHtml(categoryLabel)}</span>
              ${post.category === 'app' ? '' : `<span class="text-label-sm font-semibold text-on-surface-variant">${escapeHtml(post.topic)}</span>`}
            </div>
            <p class="mt-3 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-on-surface">${escapeHtml(post.body)}</p>
            <div class="mt-3 flex flex-wrap items-center gap-3 text-label-sm text-on-surface-variant">
              <span>${Number(post.upvotes)} upvotes</span>
              <span>${Number(post.downvotes)} downvotes</span>
              ${isOwner ? `
                <button type="button" data-delete class="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-black hover:bg-neutral-100">
                  <span class="material-symbols-outlined text-base">delete</span> Delete
                </button>
              ` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    listEl.querySelectorAll('[data-vote]').forEach((button) => {
      button.addEventListener('click', async () => {
        const postElement = button.closest('[data-post-id]');
        const postId = Number(postElement.dataset.postId);
        const post = posts.find((item) => Number(item.id) === postId);
        if (!post) return;
        const vote = Number(button.dataset.vote);
        const nextVote = Number(post.user_vote) === vote ? 0 : vote;
        button.disabled = true;
        listError.classList.add('hidden');
        try {
          await api.voteFeedback(postId, nextVote);
          await loadPosts(true);
        } catch (error) {
          console.error('Failed to vote on feedback:', error);
          listError.textContent = `Your vote could not be saved: ${error.message}`;
          listError.classList.remove('hidden');
          button.disabled = false;
        }
      });
    });

    listEl.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const postElement = button.closest('[data-post-id]');
        const postId = Number(postElement.dataset.postId);
        if (button.dataset.confirming !== 'true') {
          button.dataset.confirming = 'true';
          button.classList.add('bg-neutral-200');
          button.innerHTML = '<span class="material-symbols-outlined text-base">delete</span> Confirm delete';
          const cancelButton = document.createElement('button');
          cancelButton.type = 'button';
          cancelButton.dataset.deleteCancel = '';
          cancelButton.className = 'rounded-md px-2 py-1 font-semibold text-on-surface-variant hover:bg-surface-container';
          cancelButton.textContent = 'Cancel';
          button.after(cancelButton);
          cancelButton.addEventListener('click', () => {
            button.dataset.confirming = 'false';
            renderPosts();
          });
          return;
        }

        button.disabled = true;
        try {
          await api.deleteFeedback(postId);
          await loadPosts(true);
        } catch (error) {
          console.error('Failed to delete feedback:', error);
          listError.textContent = `Your post could not be deleted: ${error.message}`;
          listError.classList.remove('hidden');
          button.disabled = false;
        }
      });
    });
  }

  async function loadPosts(reset = false) {
    const requestId = ++loadRequestId;
    if (reset) {
      offset = 0;
      posts = [];
    }
    isLoading = true;
    postsError = false;
    listError.classList.add('hidden');
    totalLabel.textContent = 'Loading community feedback…';
    if (!posts.length) renderPosts();
    try {
      const result = await api.getFeedback({
        category: selectedCategory === 'all' ? null : selectedCategory,
        sort,
        limit: PAGE_SIZE,
        offset,
      });
      if (requestId !== loadRequestId) return;
      posts = reset ? result.posts : [...posts, ...result.posts];
      total = Number(result.total || 0);
      postsError = false;
      totalLabel.textContent = `${total.toLocaleString()} ${total === 1 ? 'post' : 'posts'}`;
      loadMoreButton.classList.toggle('hidden', posts.length >= total);
    } catch (error) {
      if (requestId !== loadRequestId) return;
      console.error('Failed to load community feedback:', error);
      postsError = true;
      totalLabel.textContent = 'Feedback could not be loaded';
      listError.textContent = `Community feedback could not be loaded: ${error.message}`;
      listError.classList.remove('hidden');
    } finally {
      if (requestId === loadRequestId) {
        isLoading = false;
        loadMoreButton.disabled = false;
        renderPosts();
      }
    }
  }

  categorySelect.addEventListener('change', setTopicMode);
  bodyInput.addEventListener('input', () => {
    appEl.querySelector('#feedback-character-count').textContent = String(bodyInput.value.length);
  });
  categoryFilter.addEventListener('change', () => {
    selectedCategory = categoryFilter.value;
    loadPosts(true);
  });
  sortSelect.addEventListener('change', () => {
    sort = sortSelect.value;
    loadPosts(true);
  });
  loadMoreButton.addEventListener('click', () => {
    offset += PAGE_SIZE;
    loadMoreButton.disabled = true;
    loadPosts();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.classList.add('hidden');
    const category = categorySelect.value;
    const topic = category === 'app'
      ? 'Study GT app'
      : category === 'administrator'
        ? topicInput.value.trim()
        : topicSelect.value;
    const body = bodyInput.value.trim();
    if (!topic || !body) {
      formError.textContent = 'Choose a topic and enter your comment before posting.';
      formError.classList.remove('hidden');
      return;
    }

    submitButton.disabled = true;
    submitButton.querySelector('span:last-child').textContent = 'Posting…';
    try {
      await api.createFeedback({ category, topic, body });
      form.reset();
      appEl.querySelector('#feedback-character-count').textContent = '0';
      setTopicMode();
      sort = 'top';
      sortSelect.value = sort;
      selectedCategory = 'all';
      categoryFilter.value = selectedCategory;
      await loadPosts(true);
    } catch (error) {
      console.error('Failed to post community feedback:', error);
      formError.textContent = `Your feedback could not be posted: ${error.message}`;
      formError.classList.remove('hidden');
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector('span:last-child').textContent = 'Share with candidates';
    }
  });

  setTopicMode();
  loadPosts(true);
  Promise.all([api.getCategories(), api.getEmployers()])
    .then(([categoryRows, employerRows]) => {
      categoriesFromBank = Array.isArray(categoryRows)
        ? categoryRows.filter((item) => item?.category)
        : [];
      employersFromBank = Array.isArray(employerRows)
        ? employerRows.filter((item) => item?.employer)
        : [];
      setTopicMode();
    })
    .catch((error) => {
      console.error('Failed to load feedback topics from the question bank:', error);
      topicHelp.textContent = 'Assessment and employer options could not be loaded. General assessment tips, app feedback, or test-administration experiences are still welcome.';
    });

  return () => {};
}
