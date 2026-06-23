const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://website-checker-1-s4ql.onrender.com";

interface ApiOptions extends RequestInit {
  json?: unknown;
}

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

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

export { API_BASE_URL };