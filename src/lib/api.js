export async function api(path, body, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    ...options,
    ...(body !== undefined && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}
