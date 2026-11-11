/**
 * Shared Workspace Layout Component for Study GT.
 * Faithfully implements the Google Stitch mockups and DESIGN.md design system.
 *
 * Header:
 *  - Official logo image with well-placed Study GT text
 *  - No search, no notifications, no upgrade pro
 *  - ONLY the streak flame indicator on the right
 *
 * Sidebar Bottom-Left:
 *  - Profile photo/avatar + candidate name
 *  - Clickable popover menu showing: Bookmarks, Settings, Sign Out
 */

const navigationItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { label: 'Practice Questions', icon: 'quiz', path: '/practice' },
  { label: 'Mock Exams', icon: 'assignment', path: '/mocks' },
  { label: 'Employer Prep', icon: 'domain', path: '/employer-prep' },
  { label: 'Performance Analytics', icon: 'insights', path: '/analytics' },
  { label: 'Community Feedback', icon: 'forum', path: '/feedback' },
];

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

let studyStreak = null;
let studyStreakUnavailable = false;
let studyStreakRequest = null;
let profileOutsideClickListenerInstalled = false;

function closeProfilePopupOnOutsideClick(event) {
  const popup = document.getElementById('profile-popup-menu');
  const trigger = document.getElementById('profile-trigger-btn');
  if (popup && trigger && !popup.contains(event.target) && !trigger.contains(event.target)) {
    popup.classList.add('hidden');
  }

  const mobileMenus = [
    document.getElementById('mobile-profile-menu'),
    document.getElementById('mobile-more-menu'),
  ].filter(Boolean);
  const mobileTriggers = [
    document.getElementById('mobile-profile-trigger'),
    document.getElementById('mobile-more-trigger'),
  ].filter(Boolean);
  if (!mobileMenus.some((menu) => menu.contains(event.target))
      && !mobileTriggers.some((mobileTrigger) => mobileTrigger.contains(event.target))) {
    mobileMenus.forEach((menu) => menu.classList.add('hidden'));
    mobileTriggers.forEach((mobileTrigger) => mobileTrigger.setAttribute('aria-expanded', 'false'));
  }
}

function updateStudyStreakElements() {
  const count = Number.isInteger(studyStreak?.current_streak) && studyStreak.current_streak >= 0
    ? studyStreak.current_streak
    : null;
  const label = count === null ? (studyStreakUnavailable ? '—' : '…') : `${count} Days`;
  const activityLabel = studyStreakUnavailable
    ? 'Activity unavailable'
    : studyStreak?.studied_today
      ? 'Studied today'
      : studyStreak
        ? 'Study today to keep it going'
        : 'Checking today’s activity…';

  document.querySelectorAll('[data-study-streak-count]').forEach((element) => {
    element.textContent = label;
  });
  document.querySelectorAll('[data-study-streak-title]').forEach((element) => {
    element.title = count === null ? 'Study streak unavailable' : `${count} Day Study Streak`;
  });
  document.querySelectorAll('[data-study-streak-status]').forEach((element) => {
    element.textContent = activityLabel;
  });
}

function loadStudyStreak(api) {
  if (!studyStreakRequest) {
    studyStreakRequest = api.getStudyStreak()
      .then((streak) => {
        studyStreak = streak;
        studyStreakUnavailable = false;
        updateStudyStreakElements();
      })
      .catch((error) => {
        console.error('Failed to load study streak:', error);
        studyStreakUnavailable = true;
        updateStudyStreakElements();
      })
      .finally(() => {
        studyStreakRequest = null;
      });
  }
  return studyStreakRequest;
}

export function getWorkspaceData(api) {
  const workspaceData = { streak: studyStreak };
  loadStudyStreak(api).then(() => {
    workspaceData.streak = studyStreak;
  });
  return workspaceData;
}

export async function getWorkspaceDataAsync(api) {
  await loadStudyStreak(api);
  return { streak: studyStreak };
}

export function renderWorkspaceLayout({ user, streak, activePath, content }) {
  const collapsed = localStorage.getItem('study_gt_sidebar_collapsed') === 'true';
  const fullName = escapeHtml(user.name || 'Candidate');
  const firstName = escapeHtml((user.name || 'Candidate').trim().split(/\s+/)[0]);
  const initial = firstName.slice(0, 1).toUpperCase();
  const streakCount = Number.isInteger(streak?.current_streak) && streak.current_streak >= 0
    ? `${streak.current_streak} Days`
    : studyStreakUnavailable ? '—' : '…';
  const streakActivity = studyStreakUnavailable
    ? 'Activity unavailable'
    : streak?.studied_today
      ? 'Studied today'
      : streak
        ? 'Study today to keep it going'
        : 'Checking today’s activity…';

  const sideNavMarkup = navigationItems
    .map((item) => {
      const isActive = item.path === activePath || (item.path === '/practice' && activePath.startsWith('/practice'));
      return `
        <a
          href="#${item.path}"
          title="${item.label}"
          aria-label="${item.label}"
          ${isActive ? 'aria-current="page"' : ''}
          class="workspace-nav-link ${collapsed ? 'workspace-nav-collapsed' : ''} ${
        isActive ? 'workspace-nav-active' : ''
      }"
        >
          <span class="material-symbols-outlined text-xl" ${isActive ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${item.icon}</span>
          <span class="workspace-nav-label">${item.label}</span>
        </a>
      `;
    })
    .join('');

  return `
    <div class="workspace-shell">
      <!-- Clean Top Header: Official Logo + Brand on left, ONLY streak symbol on right -->
      <header class="bg-surface-container-lowest border-b border-outline-variant/30 shadow-xs sticky top-0 z-40">
        <div class="flex justify-between items-center w-full px-6 py-3 max-w-7xl mx-auto">
          <!-- Logo & Brand Placement -->
          <a href="#/dashboard" class="flex items-center gap-3 group transition-transform active:scale-[0.99]">
            <img
              src="/study-gt-logo.png"
              alt="Study GT"
              class="h-8 w-8 object-contain rounded-lg shadow-xs ring-1 ring-outline-variant/20 group-hover:ring-primary/40 transition-all"
            />
            <span class="text-headline-md font-headline-md font-extrabold text-primary tracking-tight">
              Study GT
            </span>
          </a>

          <!-- Trailing: ONLY the Streak Indicator -->
          <div class="flex items-center">
            <div
              data-study-streak-title
              class="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-outline-variant/30 text-amber-600 font-label-md text-label-md cursor-pointer hover:bg-surface-container transition-colors shadow-2xs"
              title="${Number.isInteger(streak?.current_streak) ? `${streak.current_streak} Day Study Streak` : 'Study streak loading'}"
            >
              <span class="material-symbols-outlined text-base text-amber-500" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
              <span class="font-bold text-on-surface" data-study-streak-count>${streakCount}</span>
              <span class="sr-only" data-study-streak-status>${streakActivity}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- App Body Layout with Left SideNav + Main Scroll Area -->
      <div class="workspace-body flex flex-1 w-full max-w-7xl mx-auto relative">
        <!-- SideNavBar -->
        <aside id="workspace-sidebar" class="workspace-sidebar ${collapsed ? 'workspace-sidebar-collapsed' : ''}">
          <div class="min-h-0 flex-1 flex flex-col overflow-hidden">
            <!-- Primary CTA -->
            <div class="mb-3 px-1 shrink-0">
              <button
                id="workspace-quick-drill"
                type="button"
                title="Start Quick Drill"
                class="w-full flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-on-primary py-2.5 px-4 rounded-lg text-label-md font-label-md font-semibold shadow-sm transition-all duration-150 ${
                  collapsed ? 'workspace-nav-collapsed' : ''
                }"
              >
                <span class="material-symbols-outlined text-base">bolt</span>
                <span class="workspace-nav-label">Start Quick Drill</span>
              </button>
            </div>

            <!-- SideNav Links (Scrollable) -->
            <nav aria-label="Main navigation" class="flex-1 overflow-y-auto passage-scroll space-y-1 pr-1">
              ${sideNavMarkup}
            </nav>
          </div>

          <!-- Bottom-Left Profile Menu (Clickable Popup Trigger) -->
          <div class="relative pt-3 border-t border-outline-variant/30 shrink-0">
            <!-- Popup Menu for Profile -->
            <div
              id="profile-popup-menu"
              class="hidden absolute bottom-full left-0 mb-2 w-56 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-xl p-1.5 z-50 animate-fade-in"
            >
              <div class="px-3 py-2 border-b border-outline-variant/20 mb-1">
                <div class="text-label-md font-bold text-on-surface truncate">${fullName}</div>
                <div class="text-xs text-on-surface-variant truncate">${escapeHtml(user.email || 'candidate@studygt.ng')}</div>
              </div>
              <a
                href="#/bookmarks"
                class="profile-menu-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-label-md font-label-md text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
              >
                <span class="material-symbols-outlined text-lg text-on-surface-variant">bookmark</span>
                <span>Bookmarks</span>
              </a>
              <a
                href="#/settings"
                class="profile-menu-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-label-md font-label-md text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
              >
                <span class="material-symbols-outlined text-lg text-on-surface-variant">settings</span>
                <span>Settings</span>
              </a>
              <a
                href="#/support"
                class="profile-menu-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-label-md font-label-md text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors"
              >
                <span class="material-symbols-outlined text-lg text-on-surface-variant">help_outline</span>
                <span>Support</span>
              </a>
              <button
                id="popup-logout-btn"
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-label-md font-label-md text-error hover:bg-error-container/40 transition-colors text-left"
              >
                <span class="material-symbols-outlined text-lg text-error">logout</span>
                <span>Log Out</span>
              </button>
            </div>

            <!-- Clickable Profile Trigger Pill -->
            <button
              id="profile-trigger-btn"
              type="button"
              class="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-all text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                collapsed ? 'justify-center p-1' : ''
              }"
              title="Account Menu (Bookmarks, Settings, Logout)"
            >
              <div class="relative shrink-0">
                ${
                  user.picture_url
                    ? `<img src="${escapeHtml(user.picture_url)}" alt="${fullName}" class="w-9 h-9 rounded-full ring-2 ring-primary/20 object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="w-9 h-9 rounded-full bg-primary-container text-on-primary hidden items-center justify-center font-bold text-sm shadow-xs">${initial}</div>`
                    : `<div class="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-primary/20">${initial}</div>`
                }
                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-surface-container-lowest"></span>
              </div>
              <div class="workspace-sidebar-label min-w-0 flex-1 ${collapsed ? 'hidden' : ''}">
                <div class="truncate text-label-md font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                  ${fullName}
                </div>
                <div class="truncate text-label-sm text-on-surface-variant">
                  Candidate Settings
                </div>
              </div>
              <span class="material-symbols-outlined text-lg text-on-surface-variant group-hover:text-primary transition-colors ${collapsed ? 'hidden' : ''}">
                unfold_more
              </span>
            </button>
          </div>
        </aside>

        <!-- Sidebar Collapse Toggle Button -->
        <button
          id="workspace-collapse-btn"
          type="button"
          aria-label="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
          title="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
          class="workspace-collapse-btn"
        >
          <span id="workspace-collapse-icon" class="material-symbols-outlined">${collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>

        <!-- Main Content Area -->
        <main class="workspace-main flex-1 overflow-y-auto">${content}</main>
      </div>

      <!-- Mobile Bottom Navigation Bar -->
      <nav aria-label="Mobile navigation" class="workspace-mobile-nav">
        <a href="#/dashboard" aria-label="Dashboard" class="${activePath === '/dashboard' ? 'workspace-mobile-active' : ''}">
          <span class="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </a>
        <a href="#/practice" aria-label="Practice" class="${activePath.startsWith('/practice') ? 'workspace-mobile-active' : ''}">
          <span class="material-symbols-outlined">quiz</span>
          <span>Practice</span>
        </a>
        <a href="#/mocks" aria-label="Mock Exams" class="${activePath === '/mocks' ? 'workspace-mobile-active' : ''}">
          <span class="material-symbols-outlined">assignment</span>
          <span>Exams</span>
        </a>
        <button
          id="mobile-profile-trigger"
          type="button"
          aria-label="Candidate profile"
          aria-controls="mobile-profile-menu"
          aria-expanded="false"
          class="${activePath === '/settings' ? 'workspace-mobile-active' : ''}"
        >
          <span class="material-symbols-outlined">account_circle</span>
          <span>Profile</span>
        </button>
        <button
          id="mobile-more-trigger"
          type="button"
          aria-label="More navigation"
          aria-controls="mobile-more-menu"
          aria-expanded="false"
        >
          <span class="material-symbols-outlined">menu</span>
          <span>More</span>
        </button>
        <div id="mobile-profile-menu" class="workspace-mobile-menu hidden" role="menu">
          <div class="workspace-mobile-menu-heading">
            <span class="font-semibold">${fullName}</span>
            <span class="text-xs text-on-surface-variant">${escapeHtml(user.email || 'candidate@studygt.ng')}</span>
          </div>
          <a href="#/settings" role="menuitem">Candidate settings</a>
          <a href="#/bookmarks" role="menuitem">Bookmarks</a>
          <a href="#/support" role="menuitem">Support</a>
          <button id="mobile-logout-btn" type="button" role="menuitem">Log out</button>
        </div>
        <div id="mobile-more-menu" class="workspace-mobile-menu hidden" role="menu">
          <a href="#/employer-prep" role="menuitem">Employer Prep</a>
          <a href="#/analytics" role="menuitem">Performance Analytics</a>
          <a href="#/feedback" role="menuitem">Community Feedback</a>
        </div>
      </nav>
    </div>
  `;
}

export function bindWorkspaceLayout(appEl, { auth, navigate }) {
  const sidebar = appEl.querySelector('#workspace-sidebar');
  const collapseButton = appEl.querySelector('#workspace-collapse-btn');
  const collapseIcon = appEl.querySelector('#workspace-collapse-icon');

  if (studyStreak || studyStreakUnavailable) {
    updateStudyStreakElements();
  }

  if (sidebar && sidebar.classList.contains('workspace-sidebar-collapsed')) {
    appEl.querySelectorAll('.workspace-sidebar-label').forEach((item) => item.classList.add('hidden'));
  }

  if (collapseButton && sidebar) {
    collapseButton.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('workspace-sidebar-collapsed');
      appEl.querySelectorAll('.workspace-nav-link, #workspace-quick-drill').forEach((item) => {
        item.classList.toggle('workspace-nav-collapsed', collapsed);
      });
      appEl.querySelectorAll('.workspace-sidebar-label').forEach((item) => {
        item.classList.toggle('hidden', collapsed);
      });
      if (collapseIcon) {
        collapseIcon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
      }
      collapseButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      collapseButton.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
      localStorage.setItem('study_gt_sidebar_collapsed', String(collapsed));
    });
  }

  // Quick Drill
  const quickDrillBtn = appEl.querySelector('#workspace-quick-drill');
  if (quickDrillBtn) {
    quickDrillBtn.addEventListener('click', () => navigate('/practice'));
  }

  // Bottom-Left Profile Popover Menu
  const profileTrigger = appEl.querySelector('#profile-trigger-btn');
  const profilePopup = appEl.querySelector('#profile-popup-menu');
  const popupLogout = appEl.querySelector('#popup-logout-btn');

  if (profileTrigger && profilePopup) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profilePopup.classList.toggle('hidden');
    });

    if (!profileOutsideClickListenerInstalled) {
      document.addEventListener('click', closeProfilePopupOnOutsideClick);
      profileOutsideClickListenerInstalled = true;
    }

    profilePopup.querySelectorAll('.profile-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        profilePopup.classList.add('hidden');
      });
    });
  }

  if (popupLogout) {
    popupLogout.addEventListener('click', () => auth.logout());
  }

  const mobileProfileTrigger = appEl.querySelector('#mobile-profile-trigger');
  const mobileProfileMenu = appEl.querySelector('#mobile-profile-menu');
  const mobileMoreTrigger = appEl.querySelector('#mobile-more-trigger');
  const mobileMoreMenu = appEl.querySelector('#mobile-more-menu');
  const mobileLogout = appEl.querySelector('#mobile-logout-btn');
  const mobileMenus = [mobileProfileMenu, mobileMoreMenu].filter(Boolean);
  const mobileTriggers = [mobileProfileTrigger, mobileMoreTrigger].filter(Boolean);

  const closeMobileMenus = () => {
    mobileMenus.forEach((menu) => menu.classList.add('hidden'));
    mobileTriggers.forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
  };
  const toggleMobileMenu = (trigger, menu) => {
    const shouldOpen = menu.classList.contains('hidden');
    closeMobileMenus();
    if (shouldOpen) {
      menu.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
    }
  };

  if (mobileProfileTrigger && mobileProfileMenu) {
    mobileProfileTrigger.addEventListener('click', () => toggleMobileMenu(mobileProfileTrigger, mobileProfileMenu));
    mobileProfileMenu.querySelectorAll('a').forEach((item) => item.addEventListener('click', closeMobileMenus));
  }
  if (mobileMoreTrigger && mobileMoreMenu) {
    mobileMoreTrigger.addEventListener('click', () => toggleMobileMenu(mobileMoreTrigger, mobileMoreMenu));
    mobileMoreMenu.querySelectorAll('a').forEach((item) => item.addEventListener('click', closeMobileMenus));
  }
  if (mobileLogout) {
    mobileLogout.addEventListener('click', () => auth.logout());
  }
}
