// Default to the backend server (5175) unless a VITE_API_URL override is provided.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5175/api';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson ? data?.error || 'Request failed' : data;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}


