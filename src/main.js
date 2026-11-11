/**
 * Study GT Application Entry Point.
 * Configures the SPA routing table and initializes the client application.
 */

import { router } from './router.js';
import { renderLoginPage } from './pages/login.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderPracticePage } from './pages/practice.js';
import { renderMocksPage } from './pages/mocks.js';
import { renderEmployerPrepPage } from './pages/employerPrep.js';
import { renderExamPage } from './pages/exam.js';
import { renderResultsPage } from './pages/results.js';
import { renderAnalyticsPage } from './pages/analytics.js';
import { renderBookmarksPage } from './pages/bookmarks.js';
import { renderSupportPage } from './pages/support.js';
import { renderSettingsPage } from './pages/settings.js';
import { renderFeedbackPage } from './pages/feedback.js';

// Define routing table
router.routes = {
  '/login': renderLoginPage,
  '/dashboard': renderDashboardPage,
  '/practice': renderPracticePage,
  '/mocks': renderMocksPage,
  '/employer-prep': renderEmployerPrepPage,
  '/exam/:id': renderExamPage,
  '/results/:id': renderResultsPage,
  '/analytics': renderAnalyticsPage,
  '/bookmarks': renderBookmarksPage,
  '/support': renderSupportPage,
  '/settings': renderSettingsPage,
  '/feedback': renderFeedbackPage,
};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  router.init('app');
});
