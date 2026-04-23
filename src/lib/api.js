const base =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.length > 0
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : '';
const SESSION_END_REASON_KEY = 'sessionEndedReason';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function clearStoredToken() {
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('accessToken');
}

function markSessionEnded(reason) {
  if (!reason) return;
  sessionStorage.setItem(SESSION_END_REASON_KEY, reason);
}

function getTokenExpirationMs(token) {
  try {
    const payloadPart = String(token || '').split('.')[1] || '';
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    const exp = Number(payload?.exp || 0);
    if (!Number.isFinite(exp) || exp <= 0) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

function isExpiredToken(token) {
  const expMs = getTokenExpirationMs(token);
  if (!expMs) return false;
  return Date.now() >= expMs;
}

export function getStoredTokenExpirationMs() {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  if (!token) return null;
  return getTokenExpirationMs(token);
}

export function getStoredToken() {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  if (!token) return null;
  if (isExpiredToken(token)) {
    markSessionEnded('expired');
    clearStoredToken();
    return null;
  }
  return token;
}

export function setStoredToken(token) {
  sessionStorage.removeItem(SESSION_END_REASON_KEY);
  clearStoredToken();
  if (token) localStorage.setItem('accessToken', token);
}

export function setSessionToken(token) {
  sessionStorage.removeItem(SESSION_END_REASON_KEY);
  clearStoredToken();
  if (token) sessionStorage.setItem('accessToken', token);
}

export function getSessionEndedReason() {
  return sessionStorage.getItem(SESSION_END_REASON_KEY) || '';
}

export function clearSessionEndedReason() {
  sessionStorage.removeItem(SESSION_END_REASON_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || res.statusText || 'Error de red';
    if (res.status === 401 && token) {
      markSessionEnded('unauthorized');
      clearStoredToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function postJson(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export function getJson(path) {
  return apiFetch(path, { method: 'GET' });
}
