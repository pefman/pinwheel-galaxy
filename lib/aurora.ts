/**
 * Aurora — a northern-lights sky layer for the interactive starfield.
 *
 * A real night sky has more than stars: a faint, drifting atmospheric glow
 * near the horizon. Aurora borrows the look of the earth's northern lights and
 * paints a handful of soft, wavy ribbons across the upper sky of the galaxy.
 * Each ribbon is a filled band whose top edge waves on layered sines; the
 * ribbons drift slowly and sway with the gravity well, so the sky feels like
 * live weather rather than a looped animation.
 *
 * Everything here is a pure, deterministic function of the star count and a
 * seed, so the sky keeps its shape between frames and reloads — the same
 * galaxy always shows the same aurora. This module is side-effect free and unit
 * test friendly, mirroring `nebula` / `shootingStars`.
 *
 * The effect is **off by default** (`auroraMode` off ⇒ nothing is drawn),
 * purely additive and orthogonal to gravity, warp, nebula, constellations,
 * meteors, variable stars, Stellar Depth, zoom and the comet — none of them
 * read this. It is painted *behind* the stars (like nebula and meteors) so the
 * interactive galaxy stays in the foreground.
 */

/** Seed for the deterministic per-band assignment (stable across reloads). */
export const AURORA_SEED = 7;

/** Number of ribbons drawn. */
export const AURORA_BANDS = 5;

/** Ribbons occupy roughly the top half of the sky (fraction of height). */
export const AURORA_HEIGHT_FRACTION = 0.55;

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

/** A single aurora ribbon, fully described by static geometry. */
export interface AuroraBand {
  /** Resting top-edge height, as a fraction of the sky height (0..1). */
  baseY: number;
  /** Wave amplitude, as a fraction of the sky height. */
  amplitude: number;
  /** Wavelength of the primary wave, in px. */
  wavelength: number;
  /** Phase offset of the primary wave (0..1). */
  phase: number;
  /** Speed factor for the primary wave (how fast it drifts). */
  speed: number;
  /** Wavelength of the secondary (finer) wave, in px. */
  secondaryWavelength: number;
  /** Phase offset of the secondary wave (0..1). */
  secondaryPhase: number;
  /** Hue for this band, drawn from the active theme. */
  hue: number;
  /** Saturation of this band (percent). */
  saturation: number;
  /** Base lightness of this band (percent). */
  lightness: number;
  /** Base opacity (0..1). */
  alpha: number;
}

/**
 * Compute the static aurora-band geometry for a sky of the given size and
 * theme hues. Deterministic: the same (seed, hue set) always yields the same
 * bands. Band geometry does not depend on time — time is applied at draw time
 * via {@link auroraEdgeY}.
 */
export function computeAuroraBands({
  height,
  hues,
  bandCount = AURORA_BANDS,
  seed = AURORA_SEED,
}: {
  height: number;
  hues: number[];
  bandCount?: number;
  seed?: number;
}): AuroraBand[] {
  const rng = seedRng(seed);
  const usable = Math.max(1, hues.length);
  const bands: AuroraBand[] = [];
  for (let i = 0; i < bandCount; i++) {
    // Spread the bands across the upper `AURORA_HEIGHT_FRACTION` of the sky.
    const spread = AURORA_HEIGHT_FRACTION;
    const baseY = 0.06 + (i / bandCount) * spread + (rng() - 0.5) * 0.04;
    bands.push({
      baseY,
      amplitude: 0.03 + rng() * 0.045,
      wavelength: 220 + rng() * 260,
      phase: rng(),
      speed: 0.5 + rng() * 0.7,
      secondaryWavelength: 120 + rng() * 140,
      secondaryPhase: rng(),
      hue: hues[i % usable] ?? hues[0] ?? 150,
      saturation: 68 + rng() * 22,
      lightness: 56 + rng() * 14,
      alpha: 0.1 + rng() * 0.12,
    });
  }
  return bands;
}

/**
 * The vertical position (px from the top) of a band's top edge at horizontal
 * position `x`, given the running `time` (seconds) and an optional horizontal
 * `sway` offset in px (the gravity-well influence, already sign-adjusted).
 *
 * The edge is two layered sines (a primary wave plus a finer secondary) so the
 * ribbon reads as organic rather than metronomic. Returns a value near the
 * band's resting `baseY * height`.
 */
export function auroraEdgeY(
  band: AuroraBand,
  x: number,
  width: number,
  height: number,
  time: number,
  sway = 0,
): number {
  const nx = x / Math.max(1, width);
  const primary =
    Math.sin(nx * (Math.PI * 2 * width) / band.wavelength + (band.phase * Math.PI * 2) + time * band.speed) *
    band.amplitude * height;
  const secondary =
    Math.sin(nx * (Math.PI * 2 * width) / band.secondaryWavelength + band.secondaryPhase * Math.PI * 2 - time * band.speed * 0.6) *
    (band.amplitude * height) *
    0.4;
  return band.baseY * height + primary + secondary + sway;
}

/** The number of horizontal samples used to rasterise a ribbon's top edge. */
export const AURORA_SAMPLES = 96;

/**
 * Rasterise a band's top edge into a list of (x, y) points for drawing. `x`
 * steps evenly across the width; `sway` is the gravity-well offset in px.
 */
export function auroraEdgePoints(
  band: AuroraBand,
  width: number,
  height: number,
  time: number,
  sway = 0,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= AURORA_SAMPLES; i++) {
    const x = (i / AURORA_SAMPLES) * width;
    pts.push([x, auroraEdgeY(band, x, width, height, time, sway)]);
  }
  return pts;
}
