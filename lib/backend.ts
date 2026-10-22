const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:8000";
import { currentRequestId, writeTrace } from "./observability";

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
  const requestId = currentRequestId();
  if (requestId) headers.set("X-Request-ID", requestId);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (process.env.BACKEND_SHARED_SECRET) headers.set("X-Backend-Secret", process.env.BACKEND_SHARED_SECRET);
  let response: Response;
  const started = performance.now();
  try {
    response = await fetch(`${origin}${path}`, { ...init, headers, signal: init?.signal ?? AbortSignal.timeout(60_000) });
  } catch {
    writeTrace("backend.request", "backend", 503, performance.now() - started);
    throw new BackendUnavailableError();
  }
  writeTrace("backend.request", "backend", response.status, performance.now() - started);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new BackendResponseError(response.status, payload.detail || `Backend returned ${response.status}.`);
  }
  return response.json() as Promise<T>;
}
