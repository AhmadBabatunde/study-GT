/**
 * Question Card Component for Study GT.
 * Displays question details and answer feedback for study sessions.
 *
 * Practice mode:
 *  - No option pre-selected / highlighted on initial render
 *  - Interactive single-selection
 *  - "Submit Answer & View Solution" button appears once an option is chosen
 *  - After submit: correct answer highlighted green, incorrect selected answer highlighted red
 *  - Solution Rationale revealed only after submit with dynamic badge:
 *      Correct -> "Correct answer [key]"
 *      Wrong   -> "Wrong answer, correct answer is [key]"
 *
 * Exam mode:
 *  - No explanation shown, immediate radio selection highlight
 *
 * Results mode:
 *  - Read-only review with explanations and badges
 */

import { getFullImageUrl } from '../api.js';

export function renderQuestionCard({
  question,
  currentIndex,
  totalQuestions,
  onSelectOption = null,
  showExplanation = false,
  readOnly = false,
  practiceMode = false,
  userName = 'Candidate',
}) {
  let localSelected = question.selected_answer || null;
  let submitted = practiceMode ? Boolean(question.selected_answer) : false;

  const container = document.createElement('div');
  container.className = 'w-full flex flex-col gap-6';

  const resolvedImageUrl = getFullImageUrl(question.image_url);

  let optionsList = question.options || [];
  if (typeof optionsList === 'string') {
    try {
      optionsList = JSON.parse(optionsList);
    } catch {
      optionsList = [];
    }
  }

  // 1. Question Meta Header Tags
  const difficultyTag = question.difficulty
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-low text-tertiary text-label-sm font-label-sm border border-outline-variant/30">
        <span class="w-1.5 h-1.5 rounded-full ${question.difficulty.toLowerCase() === 'easy' ? 'bg-secondary' : question.difficulty.toLowerCase() === 'hard' ? 'bg-error' : 'bg-amber-500'}"></span>
        ${question.difficulty}
      </span>`
    : '';

  const topicTag = question.question_type || question.category
    ? `<span class="inline-flex items-center px-2.5 py-1 rounded bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant/30">
        ${question.question_type || question.category}
      </span>`
    : '';

  const modeBadge = practiceMode
    ? `<div class="flex items-center gap-1 text-label-sm font-label-sm text-outline">
        <span class="material-symbols-outlined text-sm">hourglass_bottom</span>
        <span>Untimed Learning Mode</span>
      </div>`
    : question.is_ai_generated
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm font-semibold bg-tertiary-container/20 text-tertiary">
        <span class="material-symbols-outlined text-xs">neurology</span> AI Generated
      </span>`
    : question.employer
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-label-sm font-semibold bg-secondary-container/30 text-secondary">
        <span class="material-symbols-outlined text-xs">verified</span> ${question.employer}
      </span>`
    : '';

  // 2. Reading Passage (if present)
  const passageHtml = question.passage
    ? `
      <div class="bg-surface-container-low border border-outline-variant/50 rounded-xl p-5 mb-2">
        <div class="flex items-center gap-2 mb-2 text-label-sm font-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
          <span class="material-symbols-outlined text-sm">article</span>
          <span>Reference Passage</span>
        </div>
        <div class="passage-scroll max-h-56 overflow-y-auto text-body-md font-body-md text-on-surface leading-relaxed whitespace-pre-line pr-2 font-normal">
          ${question.passage}
        </div>
      </div>
    `
    : '';

  // 3. Question Diagram / Image from Backblaze B2
  let imageHtml = '';
  if (resolvedImageUrl) {
    imageHtml = `
      <div class="my-2 bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 sm:p-4 text-center">
        <div class="flex items-center justify-between mb-2 px-1 text-label-sm font-label-sm text-on-surface-variant font-medium">
          <span class="flex items-center gap-1.5 font-bold text-primary">
            <span class="material-symbols-outlined text-base">image</span>
            <span>Reference Diagram / Stimulus Data Table</span>
          </span>
          <button type="button" class="zoom-btn inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-container px-2 py-0.5 rounded hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-sm">zoom_in</span>
            <span>Enlarge Figure</span>
          </button>
        </div>
        <div class="question-image-frame relative bg-white rounded-lg p-2.5 sm:p-4 flex items-center justify-center border border-outline-variant/30 overflow-hidden group">
          <img
            src="${resolvedImageUrl}"
            alt="Question Diagram ${currentIndex}"
            class="question-diagram-img max-h-72 sm:max-h-96 w-auto max-w-full object-contain rounded cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
          />
        </div>
      </div>
    `;
  }

  // Question Prompt text
  const promptText = question.question_text || question.question || '';

  container.innerHTML = `
    <!-- Question Meta Header Tags -->
    <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-outline-variant/30">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-lg text-label-lg px-3 py-1 bg-surface-container-low text-primary font-bold rounded-md">
          Question ${currentIndex}
        </span>
        ${difficultyTag}
        ${topicTag}
      </div>
      <div>${modeBadge}</div>
    </div>

    ${passageHtml}
    ${imageHtml}

    <!-- Question Prompt Text -->
    <div class="text-headline-md font-headline-md text-on-surface leading-snug">
      ${promptText}
    </div>

    <!-- Options List -->
    <div class="options-cluster flex flex-col gap-3.5 my-2"></div>

    <!-- Practice Mode Submit Button Row -->
    ${practiceMode ? `<div class="submit-row pt-2"></div>` : ''}

    <!-- Feedback / Solution Rationale Container -->
    <div class="feedback-box"></div>
  `;

  const optionsCluster = container.querySelector('.options-cluster');
  const submitRow = practiceMode ? container.querySelector('.submit-row') : null;
  const feedbackBox = container.querySelector('.feedback-box');

  function paintOptions() {
    const revealAnswers = (submitted && practiceMode) || (showExplanation && !practiceMode);

    optionsCluster.innerHTML = optionsList.map((opt) => {
      const key = opt.key;
      const text = opt.text;
      const isSel = localSelected === key;

      let cardClass = 'border border-outline-variant/50 hover:border-outline bg-surface-container-lowest';
      let badgeClass = 'bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high';
      let textClass = 'text-on-surface font-medium';
      let radioClass = 'border border-outline-variant flex items-center justify-center text-transparent';
      let radioInner = '<span class="w-2.5 h-2.5 rounded-full bg-transparent"></span>';

      // Pre-submit / interactive selection state
      if (isSel && !revealAnswers) {
        cardClass = 'border-2 border-primary-container bg-surface-container-low shadow-sm';
        badgeClass = 'bg-primary-container text-on-primary shadow-xs';
        textClass = 'text-primary font-semibold';
        radioClass = 'border-2 border-primary-container flex items-center justify-center bg-surface-container-lowest';
        radioInner = '<span class="w-2.5 h-2.5 rounded-full bg-primary-container"></span>';
      }

      // Post-submit / results feedback reveal
      if (revealAnswers) {
        const isCorrectKey = question.correct_answer === key;
        if (isCorrectKey) {
          cardClass = 'border-2 border-secondary bg-secondary-container/20 shadow-sm';
          badgeClass = 'bg-secondary text-on-secondary shadow-xs';
          textClass = 'text-secondary font-semibold';
          radioClass = 'border-2 border-secondary bg-secondary text-white flex items-center justify-center';
          radioInner = '<span class="material-symbols-outlined text-xs font-bold leading-none">check</span>';
        } else if (isSel && !isCorrectKey) {
          cardClass = 'border-2 border-error bg-error-container/20 shadow-sm';
          badgeClass = 'bg-error text-on-error shadow-xs';
          textClass = 'text-error font-semibold';
          radioClass = 'border-2 border-error bg-error text-white flex items-center justify-center';
          radioInner = '<span class="material-symbols-outlined text-xs font-bold leading-none">close</span>';
        } else {
          cardClass = 'border border-outline-variant/30 bg-surface-container-lowest opacity-75';
          badgeClass = 'bg-surface-container text-outline';
          textClass = 'text-on-surface-variant';
        }
      }

      const isLocked = readOnly || (practiceMode && submitted);

      return `
        <label
          data-key="${key}"
          class="option-item flex items-center p-3.5 rounded-lg ${cardClass} ${isLocked ? 'cursor-default' : 'cursor-pointer'} transition-all duration-150 group"
        >
          <div class="w-9 h-9 rounded-md ${badgeClass} flex items-center justify-center font-bold text-label-lg mr-4 transition-colors shrink-0">
            ${key}
          </div>
          <span class="flex-1 text-body-md font-body-md ${textClass} leading-snug">
            ${text}
          </span>
          <span class="w-5 h-5 rounded-full shrink-0 ml-3 ${radioClass}">
            ${radioInner}
          </span>
        </label>
      `;
    }).join('');

    if (!readOnly && !(practiceMode && submitted)) {
      optionsCluster.querySelectorAll('.option-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const key = item.getAttribute('data-key');
          localSelected = key;
          paintOptions();
          paintSubmitRow();
          if (typeof onSelectOption === 'function') {
            onSelectOption(key);
          }
        });
      });
    }
  }

  function paintSubmitRow() {
    if (!submitRow) return;

    if (submitted || !localSelected) {
      submitRow.innerHTML = '';
      return;
    }

    submitRow.innerHTML = `
      <div class="flex items-center justify-end pt-2">
        <button
          type="button"
          class="submit-solution-btn inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-label-lg font-label-lg font-semibold transition-all duration-200 shadow-sm"
        >
          <span class="material-symbols-outlined text-lg">check_circle</span>
          <span>Submit Answer &amp; View Solution</span>
        </button>
      </div>
    `;

    submitRow.querySelector('.submit-solution-btn').addEventListener('click', () => {
      submitted = true;
      question.selected_answer = localSelected;
      paintOptions();
      paintSubmitRow();
      paintFeedback();
    });
  }

  function paintFeedback() {
    const show = (practiceMode && submitted) || (showExplanation && !practiceMode);
    if (!show || !question.explanation) {
      feedbackBox.innerHTML = '';
      return;
    }

    const correctKey = question.correct_answer;
    const isCorrect = localSelected === correctKey;

    let statusText = '';
    let badgeColorClass = '';
    let bannerTitle = '';
    let bannerIcon = '';
    let bannerIconBg = '';
    let bannerBorder = '';

    if (!localSelected) {
      // Unanswered review mode
      statusText = `Correct answer is ${correctKey}`;
      badgeColorClass = 'bg-surface-container text-on-surface-variant';
      bannerTitle = `Unanswered • Correct answer is ${correctKey}`;
      bannerIcon = 'help_outline';
      bannerIconBg = 'bg-surface-container text-on-surface-variant';
      bannerBorder = 'border-outline-variant/50';
    } else if (isCorrect) {
      statusText = `Correct answer ${correctKey}`;
      badgeColorClass = 'bg-secondary-container text-on-secondary-container';
      bannerTitle = `Correct! Well done${userName ? `, ${userName}` : ''}.`;
      bannerIcon = 'check';
      bannerIconBg = 'bg-secondary-container text-secondary';
      bannerBorder = 'border-secondary/40';
    } else {
      statusText = `Wrong answer, correct answer is ${correctKey}`;
      badgeColorClass = 'bg-error-container text-on-error-container';
      bannerTitle = `Incorrect Response. Correct answer is ${correctKey}.`;
      bannerIcon = 'close';
      bannerIconBg = 'bg-error-container text-error';
      bannerBorder = 'border-error/40';
    }

    feedbackBox.innerHTML = `
      <div class="mt-4 bg-surface-container-lowest border-2 ${bannerBorder} rounded-xl p-6 md:p-8 shadow-sm transition-all duration-300">
        <!-- Status Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-outline-variant/20 gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${bannerIconBg} flex items-center justify-center shadow-xs shrink-0">
              <span class="material-symbols-outlined text-2xl font-bold">${bannerIcon}</span>
            </div>
            <div>
              <h3 class="text-headline-sm font-headline-sm ${isCorrect ? 'text-secondary' : 'text-error'} font-bold">
                ${bannerTitle}
              </h3>
              <p class="text-label-sm font-label-sm text-on-surface-variant">
                ${localSelected ? `You selected Option ${localSelected}.` : 'No option was selected.'}
              </p>
            </div>
          </div>
          <div>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${badgeColorClass}">
              ${statusText}
            </span>
          </div>
        </div>

        <!-- Detailed Step-by-Step Explanation -->
        <div class="space-y-4">
          <h4 class="text-label-lg font-label-lg text-on-surface font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-base">lightbulb</span>
            <span>Solution Rationale &amp; Step-by-Step Breakdown</span>
          </h4>

          <div class="p-4 rounded-lg bg-surface-container-low border border-outline-variant/30 text-body-md font-body-md text-on-surface leading-relaxed whitespace-pre-line">
            ${question.explanation}
          </div>

          <!-- Nigerian Exam Pro-Tip Card -->
          <div class="bg-surface-container-low border border-primary/20 p-4 rounded-lg flex items-start gap-3 mt-4">
            <span class="material-symbols-outlined text-primary text-xl shrink-0">verified</span>
            <div>
              <span class="text-label-md font-label-md font-bold text-primary block">
                Study tip:
              </span>
              <p class="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
                Check the question carefully, verify your reasoning, and use the explanation to review the solution.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  paintOptions();
  paintSubmitRow();
  paintFeedback();

  // Zoom modal for image diagrams
  if (resolvedImageUrl) {
    const zoomTrigger = container.querySelector('.zoom-btn');
    const imgEl = container.querySelector('.question-diagram-img');
    if (imgEl) {
      imgEl.addEventListener('error', () => {
        const frame = imgEl.closest('.question-image-frame');
        if (frame) {
          frame.innerHTML = `
            <div class="flex min-h-20 items-center justify-center gap-2 text-label-sm text-on-surface-variant" role="status">
              <span class="material-symbols-outlined text-outline" aria-hidden="true">broken_image</span>
              <span>This question image could not be loaded.</span>
            </div>
          `;
        }
        if (zoomTrigger) zoomTrigger.hidden = true;
      }, { once: true });
    }

    const openModal = () => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-50 bg-inverse-surface/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fade-in';
      modal.innerHTML = `
        <div class="relative bg-white rounded-2xl max-w-5xl max-h-[90vh] w-full p-4 sm:p-6 flex flex-col items-center justify-center shadow-2xl">
          <div class="w-full flex items-center justify-between pb-3 mb-2 border-b border-outline-variant/30 text-label-lg font-bold text-on-surface">
            <span>Reference Diagram • Question ${currentIndex}</span>
            <button class="close-modal-btn p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-error transition-colors">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <div class="overflow-auto max-h-[75vh] w-full flex items-center justify-center p-2">
            <img src="${resolvedImageUrl}" alt="Enlarged Diagram" class="max-w-full max-h-full object-contain rounded" />
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const closeModal = () => modal.remove();
      modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    };

    if (zoomTrigger) zoomTrigger.addEventListener('click', openModal);
    if (imgEl) imgEl.addEventListener('click', openModal);
  }

  return container;
}
