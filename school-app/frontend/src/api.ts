const TOKEN_KEY = "madrasti_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* stockage indisponible : session non persistée */
    }
  },
};

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  // Délai max : un réseau mobile qui ne répond pas ne doit pas bloquer l'écran indéfiniment
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), body instanceof FormData ? 120_000 : 15_000);
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: payload, signal: ctrl.signal });
  } catch {
    throw new ApiError(0, "network");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 && path !== "/api/auth/login") onUnauthorized();
  if (!res.ok) {
    let code = "error";
    try {
      const data = await res.json();
      code = typeof data.detail === "string" ? data.detail : "invalid_input";
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(res.status, code);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
};

export function form(data: Record<string, string | Blob | Blob[] | null | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((f) => fd.append(k, f));
    else fd.append(k, v);
  }
  return fd;
}
