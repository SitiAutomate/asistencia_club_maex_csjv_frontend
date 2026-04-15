const base =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.length > 0
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : '';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function getStoredToken() {
  return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
}

export function setStoredToken(token) {
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('accessToken');
  if (token) localStorage.setItem('accessToken', token);
}

export function setSessionToken(token) {
  sessionStorage.removeItem('accessToken');
  localStorage.removeItem('accessToken');
  if (token) sessionStorage.setItem('accessToken', token);
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
