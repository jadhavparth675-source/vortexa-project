/**
 * Central RailFlow API Service
 * 
 * Interacts with FastAPI backend using fetch().
 * Adheres strictly to docs/api-contract.md.
 * Supports configurable and togglable mock mode.
 */

import {
  mockHealthResponse,
  mockDefaultTimetable,
  mockParseDisruptions,
  mockApplyDisruptions,
  mockValidate,
} from './mockData';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const envBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
const envUseMock = import.meta.env.VITE_USE_MOCK === 'true';

let runtimeMockMode = envUseMock;

export const apiConfig = {
  getBaseUrl: () => envBaseUrl,
  isMockMode: () => runtimeMockMode,
  setMockMode: (val) => {
    runtimeMockMode = Boolean(val);
  },
};

/**
 * Standard fetch helper with error handling and timeout
 */
async function request(endpoint, options = {}) {
  const url = `${envBaseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        data?.detail || data?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMessage);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError = new Error(
        `Unable to connect to backend at ${envBaseUrl}. Please ensure FastAPI server is running or switch to Mock Mode.`
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw err;
  }
}

/**
 * GET /api/health
 */
export async function getHealth() {
  if (runtimeMockMode) {
    return Promise.resolve(mockHealthResponse);
  }
  return request('/api/health');
}

/**
 * GET /api/timetable
 */
export async function getTimetable() {
  if (runtimeMockMode) {
    return Promise.resolve(mockDefaultTimetable);
  }
  return request('/api/timetable');
}

/**
 * POST /api/validate
 */
export async function validateTimetable(timetable) {
  if (runtimeMockMode) {
    return Promise.resolve(mockValidate(timetable));
  }
  return request('/api/validate', {
    method: 'POST',
    body: JSON.stringify({ timetable }),
  });
}

/**
 * POST /api/disruptions/parse
 */
export async function parseDisruptions(text) {
  if (!text || !text.trim()) {
    throw new Error('Disruption text cannot be empty.');
  }

  if (runtimeMockMode) {
    return Promise.resolve(mockParseDisruptions(text));
  }

  return request('/api/disruptions/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/**
 * POST /api/disruptions/apply
 */
export async function applyDisruptions({ timetable, disruptions = [], disruptions_text = null }) {
  if (runtimeMockMode) {
    return Promise.resolve(mockApplyDisruptions(timetable, disruptions));
  }

  const payload = {
    timetable,
    disruptions,
  };

  if (disruptions_text) {
    payload.disruptions_text = disruptions_text;
  }

  return request('/api/disruptions/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

