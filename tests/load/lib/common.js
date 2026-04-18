import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.LOAD_BASE_URL || 'http://localhost:5173';

export const SHARED_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<800'],
};

/** GET with profile/role tagging so k6 summary breaks out per-profile metrics. */
export function getTagged(path, profile, extraTags = {}) {
  return http.get(`${BASE_URL}${path}`, {
    tags: { profile, ...extraTags },
  });
}

export function checkOk(res, name) {
  return check(res, {
    [`${name} status<500`]: (r) => r.status < 500,
    [`${name} not blocked`]: (r) => r.status !== 0,
  });
}

/** Endpoints that exist behind the same flows the Playwright suite walks. */
export const READ_ENDPOINTS = [
  { path: '/', name: 'landing' },
  { path: '/api/health', name: 'health' },
  { path: '/api/dashboard/summary', name: 'dashboard' },
  { path: '/api/wallet/balance', name: 'wallet' },
  { path: '/api/orders', name: 'orders' },
  { path: '/api/notifications', name: 'notifications' },
];
