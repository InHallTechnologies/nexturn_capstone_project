const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = options.token === undefined ? localStorage.getItem('accessToken') : options.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const query = options.params ? `?${new URLSearchParams(options.params)}` : '';
  let response;

  try {
    response = await fetch(`${API_URL}${path}${query}`, {
      method: options.method || 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch {
    throw new Error('Could not reach the server. Check that the backend is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Something went wrong.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return { data, status: response.status };
}

export function get(path, params) {
  return request(path, { params });
}

export function post(path, body, token) {
  return request(path, { method: 'POST', body, token });
}

export function patch(path, body) {
  return request(path, { method: 'PATCH', body });
}

export function remove(path) {
  return request(path, { method: 'DELETE' });
}
