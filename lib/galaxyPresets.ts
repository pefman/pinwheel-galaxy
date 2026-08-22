/**
 * Galaxy Presets — the "shareable galaxy" configuration system.
 *
 * The Gravity Well starfield can be configured through four knobs:
 *   - theme      : the colour palette (a set of hues)
 *   - arms       : how many spiral arms the galaxy has
 *   - rpm        : rotation speed (rotations per minute)
 *   - stars      : how many stars are rendered
 *
 * Every combination is expressible as URL search params, e.g.
 *   ?theme=aurora&arms=5&rpm=9&stars=400
 *
 * …which makes any galaxy **deep-linkable and shareable**: copy the URL and
 * someone else sees the exact same galaxy. A random "Shuffle" generator can
 * produce a fresh galaxy and write its URL so it can be shared in one shot.
 *
 * This module is intentionally side-effect free and unit-test friendly.
 */

export interface GalaxyConfig {
  theme: string;
  arms: number;
  rpm: number;
  stars: number;
}

export interface GalaxyTheme {
  key: string;
  label: string;
  /** Hues (deg) drawn from, in order of preference for arm variation. */
  hues: number[];
  /** A representative gradient used for the dock's swatch. */
  gradient: string;
}

/**
 * The hue range a theme maps onto. StarField turns a theme into a
 * `hues: number[]` array; we store the endpoints here and interpolate.
 */
export interface HueRange {
  from: number;
  to: number;
}

export const THEMES: Record<string, GalaxyTheme> = {
  violet: {
    key: "violet",
    label: "Violet Spiral",
    hues: [260, 300, 190],
    gradient: "from-[#7c3aed] via-[#c465ff] to-[#67e8f9]",
  },
  aurora: {
    key: "aurora",
    label: "Aurora",
    hues: [130, 175, 285],
    gradient: "from-[#34d399] via-[#22d3ee] to-[#a78bfa]",
  },
  ember: {
    key: "ember",
    label: "Ember",
    hues: [20, 340, 280],
    gradient: "from-[#fb923c] via-[#f472b6] to-[#c4b5fd]",
  },
  azure: {
    key: "azure",
    label: "Azure",
    hues: [190, 220, 265],
    gradient: "from-[#22d3ee] via-[#60a5fa] to-[#818cf8]",
  },
  monochrome: {
    key: "monochrome",
    label: "Silver",
    hues: [220, 220],
    gradient: "from-[#e5e7eb] via-[#9ca3af] to-[#6b7280]",
  },
};

export const DEFAULT_CONFIG: GalaxyConfig = {
  theme: "violet",
  arms: 3,
  rpm: 6,
  stars: 320,
};

export const RANGES = {
  arms: { min: 1, max: 8, step: 1 },
  rpm: { min: 1, max: 20, step: 1 },
  stars: { min: 120, max: 640, step: 20 },
} as const;

export function isValidConfig(c: Partial<GalaxyConfig>): c is GalaxyConfig {
  const arms = Number(c.arms);
  const rpm = Number(c.rpm);
  const stars = Number(c.stars);
  return (
    typeof c.theme === "string" &&
    THEME_KEYS.includes(c.theme) &&
    Number.isInteger(arms) &&
    arms >= RANGES.arms.min &&
    arms <= RANGES.arms.max &&
    Number.isInteger(rpm) &&
    rpm >= RANGES.rpm.min &&
    rpm <= RANGES.rpm.max &&
    Number.isInteger(stars) &&
    stars >= RANGES.stars.min &&
    stars <= RANGES.stars.max
  );
}

/** Merge a partial (parsed from URL) over the defaults, ignoring junk values. */
export function resolveConfig(partial: Partial<GalaxyConfig>): GalaxyConfig {
  const merged: GalaxyConfig = {
    theme: THEME_KEYS.includes(partial.theme as string) ? (partial.theme as string) : DEFAULT_CONFIG.theme,
    arms: clampInt(partial.arms, DEFAULT_CONFIG.arms),
    rpm: clampInt(partial.rpm, DEFAULT_CONFIG.rpm),
    stars: clampInt(partial.stars, DEFAULT_CONFIG.stars),
  };
  return isValidConfig(merged) ? merged : DEFAULT_CONFIG;
}

function clampInt(v: unknown, def: number): number {
  if (typeof v !== "number" || !Number.isInteger(v)) return def;
  return v;
}

export const THEME_KEYS = Object.keys(THEMES);

/**
 * Parse `?theme=&arms=&rpm=&stars=` from a URLSearchParams into a config.
 * Missing / invalid values fall back to defaults (never throws).
 */
export function parseConfigFromParams(params: URLSearchParams): GalaxyConfig {
  return resolveConfig({
    theme: params.get("theme") ?? undefined,
    arms: Number(params.get("arms")),
    rpm: Number(params.get("rpm")),
    stars: Number(params.get("stars")),
  });
}

/** Build a URLSearchParams string for a config (used for sharing). */
export function configToParams(config: GalaxyConfig): URLSearchParams {
  const p = new URLSearchParams();
  p.set("theme", config.theme);
  p.set("arms", String(config.arms));
  p.set("rpm", String(config.rpm));
  p.set("stars", String(config.stars));
  return p;
}

/** A fully-random galaxy. Good for the "Shuffle" button. */
export function shuffleConfig(): GalaxyConfig {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  return {
    theme: THEME_KEYS[rand(0, THEME_KEYS.length - 1)],
    arms: rand(RANGES.arms.min, RANGES.arms.max),
    rpm: rand(RANGES.rpm.min, RANGES.rpm.max),
    stars: rand(RANGES.stars.min, RANGES.stars.max),
  };
}

/** Human-readable label for a config, e.g. "Aurora · 5 arms · 9rpm". */
export function describeConfig(config: GalaxyConfig): string {
  const theme = THEMES[config.theme]?.label ?? config.theme;
  return `${theme} · ${config.arms} arms · ${config.rpm}rpm`;
}
