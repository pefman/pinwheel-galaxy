/**
 * Galaxy of the Day — the pure, unit-tested logic for a daily, seeded galaxy.
 *
 * A generative tool loses people after a few generations because there is no
 * reason to come back. The antidote used by the category (NightCafe's
 * Promptle, Prompt Royale, constraint engines, …) is a single fresh, shared
 * challenge that refreshes once per calendar day: everyone sees the same thing
 * today, a new one tomorrow, and it costs nothing to run because it is fully
 * derived from the date.
 *
 * This module turns "today" into a fully-specified galaxy — a spiral
 * `GalaxyConfig` plus a set of active sky layers (`GalaxyRecipe`) plus a short
 * creative-prompt constraint — using a deterministic PRNG seeded by the day.
 * The same calendar day always yields the same galaxy, on any machine, with no
 * backend, no clock drift past midnight, and no stored state.
 *
 * Everything here is a pure function of its input date, so the effect is fully
 * testable without a canvas, a timer, or `Date.now()`.
 */

import {
  GalaxyConfig,
  RANGES,
  THEME_KEYS,
  THEMES,
} from "./galaxyPresets";
import {
  DEFAULT_RECIPE,
  GalaxyRecipe,
  RECIPE_PARAMS,
} from "./recipe";

/**
 * The seven toggle-able sky layers, in display order. Kept as a plain array so
 * the daily generator can pick a deterministic subset of them.
 */
export const LAYER_KEYS: (keyof GalaxyRecipe)[] = [
  "nebula",
  "constellation",
  "meteors",
  "depth",
  "variable",
  "comet",
  "zoomMode",
];

/** A short, concrete creative constraint for the daily challenge. */
export interface DailyPrompt {
  /** The visible constraint, e.g. "Barred spiral · warm ember palette". */
  text: string;
  /** A compact tag shown as a chip, e.g. "Daily challenge". */
  tag: string;
}

/** The full, deterministic result for a given day. */
export interface DailyGalaxy {
  config: GalaxyConfig;
  recipe: GalaxyRecipe;
  prompt: DailyPrompt;
  /** Human-readable summary, e.g. "Ember · 4 arms · 8rpm · Nebula, Comet". */
  label: string;
}

/** A `mulberry32` PRNG — tiny, deterministic, good enough for seeded skies. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The day key (local `YYYY-MM-DD`) for a date. Passing no date uses "now".
 * Everything downstream is keyed off this string, so the galaxy only changes at
 * local midnight — a visitor browsing just after 00:00 still sees the same
 * galaxy as everyone else that day.
 */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * A stable, well-distributed 32-bit seed for a string. Uses the 32-bit FNV-1a
 * hash: deterministic across platforms and cheap enough to run on every page
 * load. This is the only thing that makes "today" reproducible.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The seeded PRNG for a given day key. */
export function rngForDay(day: string): () => number {
  return mulberry32(hashSeed(day));
}

/** Pick one item from an array using a PRNG, so a fixed seed always wins. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Pick a deterministic subset of the layer keys with the given PRNG. The count
 * is biased low (0–3 layers) so the "default" galaxy still reads as default and
 * the daily galaxy stays a tasteful nudge, not a kitchen-sink scene.
 */
export function pickLayers(rng: () => number, count = LAYER_KEYS.length): (keyof GalaxyRecipe)[] {
  const chosen: (keyof GalaxyRecipe)[] = [];
  let budget = Math.floor(rng() * 4); // 0..3
  for (const key of LAYER_KEYS.slice(0, count)) {
    if (rng() < budget / LAYER_KEYS.length) chosen.push(key);
    budget -= 1;
    if (budget <= 0) break;
  }
  return chosen;
}

/**
 * Build the daily spiral config. `stars` is snapped to the preset step (a
 * multiple of 20 within `RANGES`) so it always matches a real preset knob.
 */
export function dailyConfig(rng: () => number): GalaxyConfig {
  const starsStep = RANGES.stars.step;
  const starsMin = RANGES.stars.min;
  const stars = starsMin + starsStep * Math.floor(rng() * ((RANGES.stars.max - starsMin) / starsStep + 1));
  return {
    theme: pick(rng, THEME_KEYS),
    arms: 1 + Math.floor(rng() * 8),
    rpm: 1 + Math.floor(rng() * 20),
    stars,
  };
}

/** A small catalogue of concrete, on-brand daily challenges. */
const PROMPTS: DailyPrompt[] = [
  { text: "A barred spiral with a warm ember core and heavy dust lanes.", tag: "Daily challenge" },
  { text: "Twin symmetric arms, cool azure palette, a quiet sky.", tag: "Daily challenge" },
  { text: "A single dense arm winding through an aurora nebula.", tag: "Daily challenge" },
  { text: "A compact, high-rpm nucleus in silver monochrome.", tag: "Daily challenge" },
  { text: "Five loose arms, dawn palette, a thin comet trail.", tag: "Daily challenge" },
  { text: "A sparse, low-rpm spiral with a scattering of variable stars.", tag: "Daily challenge" },
  { text: "A bold three-arm spiral, violet, seen face-on.", tag: "Daily challenge" },
  { text: "A warped, off-centre arm in ember with a deep depth layer.", tag: "Daily challenge" },
];

/** The daily creative-prompt constraint for a given day. */
export function dailyPrompt(day: string): DailyPrompt {
  return PROMPTS[Math.floor(hashSeed(day + ":prompt") % PROMPTS.length)];
}

/**
 * The full daily galaxy for a day: a spiral config, a subset of active layers,
 * a creative constraint, and a human-readable label. Pass a `Date` (or nothing
 * for today).
 */
export function galaxyOfDay(date: Date = new Date()): DailyGalaxy {
  const day = dayKey(date);
  const rng = rngForDay(day);
  const config = dailyConfig(rng);
  const recipe = { ...DEFAULT_RECIPE };
  for (const key of pickLayers(rng)) recipe[key] = true;
  const prompt = dailyPrompt(day);
  const label = describeGalaxyOfDay(config, recipe);
  return { config, recipe, prompt, label };
}

/**
 * A human-readable summary of a daily galaxy, e.g.
 * "Ember · 4 arms · 8rpm · Nebula, Comet". Mirrors `describeConfig` and
 * `describeRecipe` so the label reads as one line.
 */
export function describeGalaxyOfDay(config: GalaxyConfig, recipe: GalaxyRecipe): string {
  const themeLabel = THEMES[config.theme]?.label ?? config.theme;
  const parts = [`${themeLabel} · ${config.arms} arms · ${config.rpm}rpm`];
  const onLayers = LAYER_KEYS.filter((k) => recipe[k]);
  if (onLayers.length) parts.push(onLayers.join(", "));
  return parts.join(" · ");
}

/**
 * The shareable deep link for a daily galaxy. Combines the spiral config and
 * the active layers into one relative URL that re-hydrates the exact galaxy
 * (see `lib/recipe.ts` and `lib/galaxyPresets.ts`). Everyone who opens this
 * link on the same day sees the same galaxy.
 */
export function dailyDeepLink(day: string): string {
  const { config, recipe } = galaxyOfDay(new Date(day + "T00:00:00"));
  const params = new URLSearchParams();
  params.set("theme", config.theme);
  params.set("arms", String(config.arms));
  params.set("rpm", String(config.rpm));
  params.set("stars", String(config.stars));
  LAYER_KEYS.forEach((key) => {
    if (recipe[key]) params.set(RECIPE_PARAMS[key === "zoomMode" ? "zoom" : key], "on");
  });
  const query = params.toString();
  return `/?${query}`;
}
