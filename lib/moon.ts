/**
 * Lunar Transit — a slow-drifting moon with a real wax/wane cycle.
 *
 * Every other sky layer is either a field of stars or a soft atmospheric glow.
 * Lunar Transit adds the one thing a real night sky is missing: a single,
 * recognisable body. A moon drifts slowly across the sky on its own clock and
 * waxes and wanes through a full cycle, so the sky has a second, *slow*
 * protagonist to complement the fast, cursor-driven starfield.
 *
 * Everything here is a pure, deterministic function of the running `time`
 * (ms) and the sky size, so the moon keeps its shape between frames and its
 * drift is smooth rather than jittery. The phase geometry (the terminator is a
 * true half-ellipse) is exposed so it can be unit-tested without a canvas.
 *
 * The effect is **off by default** (`moonMode` off ⇒ nothing is drawn), purely
 * additive and orthogonal to gravity, warp, nebula, constellations, meteors,
 * variable stars, Stellar Depth, zoom, the comet and the aurora — none of them
 * read this. It is painted *behind* the stars (like nebula, meteors and the
 * aurora) so the interactive galaxy stays in the foreground.
 */

/** Seed for the deterministic per-crater assignment (stable across reloads). */
export const MOON_SEED = 19;

/** How long a single sky-crossing takes (ms). A slow, meditative drift. */
export const MOON_TRANSIT_MS = 240_000;

/** How long a full wax→full→wax phase cycle takes (ms). */
export const MOON_MONTH_MS = 240_000;

/** The moon's radius as a fraction of the smaller sky dimension. */
export const MOON_RADIUS_FRACTION = 0.09;

/** Clamp the moon's radius to a comfortable on-screen range (px). */
export const MOON_RADIUS_MIN = 26;
export const MOON_RADIUS_MAX = 84;

/** Number of craters carved into the moon surface. */
export const MOON_CRATERS = 7;

/** Craters occupy this fraction of the moon's radius from the centre. */
export const MOON_CRATER_BAND = 0.82;

/**
 * mulberry32 — a tiny, fast, deterministic PRNG. Given the same seed it
 * produces the same sequence, so the sky is reproducible. (Not
 * cryptographically safe, which is exactly what we want here.)
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A single crater, expressed in local (normalised) moon coordinates. */
export interface MoonCrater {
  /** Local x of the crater centre, in [-1, 1]. */
  dx: number;
  /** Local y of the crater centre, in [-1, 1]. */
  dy: number;
  /** Local radius of the crater, in [0, 1] (fraction of the moon radius). */
  r: number;
  /** Darkening alpha applied to the surface under the crater (0..1). */
  a: number;
}

/** The full, static description of the moon at a given instant. */
export interface MoonState {
  /** Center x, in px. */
  x: number;
  /** Center y, in px. */
  y: number;
  /** Radius, in px. */
  radius: number;
  /** Craters in local coordinates. */
  craters: MoonCrater[];
  /** Lit fraction, 0 (new moon, fully dark) … 1 (full moon, fully lit). */
  litFraction: number;
  /**
   * Which hemisphere is lit. +1 ⇒ the right hemisphere (waxing, right-lit),
   * -1 ⇒ the left hemisphere (waning, left-lit). Drives the draw-time mirror.
   */
  litSide: 1 | -1;
}

/**
 * Compute the moon's state for a given running `time` (ms) in a sky of the
 * given size. Deterministic: the same (time, size) always yields the same
 * state. The position drifts across the sky on the transit clock and the phase
 * evolves on the month clock; both are independent, so a waxing moon can be
 * anywhere on its arc.
 */
export function computeMoon({
  time,
  width,
  height,
  seed = MOON_SEED,
}: {
  time: number;
  width: number;
  height: number;
  seed?: number;
}): MoonState {
  // Drift: 0 (just risen, left edge) … 1 (set, right edge).
  const t = (time % MOON_TRANSIT_MS) / MOON_TRANSIT_MS;
  const margin = 32;
  const radius = Math.min(
    MOON_RADIUS_MAX,
    Math.max(MOON_RADIUS_MIN, Math.min(width, height) * MOON_RADIUS_FRACTION),
  );

  // A gentle arc: the moon starts and ends a little higher and dips near the
  // middle, so its path reads as a slow curve rather than a straight line.
  const baseY = height * 0.26;
  const dip = height * 0.045;
  const x = lerp(margin, width - margin, t);
  const y = baseY + Math.sin(t * Math.PI) * dip;

  // Phase: a cosine of the month clock, 1 (full) at the start, 0 (new) at the
  // halfway point, back to 1 (full) at the end.
  const monthT = (time % MOON_MONTH_MS) / MOON_MONTH_MS;
  const litFraction = 0.5 + 0.5 * Math.cos(monthT * Math.PI * 2);
  // Waxing (fraction growing) ⇒ lit on the right; waning ⇒ lit on the left.
  const litSide: 1 | -1 = monthT < 0.5 ? -1 : 1;

  // Craters, deterministic from the seed, confined to a disc of radius
  // MOON_CRATER_BAND so none spill past the limb.
  const rng = seedRng(seed);
  const craters: MoonCrater[] = [];
  for (let i = 0; i < MOON_CRATERS; i++) {
    let dx = (rng() * 2 - 1) * MOON_CRATER_BAND;
    let dy = (rng() * 2 - 1) * MOON_CRATER_BAND;
    const dist = Math.hypot(dx, dy);
    if (dist > MOON_CRATER_BAND) {
      // Reject and retry (a handful of samples is plenty).
      dx *= MOON_CRATER_BAND / dist;
      dy *= MOON_CRATER_BAND / dist;
    }
    craters.push({
      dx,
      dy,
      r: 0.06 + rng() * 0.16,
      a: 0.06 + rng() * 0.1,
    });
  }

  return { x, y, radius, craters, litFraction, litSide };
}

/**
 * The lit fraction mapped to a short human label, e.g. "Full", "Waxing
 * Gibbous", "First Quarter", "Waxing Crescent", "New".
 */
export function describeMoonPhase(litFraction: number): string {
  const f = Math.max(0, Math.min(1, litFraction));
  if (f > 0.92) return "Full";
  if (f > 0.72) return "Waxing Gibbous";
  if (f > 0.48) return "Quarter";
  if (f > 0.22) return "Waxing Crescent";
  return "New";
}

/**
 * The x-extent (px) of the moon's terminator ellipse at a given lit fraction.
 *
 * The terminator — the curve separating the lit and dark hemispheres — is a
 * true half-ellipse whose semi-minor axis is `radius * |cos(π · litFraction)|`.
 * Its signed value (returned here) is positive when it bulges toward the lit
 * (+x) side and negative when it bulges the other way. It is 0 at quarter
 * phase (a straight terminator) and ±radius at full / new moon.
 *
 * Callers build the lit region as: a semicircle of `radius` on the lit limb,
 * closed by this terminator ellipse — see the draw code in StarField.
 */
export function terminatorXRadius(radius: number, litFraction: number): number {
  // The terminator is a true half-ellipse whose signed semi-minor axis is
  // `radius * (1 - 2 · litFraction)`. This is the exact relationship that makes
  // the drawn lit area equal `litFraction` of the disk: 0 at new moon (+r),
  // straight (0) at quarter, and -radius at full moon.
  return radius * (1 - 2 * litFraction);
}
