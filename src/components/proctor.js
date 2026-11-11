/**
 * Exam Proctoring Module.
 * Monitors page visibility during mock assessments; fullscreen remains optional.
 * Records violations and enforces the 3-strike policy with an institutional warning overlay.
 */

export class ProctorManager {
  constructor({ sessionId, maxViolations = 3, onViolation = null, onDisqualified = null }) {
    this.sessionId = sessionId;
    this.maxViolations = maxViolations;
    this.violationsCount = 0;
    this.onViolation = onViolation;
    this.onDisqualified = onDisqualified;
    this.active = false;
    this.isHandlingExit = false;

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async start() {
    this.active = true;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  stop() {
    this.active = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.removeOverlay();
  }

  static async requestFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) return true;

      const root = document.documentElement;
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (!request) return false;

      await request.call(root);
      return true;
    } catch (err) {
      console.warn('Fullscreen request declined or failed:', err);
      return false;
    }
  }

  static async exitFullscreen() {
    try {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (!exit || (!document.fullscreenElement && !document.webkitFullscreenElement)) return false;

      await exit.call(document);
      return true;
    } catch (err) {
      console.warn('Could not exit fullscreen:', err);
      return false;
    }
  }

  handleVisibilityChange() {
    if (!this.active) return;
    if (document.hidden) {
      this.triggerViolation('tab_switch', 'You switched away from the examination window.');
    }
  }

  async triggerViolation(type, message) {
    if (this.isHandlingExit) return;
    this.isHandlingExit = true;

    this.violationsCount += 1;

    let apiResult = null;
    if (typeof this.onViolation === 'function') {
      try {
        apiResult = await this.onViolation(type, this.violationsCount);
      } catch (err) {
        console.error('Failed to notify backend of violation:', err);
      }
    }

    if (this.violationsCount >= this.maxViolations) {
      this.showDisqualifiedOverlay(message);
      if (typeof this.onDisqualified === 'function') {
        this.onDisqualified(this.violationsCount);
      }
    } else {
      this.showWarningOverlay(message);
    }
  }

  showWarningOverlay(message) {
    this.removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'proctor-violation-modal';
    overlay.className = 'proctor-overlay';
    overlay.innerHTML = `
      <div class="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-error text-center animate-fade-in">
        <div class="w-16 h-16 mx-auto rounded-full bg-error-container/80 text-error flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-3xl font-bold">warning</span>
        </div>
        <span class="inline-block px-3 py-1 bg-error-container text-on-error-container rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          Proctoring Violation ${this.violationsCount} of ${this.maxViolations}
        </span>
        <h3 class="text-xl sm:text-2xl font-bold text-on-surface mt-2 mb-2">
          Security Boundary Triggered
        </h3>
        <p class="text-sm text-on-surface-variant leading-relaxed mb-6">
          ${message}<br/>
          Reaching <strong>${this.maxViolations} violations</strong> will end your assessment.
        </p>
        <button id="proctor-resume-btn" class="w-full py-3 px-6 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-lg">play_arrow</span>
          <span>Continue Assessment</span>
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const resumeBtn = overlay.querySelector('#proctor-resume-btn');
    resumeBtn.addEventListener('click', () => {
      this.removeOverlay();
      this.isHandlingExit = false;
    });
  }

  showDisqualifiedOverlay(message) {
    this.removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'proctor-violation-modal';
    overlay.className = 'proctor-overlay';
    overlay.innerHTML = `
      <div class="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 sm:p-8 shadow-2xl border-2 border-error text-center">
        <div class="w-16 h-16 mx-auto rounded-full bg-error text-on-error flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-4xl">block</span>
        </div>
        <span class="inline-block px-3 py-1 bg-error/10 text-error rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          Assessment Terminated
        </span>
        <h3 class="text-2xl font-bold text-on-surface mt-2 mb-2">
          Maximum Violations Exceeded
        </h3>
        <p class="text-sm text-on-surface-variant leading-relaxed mb-6">
          You reached ${this.violationsCount} proctoring violations. Your session has been submitted according to the session rules.
        </p>
        <button id="proctor-view-results-btn" class="w-full py-3 px-6 bg-error hover:bg-on-error-container text-on-error font-semibold rounded-xl text-sm transition-all shadow-md">
          View score report
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#proctor-view-results-btn');
    btn.addEventListener('click', () => {
      this.stop();
      window.location.hash = `#/results/${this.sessionId}`;
    });
  }

  removeOverlay() {
    const existing = document.getElementById('proctor-violation-modal');
    if (existing) {
      existing.remove();
    }
  }
}
