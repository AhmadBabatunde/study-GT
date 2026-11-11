/**
 * Precision Countdown Timer Component.
 * Formats time in HH:MM:SS with color transitions (Green -> Amber -> Pulsing Red).
 */

export class ExamTimer {
  constructor({ totalSeconds, initialRemainingSeconds = null, onTick = null, onTimeUp = null }) {
    this.totalSeconds = Math.max(1, totalSeconds);
    this.remainingSeconds = initialRemainingSeconds !== null ? initialRemainingSeconds : this.totalSeconds;
    this.onTick = onTick;
    this.onTimeUp = onTimeUp;
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.remainingSeconds -= 1;
      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.stop();
        if (typeof this.onTick === 'function') this.onTick(this.getState());
        if (typeof this.onTimeUp === 'function') this.onTimeUp();
      } else {
        if (typeof this.onTick === 'function') this.onTick(this.getState());
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  destroy() {
    this.stop();
  }

  formatTime(secs = this.remainingSeconds) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    const pad = (num) => String(num).padStart(2, '0');
    if (h > 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  getColorClass() {
    const ratio = this.remainingSeconds / this.totalSeconds;
    if (ratio <= 0.10) {
      return 'text-error animate-timer-urgency font-bold';
    }
    if (ratio <= 0.25) {
      return 'text-amber-600 font-semibold';
    }
    return 'text-on-surface font-semibold';
  }

  getState() {
    return {
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      formatted: this.formatTime(),
      colorClass: this.getColorClass(),
      ratio: this.remainingSeconds / this.totalSeconds,
    };
  }
}

