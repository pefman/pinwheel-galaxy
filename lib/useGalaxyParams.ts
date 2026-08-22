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
import { ZOOM_DEFAULT, paramsToZoom } from "./zoom";
import {
  DEFAULT_RECIPE,
  GalaxyRecipe,
  parseRecipe,
  recipeToParams,
  toggleLayer as toggleLayerInRecipe,
} from "./recipe";

const GRAVITY_PARAM = "gravity";
const ZOOM_PARAM = "z";

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
  // Galaxy Zoom: read the shareable `?z=` param on mount.
  const [zoom, setZoomState] = useState<number>(() =>
    paramsToZoom(new URLSearchParams(search).get(ZOOM_PARAM)) ?? ZOOM_DEFAULT,
  );
  // Galaxy Recipe: read every layer toggle on mount so a shared link re-hydrates
  // the exact galaxy (all active layers) instead of just the spiral config.
  const [recipe, setRecipe] = useState<GalaxyRecipe>(() =>
    parseRecipe(new URLSearchParams(search)),
  );

  // Re-read the URL on Back/Forward navigation.
  useEffect(() => {
    const onPop = () => {
      const usp = new URLSearchParams(window.location.search);
      setConfig(parseConfigFromParams(usp));
      const raw = usp.get(GRAVITY_PARAM);
      setGravity(raw === null ? true : raw !== "0" && raw !== "false");
      setZoomState(paramsToZoom(usp.get(ZOOM_PARAM)) ?? ZOOM_DEFAULT);
      setRecipe(parseRecipe(usp));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keep the visible URL in sync whenever config/gravity/zoom/recipe change.
  // The base config + gravity + zoom come from galaxyPresets/zoom; every layer
  // toggle is written into the URL too, so a shared link re-hydrates the exact
  // galaxy (all active layers included) — the recipe is part of the source of
  // truth, not just the spiral config.
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    usp.set("theme", config.theme);
    usp.set("arms", String(config.arms));
    usp.set("rpm", String(config.rpm));
    usp.set("stars", String(config.stars));
    usp.set(GRAVITY_PARAM, gravity ? "1" : "0");
    usp.set(ZOOM_PARAM, zoom.toFixed(2));
    // Only the on-layers are written, keeping a plain galaxy's URL tidy.
    recipeToParams(recipe).forEach((value, key) => usp.set(key, value));
    const query = usp.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", url);
  }, [config, gravity, zoom, recipe]);

  // Public setter: the starfield calls this with the live zoom; we persist it.
  const setZoom = useCallback((z: number) => setZoomState(z), []);

  // Flip a single layer toggle; the persist effect above writes it to the URL.
  const toggle = useCallback((layer: keyof GalaxyRecipe) => {
    setRecipe((prev) => toggleLayerInRecipe(prev, layer));
  }, []);

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

  return {
    config,
    gravity,
    zoom,
    recipe,
    applyConfig,
    shuffle,
    toggleGravity,
    toggle,
    setZoom,
    shareQuery: label,
  };
}
