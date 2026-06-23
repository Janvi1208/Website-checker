const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiOptions extends RequestInit {
  json?: unknown;
}

/**
 * Thin wrapper around fetch for talking to the SiteMind AI backend.
 * Always sends credentials so the httpOnly session cookie is included on
 * cross-origin requests — the backend's CORS config must allow this origin
 * with credentials: true for that to work (see backend/src/app.ts).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const { json, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  let data: T;
  try {
    data = await res.json();
  } catch {
    data = {} as T;
  }

  return { ok: res.ok, status: res.status, data };
}

export { API_BASE_URL };
