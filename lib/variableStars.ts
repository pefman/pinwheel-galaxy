/**
 * Variable Stars — a living-sky enrichment for the interactive starfield.
 *
 * A real night sky is not static: a fraction of stars brighten and dim on
 * their own slow light curves (Cepheid-style sinusoids with an individual
 * period and phase), and a small handful are giants — visibly larger and
 * softer. Variable Stars borrows that idea and applies it to the galaxy:
 *   - ~`VARIABLE_FRAC` of stars are "variable": their brightness oscillates
 *     gently around 1.0 with a per-star period, phase and amplitude. The rest
 *     hold a steady brightness.
 *   - ~`GIANT_FRAC` of stars are "giants": they are drawn larger and softer,
 *     and they always breathe on a slower, deeper light curve (giants are a
 *     subset of the stars that vary).
 *
 * Everything here is a pure, deterministic function of the star index and a
 * seed, so the sky keeps its shape between frames and reloads — the same star
 * is always the same variable star. This module is side-effect free and unit
 * test friendly.
 *
 * The effect is **off by default** (`variableMode` off ⇒ every multiplier is
 * exactly 1), purely additive and orthogonal to gravity, warp, nebula,
 * constellations, meteors, zoom and Stellar Depth — none of them read this.
 */

/** Seed for the deterministic per-star assignment (stable across reloads). */
export const VARIABLE_SEED = 42;

/** Fraction of stars that brighten/dim on their own light curve. */
export const VARIABLE_FRAC = 0.3;
/** Fraction of stars that are giants (larger, softer, and also variable). */
export const GIANT_FRAC = 0.07;

/** Light-curve period bounds, in seconds (real variable stars swing over
 * seconds-to-days; here we compress to something visible in a browser). */
export const MIN_PERIOD = 2.5;
export const MAX_PERIOD = 14;

/** How far brightness swings, as a fraction of 1.0 (so 0.4 ⇒ 0.6…1.4). */
export const MIN_AMPLITUDE = 0.12;
export const MAX_AMPLITUDE = 0.45;

/** Multiplier applied to a giant star's drawn radius. */
export const GIANT_SIZE = 2.4;

export interface VariableStar {
  /** Seconds for one full brightness cycle. */
  period: number;
  /** Initial phase in [0, 1). */
  phase: number;
  /** Brightness swing as a fraction of 1.0. */
  amplitude: number;
  /** Giants are drawn larger and softer; they always breathe. */
  isGiant: boolean;
  /** Whether this star's brightness oscillates at all (vs. holding steady). */
  isVariable: boolean;
}

/**
 * mulberry32 — a tiny, fast, deterministic PRNG. Given the same seed it
 * produces the same sequence, so the sky is reproducible. (Not cryptographically
 * safe, which is exactly what we want here.)
 */
function seedRng(seed: number): () => number {
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
 * Assign a stable variable-star profile to every star for a given count and
 * seed. Deterministic: the same (count, seed) always yields the same array.
 */
export function assignVariableStars(
  starCount: number,
  seed: number,
): VariableStar[] {
  const rng = seedRng(seed);
  const out: VariableStar[] = [];
  for (let i = 0; i < starCount; i++) {
    // Giants are rarer than plain variables; they win the slot first so a
    // giant is never accidentally counted as only a "regular" variable.
    // Giants always breathe (isVariable); the rest vary with probability
    // VARIABLE_FRAC.
    const isGiant = rng() < GIANT_FRAC;
    const isVariable = isGiant || rng() < VARIABLE_FRAC;
    // All periods stay within [MIN_PERIOD, MAX_PERIOD]; giants read as more
    // dramatic via their larger amplitude rather than a longer period.
    const period = MIN_PERIOD + rng() * (MAX_PERIOD - MIN_PERIOD);
    const baseAmp =
      MIN_AMPLITUDE + rng() * (MAX_AMPLITUDE - MIN_AMPLITUDE);
    const amplitude = Math.min(
      baseAmp * (isGiant ? 1.3 : 1),
      MAX_AMPLITUDE,
    );
    out.push({
      period,
      phase: rng(),
      amplitude,
      isGiant,
      isVariable,
    });
  }
  return out;
}

/**
 * The brightness multiplier for a variable star at time `t` (seconds).
 * Returns a value in `[1 - amplitude, 1 + amplitude]` — a smooth, symmetric
 * sinusoid so the star never drops to black or blows out to white.
 */
export function variableBrightness(
  phase: number,
  t: number,
  period: number,
  amplitude: number,
): number {
  if (period <= 0 || amplitude <= 0) return 1;
  const p = ((t / period) + phase) % 1;
  return 1 + amplitude * Math.sin(p * Math.PI * 2);
}

/**
 * The brightness multiplier for a star at time `t`: steady (1) unless the
 * star is a variable, in which case its light curve applies.
 */
export function variableAlpha(v: VariableStar, t: number): number {
  return v.isVariable
    ? variableBrightness(v.phase, t, v.period, v.amplitude)
    : 1;
}

/** The per-star size multiplier: giants are drawn larger, others unchanged. */
export function variableSize(v: VariableStar): number {
  return v.isGiant ? GIANT_SIZE : 1;
}
