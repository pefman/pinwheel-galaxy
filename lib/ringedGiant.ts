/**
 * Ringed Giant — a drifting, ringed gas giant.
 *
 * Every sky body already shipped is either a field of stars (Gravity Well,
 * Stellar Depth, Variable Stars, the distant galaxy's field) or a single soft
 * glow / atmosphere (nebula, aurora, comet tail) or a lit sphere (the moon) or
 * an extreme body (the black hole). The Ringed Giant adds a *new object class*:
 * a gas giant with a real, tilted, particle-built ring system — the kind of
 * world popularised by Saturn-style backgrounds and the wave of browser-based
 * universe explorers.
 *
 * A single ringed giant drifts slowly across the sky on its own clock and its
 * rings spin (inner particles racing its outer ones, as Kepler's third law
 * dictates), so the sky gains a slow, majestic, recognisable body to sit among
 * the moon, distant galaxy and black hole. Pure atmosphere, off by default, and
 * fully orthogonal to gravity, warp, nebula, constellations, meteors, variable
 * stars, Stellar Depth, zoom, the comet, the aurora, the moon, supernovae and
 * the black hole — none of them read this. It is painted *behind* the stars
 * (like the moon, supernova and distant galaxy) so the interactive galaxy stays
 * in the foreground.
 *
 * Everything here is a pure, deterministic function of the running `time`
 * (ms) and the sky size, so the giant keeps its shape between frames, its rings
 * spin smoothly, and its palette / placement is reproducible. The ring
 * projection geometry (the 3D tilt that decides which particles sit in front
 * of, and which behind, the planet) is exposed as plain numbers so the whole
 * behaviour is unit-tested without a canvas.
 */

/** Seed for the deterministic placement, bands, palette and ring field. */
export const RINGED_GIANT_SEED = 3;

/** How long a single sky-crossing takes (ms). A slow, meditative drift. */
export const RINGED_GIANT_TRANSIT_MS = 320_000;

/** How long the giant's radius is as a fraction of the smaller sky dimension. */
export const RINGED_GIANT_RADIUS_FRACTION = 0.11;

/** Clamp the giant's radius to a comfortable on-screen range (px). */
export const RINGED_GIANT_RADIUS_MIN = 34;
export const RINGED_GIANT_RADIUS_MAX = 120;

/** How the ring's inner particles orbit faster than its outer ones (Kepler). */
export const RINGED_GIANT_KELPER_EXPONENT = -1.5;

/** Reference rotation period (ms) for the outermost ring particles. */
export const RINGED_GIANT_PERIOD_MS = 48_000;

/** Inner ring radius as a fraction of the planet radius. */
export const RING_INNER_RATIO = 1.28;
/** Outer ring radius as a fraction of the planet radius. */
export const RING_OUTER_RATIO = 2.18;
/** Number of particles that build the ring. */
export const RING_PARTICLES = 1000;
/** How many atmospheric bands wrap the gas giant. */
export const RINGED_GIANT_BANDS = 8;

/** A single atmospheric band on the gas giant's disk (local y + colour). */
export interface RingedGiantBand {
  /** Centre of the band, in local normalised coordinates (−1…1, y up). */
  y: number;
  /** Half-width of the band, as a fraction of the planet radius. */
  halfWidth: number;
  /** Hex colour of the band. */
  color: string;
  /** Alpha of the band (0…1). */
  alpha: number;
}

/** A single ring particle's static geometry (precomputed from the seed). */
export interface RingParticle {
  /** Orbital radius as a fraction of the planet radius (inner…outer). */
  r: number;
  /** Base orbital angle (radians) around the planet. */
  baseAngle: number;
  /**
   * Angular rate multiplier so inner particles orbit faster than outer ones
   * (Kepler's third law). The live angle is `baseAngle + rate · elapsedMs`.
   */
  rate: number;
  /** Per-particle brightness 0…1. */
  bright: number;
}

/** The full ring, built once from the seed. */
export interface RingedGiantRing {
  /** Tilt of the ring plane from the horizon (radians). 0 ⇒ flat on the horizon. */
  tilt: number;
  /** Inner radius ratio (× planet radius). */
  innerRatio: number;
  /** Outer radius ratio (× planet radius). */
  outerRatio: number;
  /** The orbiting particles. */
  particles: RingParticle[];
  /** Hex colour of the ring particles. */
  color: string;
  /** Ring alpha (0…1). */
  alpha: number;
}

/** The full, static description of the ringed giant at a given instant. */
export interface RingedGiantState {
  /** Center x, in px. */
  x: number;
  /** Center y, in px. */
  y: number;
  /** Radius, in px. */
  radius: number;
  /** Atmospheric bands wrapped across the disk. */
  bands: RingedGiantBand[];
  /** The tilted, particle-built ring system. */
  ring: RingedGiantRing;
  /**
   * Direction (radians) of the illuminating sun, used by the draw code to place
   * the highlight on the lit limb. +x is right, +y is down.
   */
  sunAngle: number;
}

/**
 * A few warm / cool gas-giant palettes. One is chosen deterministically from
 * the seed, so the same link always shows the same giant.
 */
const PALETTES: string[][] = [
  // Amber Saturn — warm golds and corals.
  ["#f6c667", "#eaa84a", "#f3d98b", "#d98a3a", "#fbe0a0", "#c9762e"],
  // Coral — pink-to-orange warmth.
  ["#ff9a8b", "#ff7a74", "#ffb4a0", "#f56a6a", "#ffc4b0", "#e84b58"],
  // Azure — an uncommon cool blue gas giant.
  ["#7ec8ff", "#4fa8f0", "#a6dcff", "#3d8bd6", "#c2e8ff", "#2f6fb8"],
  // Violet — deep purple world.
  ["#c79bff", "#a46bff", "#e0c4ff", "#8a4bd6", "#efd4ff", "#6b2fb8"],
];

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

/**
 * Compute the ringed giant's state for a given running `time` (ms) in a sky of
 * the given size. Deterministic: the same (time, size) always yields the same
 * state. The giant drifts across the sky on the transit clock; its palette,
 * bands and ring field are fixed per seed.
 */
export function computeRingedGiant({
  time,
  width,
  height,
  seed = RINGED_GIANT_SEED,
}: {
  time: number;
  width: number;
  height: number;
  seed?: number;
}): RingedGiantState {
  // Drift: 0 (just risen, left edge) … 1 (set, right edge).
  const t = (time % RINGED_GIANT_TRANSIT_MS) / RINGED_GIANT_TRANSIT_MS;
  const margin = 40;
  const radius = Math.max(
    RINGED_GIANT_RADIUS_MIN,
    Math.min(
      RINGED_GIANT_RADIUS_MAX,
      Math.min(width, height) * RINGED_GIANT_RADIUS_FRACTION,
    ),
  );

  // A gentle arc: it starts and ends a little higher and dips near the middle.
  const baseY = height * 0.24;
  const dip = height * 0.05;
  const x = lerp(margin, width - margin, t);
  const y = baseY + Math.sin(t * Math.PI) * dip;

  // Palette, chosen from the seed.
  const palette = PALETTES[seed % PALETTES.length];

  // Atmospheric bands: horizontal stripes clipped to the disk. Slightly fewer,
  // wider near the equator (the spherical bulge) and narrower toward the poles.
  const bands: RingedGiantBand[] = [];
  const rng = seedRng(seed ^ 0x9e3779b9);
  const bandCount = RINGED_GIANT_BANDS;
  for (let i = 0; i < bandCount; i++) {
    const pos = i / bandCount; // 0…1 up the disk
    const yCenter = pos * 2 - 1; // −1…1
    // Squish bands near the poles so they hug the sphere's curvature.
    const polarSquash = 1 - 0.45 * Math.abs(yCenter);
    bands.push({
      y: yCenter,
      halfWidth: (0.06 + rng() * 0.09) * polarSquash,
      color: palette[Math.floor(rng() * palette.length)],
      alpha: 0.5 + rng() * 0.4,
    });
  }

  // Ring: a tilt, plus a field of orbiting particles from inner to outer radius.
  const tilt = 0.32 + rng() * 0.34; // ~18°–37° from the horizon
  const particles: RingParticle[] = [];
  for (let i = 0; i < RING_PARTICLES; i++) {
    const r = lerp(RING_INNER_RATIO, RING_OUTER_RATIO, i / RING_PARTICLES);
    // Kepler: angular rate falls off as r^-1.5 (inner particles race).
    const rate = Math.pow(r, RINGED_GIANT_KELPER_EXPONENT);
    particles.push({
      r,
      baseAngle: rng() * Math.PI * 2,
      rate,
      bright: 0.55 + rng() * 0.45,
    });
  }

  return {
    x,
    y,
    radius,
    bands,
    ring: {
      tilt,
      innerRatio: RING_INNER_RATIO,
      outerRatio: RING_OUTER_RATIO,
      particles,
      color: palette[0],
      alpha: 0.85,
    },
    sunAngle: -Math.PI * 0.75, // lit from upper-left
  };
}

/**
 * Project a ring particle onto the tilted sky plane, returning its screen-space
 * offset from the planet centre (dx, dy, in px) and whether it sits on the far
 * side of the ring plane (`behind`, i.e. behind the planet and so occluded by
 * the opaque disk).
 *
 * A particle orbits at radius `r · radius` in the ring plane. Tilting the plane
 * about the planet's x-axis by `tilt` squashes the vertical axis by
 * `cos(tilt)` and pushes depth by `sin(tilt)`: particles with a positive
 * in-plane y are in front of the planet, negative ones behind. This is what
 * lets the draw code render the back rings, then the planet, then the front
 * rings — the correct occlusion order for a ringed world.
 */
export function projectRingParticle(
  radiusPx: number,
  rRatio: number,
  angle: number,
  tilt: number,
): { dx: number; dy: number; behind: boolean } {
  const rPx = radiusPx * rRatio;
  const px = rPx * Math.cos(angle);
  const py = rPx * Math.sin(angle);
  const dy = py * Math.cos(tilt);
  const behind = py < 0;
  return { dx: px, dy, behind };
}

/**
 * The live orbital angle (radians) of a particle after `elapsedMs` have passed
 * since the giant was computed. Inner particles (higher `rate`) turn faster.
 */
export function particleAngleAt(
  particle: RingParticle,
  elapsedMs: number,
): number {
  return particle.baseAngle + (particle.rate / RINGED_GIANT_PERIOD_MS) * elapsedMs * Math.PI * 2;
}

/**
 * The lit-fraction-independent name of a giant, for accessibility labels.
 */
export function describeRingedGiant(bands: RingedGiantBand[]): string {
  return `Ringed giant · ${bands.length} bands`;
}
