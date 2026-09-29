const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:8000";

export class BackendUnavailableError extends Error {
  constructor(message = "The local backend is unavailable.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export class BackendResponseError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BackendResponseError";
  }
}

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const origin = (process.env.BACKEND_ORIGIN || DEFAULT_BACKEND_ORIGIN).replace(/\/$/, "");
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (process.env.BACKEND_SHARED_SECRET) headers.set("X-Backend-Secret", process.env.BACKEND_SHARED_SECRET);
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, { ...init, headers, signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new BackendUnavailableError();
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new BackendResponseError(response.status, payload.detail || `Backend returned ${response.status}.`);
  }
  return response.json() as Promise<T>;
}
