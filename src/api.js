/**
 * API Client for Study GT Backend.
 * Handles JWT bearer authentication, standardized responses, and error handling.
 */

export const API_BASE = 'https://study-gt-backend.onrender.com';

export function getFullImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

class ApiClient {
  constructor() {
    this.tokenKey = 'study_gt_jwt';
    this.userKey = 'study_gt_user';
    this.historyCacheKey = 'study_gt_exam_history';
    this.progressCacheKey = 'study_gt_user_progress';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (this.getToken() !== token) {
      this.invalidateHistoryCache();
      this.invalidateProgressCache();
    }
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getUser() {
    try {
      const u = localStorage.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
    window.location.hash = '#/login';
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const resp = await fetch(url, config);
      if (resp.status === 401) {
        this.logout();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!resp.ok) {
        let errMessage = `HTTP Error ${resp.status}`;
        try {
          const errData = await resp.json();
          errMessage = errData.detail || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      if (resp.status === 204) {
        return null;
      }

      return await resp.json();
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // --- Auth endpoints ---
  async getAuthConfig() {
    return this.request('/api/auth/config');
  }

  async googleSignIn(code, redirectUri) {
    const res = await this.request('/api/auth/google', {
      method: 'POST',
      body: { code, redirect_uri: redirectUri },
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async demoSignIn(name = 'Graduate Candidate', email = 'candidate@studygt.ng') {
    const res = await this.request('/api/auth/demo', {
      method: 'POST',
      body: { name, email },
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async refreshGoogleToken() {
    return this.request('/api/auth/refresh', { method: 'POST' });
  }

  // --- Question Bank endpoints ---
  async getCategories() {
    return this.request('/api/questions/categories');
  }

  async getEmployers() {
    return this.request('/api/questions/employers');
  }

  async getRandomQuestions(count = 10, category = null, employer = null) {
    const params = new URLSearchParams();
    if (count) params.append('count', count);
    if (category) params.append('category', category);
    if (employer) params.append('employer', employer);
    return this.request(`/api/questions/random?${params.toString()}`);
  }

  // --- Exam Lifecycle endpoints ---
  async startExam({
    exam_type = 'mock',
    exam_category = 'Mixed',
    employer = null,
    total_questions = 60,
    time_limit_seconds = 3600,
  }) {
    const result = await this.request('/api/exams/start', {
      method: 'POST',
      body: { exam_type, exam_category, employer, total_questions, time_limit_seconds },
    });
    this.invalidateHistoryCache();
    this.invalidateProgressCache();
    return result;
  }

  async getExam(sessionId) {
    return this.request(`/api/exams/${sessionId}`);
  }

  async submitAnswer(sessionId, questionIndex, selectedAnswer, timeSpentMs = 0) {
    const result = await this.request(`/api/exams/${sessionId}/answer`, {
      method: 'PUT',
      body: { question_index: questionIndex, selected_answer: selectedAnswer, time_spent_ms: timeSpentMs },
    });
    this.invalidateProgressCache();
    return result;
  }

  async toggleFlag(sessionId, questionIndex, isFlagged = null) {
    return this.request(`/api/exams/${sessionId}/flag/${questionIndex}`, {
      method: 'PUT',
      body: { is_flagged: isFlagged },
    });
  }

  async recordViolation(sessionId, violationType = 'tab_switch') {
    return this.request(`/api/exams/${sessionId}/violation`, {
      method: 'POST',
      body: { violation_type: violationType },
    });
  }

  async completeExam(sessionId) {
    const result = await this.request(`/api/exams/${sessionId}/complete`, {
      method: 'POST',
    });
    this.invalidateHistoryCache();
    this.invalidateProgressCache();
    return result;
  }

  async getResults(sessionId) {
    return this.request(`/api/exams/${sessionId}/results`);
  }

  async getHistory() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(this.historyCacheKey) || 'null');
      if (
        Array.isArray(cached?.history) &&
        Number.isFinite(cached.savedAt) &&
        Date.now() - cached.savedAt < 60_000
      ) {
        return cached.history;
      }
    } catch (error) {
      console.warn('Ignoring invalid cached exam history:', error);
    }

    const history = await this.request('/api/exams/history');
    try {
      sessionStorage.setItem(this.historyCacheKey, JSON.stringify({
        savedAt: Date.now(),
        history,
      }));
    } catch (error) {
      console.warn('Could not cache exam history:', error);
    }
    return history;
  }

  invalidateHistoryCache() {
    try {
      sessionStorage.removeItem(this.historyCacheKey);
    } catch (error) {
      console.warn('Could not clear cached exam history:', error);
    }
  }

  async getProgress() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(this.progressCacheKey) || 'null');
      if (cached?.progress && Number.isFinite(cached.savedAt) && Date.now() - cached.savedAt < 30_000) {
        return cached.progress;
      }
    } catch (error) {
      console.warn('Ignoring invalid cached progress:', error);
    }

    const progress = await this.request('/api/exams/progress');
    try {
      sessionStorage.setItem(this.progressCacheKey, JSON.stringify({
        savedAt: Date.now(),
        progress,
      }));
    } catch (error) {
      console.warn('Could not cache progress:', error);
    }
    return progress;
  }

  invalidateProgressCache() {
    try {
      sessionStorage.removeItem(this.progressCacheKey);
    } catch (error) {
      console.warn('Could not clear cached progress:', error);
    }
  }

  async getStudyStreak() {
    return this.request('/api/exams/streak');
  }

  async getBookmarks() {
    return this.request('/api/exams/bookmarks');
  }

  async getFeedback({ category = null, sort = 'top', limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
    if (category) params.set('category', category);
    return this.request(`/api/feedback?${params.toString()}`);
  }

  async createFeedback({ category, topic, body }) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: { category, topic, body },
    });
  }

  async voteFeedback(postId, vote) {
    return this.request(`/api/feedback/${postId}/vote`, {
      method: 'PUT',
      body: { vote },
    });
  }

  async deleteFeedback(postId) {
    return this.request(`/api/feedback/${postId}`, { method: 'DELETE' });
  }

  async setBookmark(sessionId, questionIndex, isFlagged) {
    return this.toggleFlag(sessionId, questionIndex, isFlagged);
  }

  async updateProfile(name) {
    const res = await this.request('/api/auth/profile', {
      method: 'PUT',
      body: { name },
    });
    this.setUser(res.user);
    return res.user;
  }

  // --- AI endpoints ---
  async generateQuestions(category = 'Verbal', count = 5, employer = 'Dragnet') {
    return this.request('/api/ai/generate', {
      method: 'POST',
      body: { category, count, employer },
    });
  }
}

export const api = new ApiClient();
