/**
 * Authentication module for Study GT Frontend.
 * Initializes Google OAuth Code Client and handles user session state.
 */

import { api } from './api.js';

class AuthManager {
  constructor() {
    this.subscribers = [];
  }

  getUser() {
    return api.getUser();
  }

  isAuthenticated() {
    return Boolean(api.getToken());
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    const user = this.getUser();
    for (const cb of this.subscribers) {
      cb(user);
    }
  }

  logout() {
    api.logout();
    this.notify();
  }

  async loginWithGoogleCode(code, redirectUri = window.location.origin) {
    const res = await api.googleSignIn(code, redirectUri);
    this.notify();
    return res;
  }

  async loginWithDemo(name = 'Graduate Trainee', email = 'trainee@studygt.ng') {
    const res = await api.demoSignIn(name, email);
    this.notify();
    return res;
  }

  /**
   * Initializes Google Identity Services OAuth 2.0 Code Client.
   * Requests only the basic scopes needed for Google sign-in.
   *
   * In popup/GIS mode the redirect_uri is handled internally by Google as
   * "postmessage" — we must pass that exact string to the backend so it can
   * complete the server-side token exchange correctly.
   */
  initGoogleAuthCodeFlow({ clientId, onSuccess, onError, onCodeReceived }) {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.warn('Google Identity Services SDK not yet loaded.');
      if (onError) onError(new Error('Google SDK not loaded'));
      return null;
    }

    try {
      const client = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: async (response) => {
          if (response.code) {
            try {
              if (onCodeReceived) onCodeReceived();
              // GIS popup mode requires "postmessage" as the redirect_uri
              // for the server-side token exchange with Google
              await this.loginWithGoogleCode(response.code, 'postmessage');
              if (onSuccess) onSuccess(this.getUser());
            } catch (err) {
              if (onError) onError(err);
            }
          } else if (response.error) {
            if (onError) onError(new Error(response.error_description || response.error));
          }
        },
        error_callback: (err) => {
          if (onError) onError(err);
        }
      });
      return client;
    } catch (e) {
      console.error('Failed to init Google OAuth Code Client:', e);
      if (onError) onError(e);
      return null;
    }
  }
}

export const auth = new AuthManager();
