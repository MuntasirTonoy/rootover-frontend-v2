// Client for the Root Over backend (rootover-backend-v2). Every response is
// JSON; errors arrive as { error: { code, message, fields? } } and are thrown
// as ApiError so forms can show the message and per-field errors.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "rootover_token";

// Fired when the API rejects the stored session (expired token or banned account)
export const SESSION_EVENT = "rootover:session-ended";
const BANNED_MESSAGE = "This account has been suspended by an administrator.";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The session just won't survive a refresh
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

// Drops empty values so "no filter" never reaches the API
export function withQuery(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {}))
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_URL + withQuery(path, init.query), {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.ok) return data as T;

  const error = data?.error ?? {};
  const failure = new ApiError(
    res.status,
    error.code ?? "INTERNAL",
    error.message ?? "Something went wrong. Please try again.",
    error.fields,
  );
  // A stored token that stopped working ends the session everywhere
  if (token && (res.status === 401 || (res.status === 403 && failure.message === BANNED_MESSAGE)))
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: failure.message }));
  throw failure;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong. Please try again.";
