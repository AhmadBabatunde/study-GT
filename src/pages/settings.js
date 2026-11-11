import { api } from '../api.js';
import { auth } from '../auth.js';
import { bindWorkspaceLayout, getWorkspaceData, renderWorkspaceLayout } from '../components/workspaceLayout.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export async function renderSettingsPage(appEl, { navigate }) {
  const user = auth.getUser() || { name: 'Candidate', email: '' };
  appEl.innerHTML = '<div class="flex h-screen items-center justify-center text-sm font-semibold text-primary">Loading settings…</div>';
  try {
    const workspace = await getWorkspaceData(api);
    const content = `
      <div class="mx-auto max-w-3xl">
        <header class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Settings</h1>
          <p class="mt-1 text-sm text-on-surface-variant">Manage the profile information shown in your Study GT workspace.</p>
        </header>
        <form id="profile-settings-form" class="rounded-xl border border-outline-variant/40 bg-white p-5 shadow-sm sm:p-6">
          <h2 class="text-lg font-bold text-on-surface">Candidate profile</h2>
          <label for="profile-name" class="mt-5 block text-sm font-semibold text-on-surface">Display name</label>
          <input id="profile-name" name="name" required minlength="1" maxlength="100" value="${escapeHtml(user.name)}" class="mt-2 w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          <label for="profile-email" class="mt-4 block text-sm font-semibold text-on-surface">Google account email</label>
          <input id="profile-email" type="email" readonly value="${escapeHtml(user.email)}" class="mt-2 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant" />
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <button id="save-profile-btn" type="submit" class="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-container">Save changes</button>
            <p id="profile-save-status" role="status" class="text-sm text-on-surface-variant"></p>
          </div>
        </form>
        <section class="mt-5 rounded-xl border border-outline-variant/40 bg-white p-5 shadow-sm">
          <h2 class="font-bold text-on-surface">Account and privacy</h2>
          <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">Your email address is provided by Google Sign-In and cannot be changed here. Sign out from the profile controls to end this session.</p>
        </section>
      </div>
    `;
    appEl.innerHTML = renderWorkspaceLayout({ user, streak: workspace.streak, activePath: '/settings', content });
    bindWorkspaceLayout(appEl, { auth, navigate });
    appEl.querySelector('#profile-settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = appEl.querySelector('#profile-name');
      const button = appEl.querySelector('#save-profile-btn');
      const status = appEl.querySelector('#profile-save-status');
      const name = input.value.trim();
      if (!name) {
        status.textContent = 'Enter a display name.';
        status.className = 'text-sm text-error';
        input.focus();
        return;
      }
      button.disabled = true;
      status.textContent = 'Saving…';
      status.className = 'text-sm text-on-surface-variant';
      try {
        const updatedUser = await api.updateProfile(name);
        auth.notify();
        const sidebarName = appEl.querySelector('.workspace-profile-copy > div');
        if (sidebarName) sidebarName.textContent = updatedUser.name;
        status.textContent = 'Profile updated.';
        status.className = 'text-sm font-semibold text-secondary';
        input.value = updatedUser.name;
      } catch (error) {
        console.error('Failed to update profile:', error);
        status.textContent = `Could not save: ${error.message}`;
        status.className = 'text-sm text-error';
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    appEl.innerHTML = `<div class="p-8 text-sm text-error">Could not load settings: ${escapeHtml(error.message)}</div>`;
  }
  return () => {};
}
