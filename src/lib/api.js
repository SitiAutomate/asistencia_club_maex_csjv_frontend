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

export function toAuthenticatedUploadApiPath(foto) {
  if (foto == null) return '';
  const s = String(foto).trim();
  if (!s || /^https?:\/\//i.test(s) || s.startsWith('//')) return '';
  const p = s.startsWith('/') ? s : `/${s}`;
  if (p.startsWith('/api/uploads')) return p;
  if (p.startsWith('/uploads')) return `/api${p}`;
  return '';
}

export async function fetchAuthenticatedImageObjectUrl(uploadPath) {
  const path = toAuthenticatedUploadApiPath(uploadPath);
  if (!path) return '';
  const token = getStoredToken();
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return '';
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Abre PDF/archivo protegido en pestaña nueva usando el token de sesión (window.open no envía Bearer). */
export async function openAuthenticatedUpload(uploadPath) {
  const path = toAuthenticatedUploadApiPath(uploadPath);
  if (!path) throw new Error('Ruta de archivo no válida');

  const token = getStoredToken();
  if (!token) {
    markSessionEnded('expired');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }

  // Debe abrirse en el mismo clic del usuario (antes de cualquier await).
  // Si se abre tras fetch(), Chrome/Safari lo tratan como popup no solicitado.
  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new Error('El navegador bloqueó la ventana emergente. Permite popups para este sitio.');
  }
  popup.opener = null;
  try {
    popup.document.title = 'Cargando informe…';
    popup.document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:2rem;color:#333">Cargando informe…</p>';
  } catch {
    /* algunos navegadores restringen document en about:blank */
  }

  try {
    const res = await fetch(apiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        markSessionEnded('unauthorized');
        clearStoredToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
      let message = 'No se pudo abrir el archivo';
      try {
        const data = await res.json();
        message = data?.message || message;
      } catch {
        /* respuesta no JSON */
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    popup.location.replace(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  } catch (error) {
    try {
      popup.close();
    } catch {
      /* ignore */
    }
    throw error;
  }
}
