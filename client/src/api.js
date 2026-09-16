export function getToken() {
  return localStorage.getItem('ch_token');
}

export function setToken(t) {
  if (t) localStorage.setItem('ch_token', t);
  else localStorage.removeItem('ch_token');
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(path, { ...options, headers });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}