"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppStore";
import { api, ApiError } from "./api";

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  reload: () => void;
  // Local update after a mutation, without refetching
  setData: (update: T | ((prev: T | undefined) => T)) => void;
}

// GETs `path` once the session is known (so the token is sent), and again
// whenever the path or the signed-in user changes. Pass null to skip.
export function useApi<T>(path: string | null): ApiState<T> {
  const { hydrated, user } = useApp();
  const [state, setState] = useState<{ key: string | null; data?: T; error?: ApiError }>({ key: null });
  const [nonce, setNonce] = useState(0);
  const key = hydrated && path ? `${user?.id ?? "guest"} ${path} ${nonce}` : null;

  useEffect(() => {
    if (!key || !path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ key, data }))
      .catch((err) => {
        if ((err as Error).name !== "AbortError")
          setState((s) => ({ key, data: s.data, error: err instanceof ApiError ? err : new ApiError(0, "INTERNAL", String(err)) }));
      });
    return () => controller.abort();
  }, [key, path]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (update: T | ((prev: T | undefined) => T)) =>
      setState((s) => ({
        ...s,
        data: typeof update === "function" ? (update as (p: T | undefined) => T)(s.data) : update,
      })),
    [],
  );

  return {
    data: state.data,
    error: state.key === key ? state.error : undefined,
    // Keeps showing the previous data while a new request is in flight
    loading: !!path && (key === null || state.key !== key),
    reload,
    setData,
  };
}

// The value after it has stopped changing for `ms` (search boxes)
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
