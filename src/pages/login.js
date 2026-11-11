/**
 * Login & Sign-up Page for Study GT.
 * Redesigned executive split-screen layout:
 * - Left side panel: Showcases login_page_image.jpg with smooth gradient overlay
 * - Right side panel: Minimalist, clean authentication with Google Sign-In & Demo Candidate option
 * - Removed all company logos/clutter (GTCO, Access, Zenith, PwC, etc.)
 */

import { auth } from '../auth.js';
import { api } from '../api.js';

export async function renderLoginPage(appEl, { navigate }) {
  appEl.innerHTML = `
    <div class="login-page min-h-screen w-full flex bg-surface antialiased font-body-md text-body-md selection:bg-primary selection:text-on-primary">
      <!-- Left Side Panel: Image Showcase (visible on lg screens and up) -->
      <div class="hidden lg:relative lg:flex lg:w-1/2 xl:w-7/12 bg-surface-container-lowest overflow-hidden select-none">
        <img
          src="/login_page_image.jpg"
          alt="Study GT Graduate Trainee Preparation"
          class="absolute inset-0 w-full h-full object-cover object-center transform scale-100 transition-transform duration-1000 ease-out hover:scale-105"
        />
        <!-- Subtle dark gradient overlay to ensure depth and luxury aesthetic -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30"></div>

        <!-- Left Panel Content Overlay -->
        <div class="relative z-10 w-full h-full flex flex-col justify-end p-12 text-white">
          <!-- Bottom Left Inspiring Highlight -->
          <div class="max-w-lg pb-6">
            <h2 class="text-3xl xl:text-4xl font-extrabold text-white leading-tight drop-shadow-sm">
              Master Aptitude Tests with Real Confidence.
            </h2>
            <p class="mt-3 text-white/90 text-sm leading-relaxed drop-shadow-xs">
              Simulate actual Dragnet test conditions, review detailed solution rationales, and monitor your psychometric readiness.
            </p>
          </div>
        </div>
      </div>

      <!-- Right Side Panel: Clean Authentication Container -->
      <div class="login-panel w-full lg:w-1/2 xl:w-5/12 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-surface-container-lowest border-l border-outline-variant/30">
        <section class="login-mobile-hero" aria-label="Study GT aptitude test preparation">
          <div class="login-mobile-brand flex items-center lg:hidden">
            <img
              src="/study-gt-logo.png"
              alt="Study GT Logo"
              class="h-9 w-9 object-contain rounded-lg shadow-xs ring-1 ring-outline-variant/20"
            />
            <span class="text-headline-md font-headline-md font-extrabold tracking-tight">
              Study GT
            </span>
          </div>
          <img
            src="/login_mobile_image.png"
            alt=""
            class="login-mobile-hero-image"
          />
          <div class="login-mobile-hero-overlay"></div>
          <div class="login-mobile-hero-copy">
            <h2>Get Job-Ready.<br />Master Your Aptitude.</h2>
            <p>The #1 practice platform for Graduate Trainee &amp; Top-Firm Assessments in Nigeria.</p>
          </div>
        </section>

        <!-- Center Auth Box -->
        <div class="login-auth-box my-auto max-w-sm w-full mx-auto py-6">
          <!-- Desktop Brand Header -->
          <div class="hidden lg:flex items-center gap-3 mb-8">
            <img
              src="/study-gt-logo.png"
              alt="Study GT"
              class="h-10 w-10 object-contain rounded-xl shadow-xs ring-1 ring-outline-variant/30"
            />
            <span class="text-headline-md font-headline-md font-extrabold tracking-tight text-primary">
              Study GT
            </span>
          </div>

          <!-- Welcome Headline -->
          <div class="login-welcome-header mb-8">
            <h1 class="text-headline-lg font-headline-lg font-extrabold text-on-surface tracking-tight leading-tight">
              Sign in to your account
            </h1>
            <p class="text-body-sm font-body-sm text-on-surface-variant mt-2 leading-relaxed">
              Continue your preparation or create your candidate profile.
            </p>
          </div>

          <!-- Authentication Actions -->
          <div class="flex flex-col gap-4">
            <!-- Google Sign-In Button -->
            <button
              id="google-signin-btn"
              type="button"
              class="w-full py-3.5 px-4 bg-surface hover:bg-surface-container border border-outline-variant/60 hover:border-primary/50 rounded-xl font-semibold text-sm text-on-surface flex items-center justify-center gap-3 transition-all duration-150 shadow-xs cursor-pointer group active:scale-[0.99]"
            >
              <svg class="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span class="font-medium text-on-surface">Continue with Google</span>
            </button>

            <!-- Divider -->
            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-outline-variant/40"></div>
              <span class="flex-shrink mx-4 text-xs font-semibold text-outline uppercase tracking-wider">or</span>
              <div class="flex-grow border-t border-outline-variant/40"></div>
            </div>

            <!-- Instant Demo Sign-In Button -->
            <button
              id="demo-signin-btn"
              type="button"
              class="w-full py-3.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-sm cursor-pointer active:scale-[0.99]"
            >
              <span class="material-symbols-outlined text-lg">bolt</span>
              <span>Launch Demo Candidate Profile</span>
            </button>
          </div>

          <!-- Alert / Error message container -->
          <div
            id="login-error"
            class="hidden mt-5 p-3.5 bg-error-container/80 border border-error/20 text-on-error-container rounded-xl text-xs leading-relaxed text-center"
          ></div>
        </div>

        <!-- Clean Footer -->
        <footer class="pt-6 border-t border-outline-variant/20 text-center lg:text-left text-xs text-outline flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Study GT Assessment Platform © 2026</span>
          <div class="flex items-center gap-4">
            <a href="#/support" class="hover:underline hover:text-on-surface">Support</a>
            <span>•</span>
            <span class="text-outline">Graduate Trainee Edition</span>
          </div>
        </footer>
      </div>
    </div>
  `;

  const errorDiv = appEl.querySelector('#login-error');
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
  };
  const clearError = () => errorDiv.classList.add('hidden');

  const demoBtn = appEl.querySelector('#demo-signin-btn');
  demoBtn.addEventListener('click', async () => {
    demoBtn.disabled = true;
    demoBtn.innerHTML = `
      <span class="animate-spin material-symbols-outlined text-lg">progress_activity</span>
      <span>Authenticating...</span>
    `;
    try {
      await auth.loginWithDemo('Babatunde', 'babatunde@studygt.ng');
      navigate('/dashboard');
    } catch (err) {
      showError(err.message || 'Demo authentication failed.');
      demoBtn.disabled = false;
      demoBtn.innerHTML = `
        <span class="material-symbols-outlined text-lg">bolt</span>
        <span>Launch Demo Candidate Profile</span>
      `;
    }
  });

  const googleBtn = appEl.querySelector('#google-signin-btn');
  const googleBtnHtml = googleBtn.innerHTML;
  let googleClientId = window.GOOGLE_CLIENT_ID || '';
  let googleConfigReady = Boolean(googleClientId);
  let googleConfigLoading = false;
  let googleConfigError = null;
  let googleSignInInProgress = false;

  const setGoogleButtonBusy = (message) => {
    googleBtn.disabled = true;
    googleBtn.classList.add('opacity-60', 'cursor-wait');
    googleBtn.innerHTML = `
      <span class="animate-spin material-symbols-outlined text-lg">progress_activity</span>
      <span class="font-medium">${message}</span>
    `;
  };
  const resetGoogleButton = () => {
    googleBtn.disabled = false;
    googleBtn.classList.remove('opacity-60', 'cursor-wait');
    googleBtn.innerHTML = googleBtnHtml;
    googleSignInInProgress = false;
  };
  const prepareGoogleConfig = async () => {
    if (googleConfigLoading) return;
    googleConfigLoading = true;
    googleConfigError = null;
    setGoogleButtonBusy('Preparing Google sign-in…');
    try {
      const cfg = await api.getAuthConfig();
      if (cfg && cfg.google_client_id) {
        googleClientId = cfg.google_client_id;
      }
      if (!googleClientId) {
        throw new Error('Google Sign-In is not configured on the backend.');
      }
      googleConfigReady = true;
      clearError();
    } catch (err) {
      googleConfigError = err;
      showError(`Could not prepare Google Sign-In: ${err.message}. Tap the Google button to retry.`);
    } finally {
      googleConfigLoading = false;
      if (!googleSignInInProgress) resetGoogleButton();
    }
  };

  if (!googleConfigReady) {
    void prepareGoogleConfig();
  }

  googleBtn.addEventListener('click', () => {
    if (!googleConfigReady) {
      if (!googleConfigLoading) {
        void prepareGoogleConfig();
      }
      return;
    }
    if (googleSignInInProgress) return;

    const client = auth.initGoogleAuthCodeFlow({
      clientId: googleClientId,
      onSuccess: () => navigate('/dashboard'),
      onCodeReceived: () => setGoogleButtonBusy('Completing sign-in…'),
      onError: (err) => {
        resetGoogleButton();
        showError(`Google Sign-In: ${err.message}. If not configured yet, use Demo Sign-In above.`);
      },
    });

    if (client) {
      googleSignInInProgress = true;
      setGoogleButtonBusy('Continue in Google…');
      try {
        client.requestCode();
      } catch (err) {
        resetGoogleButton();
        showError(`Google Sign-In could not open: ${err.message}`);
      }
    } else {
      resetGoogleButton();
      showError('Google Sign-In could not start. Please try again or use Demo Sign-In.');
    }
  });

  return () => {};
}
