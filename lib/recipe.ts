/**
 * Galaxy Recipes — the full-state deep-link system.
 *
 * The base `galaxyPresets` module makes the *config* (theme / arms / rpm /
 * stars) shareable. A "recipe" goes one step further: it captures the state of
 * **every** interactive layer toggle, so a shared link re-hydrates the exact
 * galaxy a person was looking at — nebula, constellations, meteors, depth,
 * variable stars, comet and the zoom mode — not just the spiral config.
 *
 * Recipes are expressed as URL search params:
 *   ?theme=aurora&arms=5&nebula=on&constellation=on&comet=on
 *
 * Every layer defaults to **off**, so the params for a plain galaxy are empty
 * and the URL stays tidy. This module is side-effect free and unit-test
 * friendly, mirroring `galaxyPresets`.
 */

/** The set of additive, toggle-able sky layers (all off by default). */
export interface GalaxyRecipe {
  nebula: boolean;
  constellation: boolean;
  meteors: boolean;
  depth: boolean;
  variable: boolean;
  comet: boolean;
  /** The Zoom *mode* toggle (distinct from the `?z=` zoom level). */
  zoomMode: boolean;
  /** Aurora: an opt-in northern-lights ribbon layer across the upper sky. */
  aurora: boolean;
  /** Lunar Transit: an opt-in moon that drifts and wanes across the sky. */
  moon: boolean;
  /** Supernova: an opt-in rare event — a background star that explodes into a
   * flash that fades to a faint remnant. */
  supernova: boolean;
  /** Distant Galaxy: an opt-in far-away spiral galaxy slowly rotating in the
   * deep background. */
  distant: boolean;
}

export const DEFAULT_RECIPE: GalaxyRecipe = {
  nebula: false,
  constellation: false,
  meteors: false,
  depth: false,
  variable: false,
  comet: false,
  zoomMode: false,
  aurora: false,
  moon: false,
  supernova: false,
  distant: false,
};

/** The URL param name for each layer, in a stable display order. */
export const RECIPE_PARAMS = {
  nebula: "nebula",
  constellation: "constellation",
  meteors: "meteors",
  depth: "depth",
  variable: "variable",
  comet: "comet",
  zoom: "zoom",
  aurora: "aurora",
  moon: "moon",
  supernova: "supernova",
  distant: "distant",
} as const;

/** Read one boolean layer param; missing / non-"on" values are `false`. */
function parseLayer(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "on";
}

/**
 * Parse the layer toggles out of a URLSearchParams. Missing values fall back
 * to `false` (never throws), so an un-parameterised URL yields the default
 * recipe.
 */
export function parseRecipe(params: URLSearchParams): GalaxyRecipe {
  return {
    nebula: parseLayer(params, RECIPE_PARAMS.nebula),
    constellation: parseLayer(params, RECIPE_PARAMS.constellation),
    meteors: parseLayer(params, RECIPE_PARAMS.meteors),
    depth: parseLayer(params, RECIPE_PARAMS.depth),
    variable: parseLayer(params, RECIPE_PARAMS.variable),
    comet: parseLayer(params, RECIPE_PARAMS.comet),
    zoomMode: parseLayer(params, RECIPE_PARAMS.zoom),
    aurora: parseLayer(params, RECIPE_PARAMS.aurora),
    moon: parseLayer(params, RECIPE_PARAMS.moon),
    supernova: parseLayer(params, RECIPE_PARAMS.supernova),
    distant: parseLayer(params, RECIPE_PARAMS.distant),
  };
}

/**
 * Build a URLSearchParams for a recipe. Only layers that are *on* are written
 * — the off (default) layers are omitted so a plain galaxy produces an empty
 * query string.
 */
export function recipeToParams(recipe: Partial<GalaxyRecipe>): URLSearchParams {
  const p = new URLSearchParams();
  if (recipe.nebula) p.set(RECIPE_PARAMS.nebula, "on");
  if (recipe.constellation) p.set(RECIPE_PARAMS.constellation, "on");
  if (recipe.meteors) p.set(RECIPE_PARAMS.meteors, "on");
  if (recipe.depth) p.set(RECIPE_PARAMS.depth, "on");
  if (recipe.variable) p.set(RECIPE_PARAMS.variable, "on");
  if (recipe.comet) p.set(RECIPE_PARAMS.comet, "on");
  if (recipe.zoomMode) p.set(RECIPE_PARAMS.zoom, "on");
  if (recipe.aurora) p.set(RECIPE_PARAMS.aurora, "on");
  if (recipe.moon) p.set(RECIPE_PARAMS.moon, "on");
  if (recipe.supernova) p.set(RECIPE_PARAMS.supernova, "on");
  if (recipe.distant) p.set(RECIPE_PARAMS.distant, "on");
  return p;
}

/**
 * Merge a parsed recipe over the defaults. This is forgiving: any unknown or
 * malformed input simply resolves to the default for that layer, so a crafted
 * URL can never throw.
 */
export function resolveRecipe(partial: Partial<GalaxyRecipe>): GalaxyRecipe {
  return {
    nebula: partial.nebula ?? DEFAULT_RECIPE.nebula,
    constellation: partial.constellation ?? DEFAULT_RECIPE.constellation,
    meteors: partial.meteors ?? DEFAULT_RECIPE.meteors,
    depth: partial.depth ?? DEFAULT_RECIPE.depth,
    variable: partial.variable ?? DEFAULT_RECIPE.variable,
    comet: partial.comet ?? DEFAULT_RECIPE.comet,
    zoomMode: partial.zoomMode ?? DEFAULT_RECIPE.zoomMode,
    aurora: partial.aurora ?? DEFAULT_RECIPE.aurora,
    moon: partial.moon ?? DEFAULT_RECIPE.moon,
    supernova: partial.supernova ?? DEFAULT_RECIPE.supernova,
    distant: partial.distant ?? DEFAULT_RECIPE.distant,
  };
}

/**
 * Flip a single layer in a recipe, returning a new recipe object.
 */
export function toggleLayer(
  recipe: GalaxyRecipe,
  layer: keyof GalaxyRecipe,
): GalaxyRecipe {
  return { ...recipe, [layer]: !recipe[layer] };
}

/**
 * Human-readable summary of a recipe for accessibility / sharing previews,
 * e.g. "Nebula, Constellations, Comet".
 */
export function describeRecipe(recipe: GalaxyRecipe): string {
  const on = (name: string, value: boolean) => (value ? name : null);
  const parts = [
    on("Nebula", recipe.nebula),
    on("Constellations", recipe.constellation),
    on("Shooting Stars", recipe.meteors),
    on("Depth", recipe.depth),
    on("Variable Stars", recipe.variable),
    on("Comet", recipe.comet),
    on("Zoom", recipe.zoomMode),
    on("Aurora", recipe.aurora),
    on("Moon", recipe.moon),
    on("Supernovae", recipe.supernova),
    on("Distant Galaxy", recipe.distant),
  ].filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "Default galaxy";
}
