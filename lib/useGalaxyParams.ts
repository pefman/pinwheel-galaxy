"use client";

/**
 * useGalaxyParams — binds a GalaxyConfig to the browser URL.
 *
 * - On mount it reads `?theme=&arms=&rpm=&stars=` (and `?gravity=`) so that
 *   freshly-opened shareable links render the intended galaxy.
 * - Mutations (`applyConfig`, `shuffle`, `toggleGravity`) write the new state
 *   back into the URL via `history.pushState`, so the current galaxy is always
 *   shareable by copying the address bar.
 * - It also listens for `popstate` so browser Back/Forward re-renders the
 *   galaxy from the URL — the link is the source of truth.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  GalaxyConfig,
  shuffleConfig,
  configToParams,
  parseConfigFromParams,
} from "./galaxyPresets";

const GRAVITY_PARAM = "gravity";

export function useGalaxyParams() {
  const search =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).toString();

  const [config, setConfig] = useState<GalaxyConfig>(() =>
    parseConfigFromParams(new URLSearchParams(search))
  );
  const [gravity, setGravity] = useState<boolean>(() => {
    const raw = new URLSearchParams(search).get(GRAVITY_PARAM);
    if (raw === null) return true;
    return raw !== "0" && raw !== "false";
  });

  // Re-read the URL on Back/Forward navigation.
  useEffect(() => {
    const onPop = () => {
      setConfig(parseConfigFromParams(new URLSearchParams(window.location.search)));
      const raw = new URLSearchParams(window.location.search).get(GRAVITY_PARAM);
      setGravity(raw === null ? true : raw !== "0" && raw !== "false");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keep the visible URL in sync whenever config/gravity changes programmatically.
  useEffect(() => {
    const params = configToParams(config);
    params.set(GRAVITY_PARAM, gravity ? "1" : "0");
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", url);
  }, [config, gravity]);

  const applyConfig = useCallback((partial: Partial<GalaxyConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const shuffle = useCallback(() => {
    setConfig(shuffleConfig());
  }, []);

  const toggleGravity = useCallback(() => setGravity((g) => !g), []);

  const label = useMemo(() => {
    if (typeof window === "undefined") return null;
    const usp = new URLSearchParams(window.location.search);
    return usp.size > 0 ? configToParams(config).toString() : null;
  }, [config]);

  return { config, gravity, applyConfig, shuffle, toggleGravity, shareQuery: label };
}
