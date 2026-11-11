/**
 * Lightweight Toast Notification Component for Study GT.
 * Provides instant tactile feedback for actions like bookmarking, saving, and answering.
 */

let toastTimeout = null;

export function showToast(message, { icon = 'bookmark', duration = 2400, type = 'info' } = {}) {
  let container = document.getElementById('study-gt-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'study-gt-toast-container';
    container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const iconColor =
    type === 'error'
      ? 'text-error'
      : type === 'success'
      ? 'text-secondary'
      : 'text-amber-500';

  toast.className =
    'pointer-events-auto flex items-center gap-3 px-4 py-3 bg-surface-container-lowest text-on-surface rounded-xl shadow-xl border border-outline-variant/40 text-label-md font-label-md transform transition-all duration-200 translate-y-3 opacity-0';
  toast.innerHTML = `
    <span class="material-symbols-outlined ${iconColor} text-xl" style="font-variation-settings: 'FILL' 1;">${icon}</span>
    <span class="font-semibold text-on-surface">${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Animate out & remove
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, duration);
}

