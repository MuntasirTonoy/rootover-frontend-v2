"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { PlatformConfig } from "./api-types";

// GET /config once per page load: the platform constants the UI displays
// (fees, commission, clearing days). The API owns them; there is no copy here.
let cached: Promise<PlatformConfig> | null = null;

const load = () => {
  cached ??= api<PlatformConfig>("/config").catch((err) => {
    cached = null; // retry on the next use
    throw err;
  });
  return cached;
};

// undefined until loaded
export function useConfig(): PlatformConfig | undefined {
  const [config, setConfig] = useState<PlatformConfig>();
  useEffect(() => {
    let live = true;
    load()
      .then((c) => live && setConfig(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return config;
}

// After an admin changes the fees: the next useConfig() mount fetches again
export function invalidateConfig() {
  cached = null;
}
