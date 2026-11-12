const providerLogoFiles = new Map([
  ['access bank', 'access-bank.png'],
  ['access', 'access-bank.png'],
  ['cat', 'cat.png'],
  ['cat6', 'cat.png'],
  ['deloitte', 'deloitte.jpg'],
  ['diamond bank', 'diamond-bank.png'],
  ['dragnet', 'dragnet.png'],
  ['first bank', 'first-bank.png'],
  ['gt bank', 'gt-bank.png'],
  ['gtbank', 'gt-bank.png'],
  ['gtco', 'gt-bank.png'],
  ['kpmg', 'kpmg.png'],
  ['nnpc', 'nnpc.png'],
  ['pwc', 'pwc.png'],
  ['workforce', 'workforce.png'],
  ['zenith bank', 'zenith-bank.png'],
]);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export function getProviderLogoMarkup(name) {
  const file = providerLogoFiles.get(String(name || '').trim().toLowerCase());
  const initials = String(name || '').trim().slice(0, 2).toUpperCase();
  const fallback = `
    <span class="provider-logo-fallback hidden text-sm font-bold text-primary" aria-hidden="true">
      ${escapeHtml(initials)}
    </span>
  `;
  const logo = file
    ? `<img class="provider-logo-image h-full w-full rounded-full object-contain p-0.5" src="/provider-logos/${file}" alt="${escapeHtml(name)} logo" loading="eager" />`
    : fallback;

  return `
    <span class="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant/60 bg-white">
      ${logo}
      ${file ? fallback : ''}
    </span>
  `;
}

export function bindProviderLogoFallbacks(root) {
  root.querySelectorAll('.provider-logo-image').forEach((image) => {
    const showFallback = () => {
      image.classList.add('hidden');
      image.nextElementSibling?.classList.remove('hidden');
    };
    image.addEventListener('error', showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  });
}
