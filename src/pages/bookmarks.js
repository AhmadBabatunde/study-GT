/**
 * Bookmarks Page for Study GT.
 * Renders each saved question as a complete, standalone entity (not tied to its past exam session).
 * Displays reading passage, diagram/image (via B2 image proxy), prompt, options, and full solution rationale.
 * Features instant optimistic bookmark removal and category filtering.
 */

import { api, getFullImageUrl } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';
import { showToast } from '../components/toast.js';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

function renderBookmarkItem(item, displayIndex) {
  let options = item.options || [];
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      options = [];
    }
  }

  const resolvedImageUrl = getFullImageUrl(item.image_url);
  const safeImageUrl = escapeHtml(resolvedImageUrl);
  const category = item.exam_category || item.category || 'Aptitude';
  const examType = item.exam_type || 'Reasoning';
  const correctAnswerKey = item.correct_answer || '';
  const explanation = item.explanation || item.correct_answer_text || 'Refer to the question prompt and option key.';

  // Image / Diagram Figure
  const imageHtml = resolvedImageUrl
    ? `
      <div class="my-3 bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 sm:p-4 text-center">
        <div class="flex items-center justify-between mb-2 px-1 text-label-sm font-label-sm text-on-surface-variant font-medium">
          <span class="flex items-center gap-1.5 font-bold text-primary">
            <span class="material-symbols-outlined text-base">image</span>
            <span>Reference Diagram / Stimulus Data Table</span>
          </span>
          <button
            type="button"
            data-zoom-img="${safeImageUrl}"
            class="zoom-trigger-btn inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-container px-2 py-0.5 rounded hover:bg-surface-container transition-colors"
          >
            <span class="material-symbols-outlined text-sm">zoom_in</span>
            <span>Enlarge Figure</span>
          </button>
        </div>
        <div class="relative bg-white rounded-lg p-3 flex items-center justify-center border border-outline-variant/30 overflow-hidden">
          <img
            src="${safeImageUrl}"
            alt="Bookmark Figure"
            class="max-h-72 sm:max-h-96 w-auto max-w-full object-contain rounded cursor-zoom-in"
            loading="lazy"
          />
        </div>
      </div>
    `
    : '';

  // Reading Passage
  const passageHtml = item.passage
    ? `
      <div class="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 sm:p-5 mb-3">
        <div class="flex items-center gap-2 mb-2 text-label-sm font-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
          <span class="material-symbols-outlined text-sm">article</span>
          <span>Reference Passage</span>
        </div>
        <div class="passage-scroll max-h-48 overflow-y-auto text-body-md font-body-md text-on-surface leading-relaxed whitespace-pre-line pr-2">
          ${escapeHtml(item.passage)}
        </div>
      </div>
    `
    : '';

  // Options List
  const optionsHtml = Array.isArray(options) && options.length
    ? `
      <div class="space-y-2.5 my-3">
        ${options.map((option) => {
          const key = option.key || '';
          const text = option.text || '';
          const isCorrect = key === correctAnswerKey;

          let cardClass = isCorrect
            ? 'border-2 border-secondary bg-secondary-container/20 text-secondary'
            : 'border border-outline-variant/40 bg-surface-container-lowest text-on-surface';
          let badgeClass = isCorrect
            ? 'bg-secondary text-on-secondary'
            : 'bg-surface-container text-on-surface-variant';
          let radioClass = isCorrect
            ? 'border-2 border-secondary bg-secondary text-white'
            : 'border border-outline-variant text-transparent';

          return `
            <div class="flex items-center p-3 rounded-lg ${cardClass} transition-colors">
              <div class="w-8 h-8 rounded-md ${badgeClass} flex items-center justify-center font-bold text-label-md mr-3 shrink-0">
                ${key}
              </div>
              <div class="flex-1 text-body-md font-medium leading-snug">
                ${escapeHtml(text)}
              </div>
              <div class="w-5 h-5 rounded-full shrink-0 ml-3 flex items-center justify-center ${radioClass}">
                ${isCorrect ? '<span class="material-symbols-outlined text-xs font-bold leading-none">check</span>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `
    : '';

  return `
    <article
      id="bookmark-card-${escapeHtml(item.session_id)}-${item.question_index}"
      class="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all duration-200"
    >
      <!-- Question Meta Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-outline-variant/30">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1 bg-primary-container text-on-primary font-bold rounded-md text-label-sm font-label-sm">
            Saved Item #${displayIndex}
          </span>
          <span class="px-2.5 py-1 bg-surface-container-low text-primary border border-primary/20 font-semibold rounded text-label-sm font-label-sm">
            ${escapeHtml(category)}
          </span>
          <span class="px-2.5 py-1 bg-surface-container-low text-on-surface-variant border border-outline-variant/30 rounded text-label-sm font-label-sm">
            ${escapeHtml(examType)}
          </span>
        </div>

        <button
          type="button"
          data-remove-bookmark
          data-session-id="${escapeHtml(item.session_id)}"
          data-question-index="${item.question_index}"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-label-sm font-label-sm font-semibold text-error hover:bg-error-container/40 rounded-lg border border-error/30 transition-colors shadow-2xs"
          title="Remove from Saved Bookmarks"
        >
          <span class="material-symbols-outlined text-base">bookmark_remove</span>
          <span>Remove Bookmark</span>
        </button>
      </div>

      <!-- Passage & Diagram -->
      ${passageHtml}
      ${imageHtml}

      <!-- Question Prompt -->
      <div class="text-headline-sm font-headline-sm font-bold text-on-surface leading-snug mb-3">
        ${escapeHtml(item.question_text || '')}
      </div>

      <!-- Options -->
      ${optionsHtml}

      <!-- Solution Rationale Box -->
      <div class="mt-4 bg-surface-container-low border border-primary/20 rounded-xl p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-outline-variant/20">
          <div class="flex items-center gap-2 text-primary font-bold text-label-md font-label-md">
            <span class="material-symbols-outlined text-lg" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
            <span>SOLUTION RATIONALE</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-label-sm font-label-sm font-bold border border-secondary/30">
            Correct Response (Key: ${correctAnswerKey || 'Verified'})
          </span>
        </div>
        <div class="text-body-md font-body-md text-on-surface leading-relaxed whitespace-pre-line">
          ${escapeHtml(explanation)}
        </div>
      </div>
    </article>
  `;
}

export async function renderBookmarksPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate' };
  appEl.innerHTML = '<div class="flex h-screen items-center justify-center text-sm font-semibold text-primary">Loading bookmarks…</div>';

  try {
    const [rawBookmarks, workspace] = await Promise.all([
      api.getBookmarks(),
      getWorkspaceData(api),
    ]);

    let bookmarks = Array.isArray(rawBookmarks) ? rawBookmarks : [];
    let currentBookmarkIndex = 0;

    function renderList() {
      const listEl = appEl.querySelector('#bookmark-list');
      const countEl = appEl.querySelector('#bookmark-total-count');
      if (countEl) countEl.textContent = `${bookmarks.length} Saved Question${bookmarks.length === 1 ? '' : 's'}`;

      if (!bookmarks.length) {
        listEl.innerHTML = `
          <div class="rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest p-12 text-center max-w-lg mx-auto">
            <div class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mx-auto mb-4">
              <span class="material-symbols-outlined text-3xl">bookmark_border</span>
            </div>
            <h3 class="text-headline-sm font-bold text-on-surface mb-2">No Bookmarked Questions Yet</h3>
            <p class="text-body-sm text-on-surface-variant mb-6 leading-relaxed">
              Questions you save during practice drills or mock exams will appear here with solutions and diagrams.
            </p>
            <button
              id="empty-go-practice-btn"
              type="button"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-semibold text-label-md rounded-xl transition-all shadow-sm"
            >
              <span class="material-symbols-outlined text-lg">bolt</span>
              <span>Start Quick Practice Drill</span>
            </button>
          </div>
        `;

        const goPracticeBtn = listEl.querySelector('#empty-go-practice-btn');
        if (goPracticeBtn) {
          goPracticeBtn.addEventListener('click', () => navigate('/practice'));
        }
        return;
      }

      currentBookmarkIndex = Math.min(currentBookmarkIndex, bookmarks.length - 1);
      const currentBookmark = bookmarks[currentBookmarkIndex];
      listEl.innerHTML = `
        <div class="space-y-4">
          ${renderBookmarkItem(currentBookmark, currentBookmarkIndex + 1)}
          <nav class="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3" aria-label="Saved question navigation">
            <button id="bookmark-prev-btn" type="button" ${currentBookmarkIndex === 0 ? 'disabled' : ''} class="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40">
              Previous
            </button>
            <span class="text-sm font-semibold text-on-surface-variant">Question ${currentBookmarkIndex + 1} of ${bookmarks.length}</span>
            <button id="bookmark-next-btn" type="button" ${currentBookmarkIndex === bookmarks.length - 1 ? 'disabled' : ''} class="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40">
              Next
            </button>
          </nav>
        </div>
      `;

      bindCardActions();
    }

    function bindCardActions() {
      appEl.querySelector('#bookmark-prev-btn')?.addEventListener('click', () => {
        currentBookmarkIndex -= 1;
        renderList();
      });
      appEl.querySelector('#bookmark-next-btn')?.addEventListener('click', () => {
        currentBookmarkIndex += 1;
        renderList();
      });

      // Zoom modal triggers
      appEl.querySelectorAll('.zoom-trigger-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const src = btn.getAttribute('data-zoom-img');
          const modal = document.createElement('div');
          modal.className =
            'fixed inset-0 z-50 bg-inverse-surface/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in';
          modal.innerHTML = `
            <div class="bg-surface-container-lowest rounded-2xl max-w-4xl w-full p-4 shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh]">
              <div class="flex items-center justify-between pb-3 mb-2 border-b border-outline-variant/20">
                <span class="text-label-md font-bold text-on-surface flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary">image</span>
                  <span>Stimulus Figure (High-Resolution View)</span>
                </span>
                <button type="button" class="close-zoom-btn text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container">
                  <span class="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div class="flex-1 overflow-auto flex items-center justify-center p-2 bg-surface-container-low rounded-xl">
                <img src="${src}" alt="Enlarged Diagram" class="max-h-[75vh] w-auto max-w-full object-contain rounded" />
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          const closeModal = () => modal.remove();
          modal.querySelector('.close-zoom-btn').addEventListener('click', closeModal);
          modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
          });
        });
      });

      // Remove bookmark action (optimistic)
      appEl.querySelectorAll('[data-remove-bookmark]').forEach((button) => {
        button.addEventListener('click', () => {
          const sid = button.dataset.sessionId;
          const qidx = Number(button.dataset.questionIndex);
          const card = appEl.querySelector(`#bookmark-card-${sid}-${qidx}`);

          // Optimistically animate out card
          if (card) {
            card.style.transition = 'all 200ms ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.98)';
          }

          // Remove from local memory
          const itemIndex = bookmarks.findIndex(
            (b) => b.session_id === sid && b.question_index === qidx
          );
          let removedItem = null;
          if (itemIndex >= 0) {
            removedItem = bookmarks.splice(itemIndex, 1)[0];
            if (itemIndex < currentBookmarkIndex) currentBookmarkIndex -= 1;
            currentBookmarkIndex = Math.max(0, Math.min(currentBookmarkIndex, bookmarks.length - 1));
          }

          showToast('Question removed from Bookmarks', { icon: 'bookmark_remove' });

          setTimeout(() => {
            renderList();
          }, 200);

          // Background API sync
          api.setBookmark(sid, qidx, false).catch((err) => {
            console.error('Failed to remove bookmark:', err);
            // Revert
            if (removedItem) {
              bookmarks.splice(itemIndex, 0, removedItem);
              renderList();
              showToast('Failed to remove bookmark. Restored.', { icon: 'error', type: 'error' });
            }
          });
        });
      });
    }

    const content = `
      <div class="mx-auto max-w-4xl py-6 px-4 sm:px-6">
        <!-- Header -->
        <div class="mb-6 pb-4 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-display-lg-mobile sm:text-headline-lg font-headline-lg font-extrabold tracking-tight text-on-surface">
              Saved Bookmarks
            </h1>
            <p class="mt-1 text-body-sm font-body-sm text-on-surface-variant">
              Full independent review cards with reference diagrams, multiple choice keys, and solution rationales.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span id="bookmark-total-count" class="px-3 py-1 bg-primary/10 text-primary font-bold rounded-full text-label-md font-label-md">
              ${bookmarks.length} Saved Question${bookmarks.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <!-- Bookmarks List -->
        <div id="bookmark-list"></div>
      </div>
    `;

    appEl.innerHTML = renderWorkspaceLayout({
      user,
      streak: workspace.streak,
      activePath: '/bookmarks',
      content,
    });
    bindWorkspaceLayout(appEl, { auth, navigate });

    renderList();
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    appEl.innerHTML = `<div class="p-8 text-sm text-error">Could not load bookmarks: ${escapeHtml(error.message)}</div>`;
  }

  return () => {};
}
