/**
 * Star Nurseries — H II star-formation regions riding the spiral arms.
 *
 * The Pinwheel Galaxy (M74), which this site is named after, is famous for the
 * rosy pink knots of gas that dot its spiral arms — H II regions, where
 * hydrogen clouds glow from the ultraviolet of the hot, freshly-born stars
 * embedded in them. This site already shows a star *dying* (Supernova) but
 * never a star *being born*: the starfield is static. Star Nurseries close
 * that gap.
 *
 * Seven seeded knots ride the same spiral-arm geometry the stars use. Each
 * region lives a slow, looping life (~26s, desynchronised per region):
 *   forming   — a dim rosy cloud gathers along the arm;
 *   birth     — it flares in a blue-white birth flash with an expanding shock
 *               ring as the embedded stars ignite;
 *   active    — the knot glows brightly, pulsing gently, dotted with blue-white
 *               newborn stars;
 *   settling  — the gas disperses; a faint remnant cluster lingers before the
 *               next generation gathers in the same spot.
 *
 * Like every other sky body, everything here is a pure, deterministic
 * function of the layer clock (ms), the sky size, the arm count, the galaxy's
 * current rotation angle and a seed — so the same link always shows the same
 * nurseries on the same schedule, and the whole behaviour is unit-tested
 * without a canvas. The knots rotate with the galaxy and live inside the
 * Galaxy Zoom transform, because they are part of the galaxy's disk.
 *
 * Off by default (`?nursery=on`); under reduced motion the clock is frozen so
 * the clouds hold a still, scattered state.
 */

/** Seed for the deterministic knot placement, palette and cycle offsets. */
export const NURSERY_SEED = 11;

/** How many H II regions ride the arms at once. */
export const NURSERY_REGION_COUNT = 7;

/** One full life cycle of a single region (ms). Regions are offset, so the
 * arms host knots in several phases at once — a wave of star birth. */
export const NURSERY_CYCLE_MS = 26_000;

/** Phase boundaries as a fraction of the cycle (u, 0..1). */
export const NURSERY_FORMING_END = 0.16;
export const NURSERY_BIRTH_END = 0.3;
export const NURSERY_ACTIVE_END = 0.82;

/** Where in the cycle the birth flash peaks (u). */
export const NURSERY_FLASH_AT = 0.22;
/** Gaussian sigma of the birth flash (u) — narrow, so it reads as an event. */
export const NURSERY_FLASH_SIGMA = 0.035;

/** The shock ring expands from the flash until this point of the cycle (u). */
export const NURSERY_SHELL_END = 0.55;
/** Peak alpha of the shock ring. */
export const NURSERY_SHELL_ALPHA = 0.55;

/** The newborn-star cluster starts fading to its remnant at this point (u). */
export const NURSERY_NEWBORN_FADE_START = 0.86;
/** The faint remnant cluster alpha a newborn cluster settles to. */
export const NURSERY_NEWBORN_REMNANT = 0.12;

/** Glow alphas at the key points of the cycle. */
export const NURSERY_GLOW_QUIET = 0.12;
export const NURSERY_GLOW_FORMING = 0.45;
export const NURSERY_GLOW_BIRTH_BUMP = 0.3;
export const NURSERY_GLOW_ACTIVE_WIGGLE = 0.16;

/** The spiral span of one arm (radians) — mirrors the starfield's `t * π * 2.2`
 * so the knots ride exactly where the stars are. */
export const NURSERY_ARM_SPAN = Math.PI * 2.2;

/** The four phases of a single region's life, in order. */
export type NurseryPhase = "forming" | "birth" | "active" | "settling";

/** A blue-white newborn star, as an offset (fraction of the knot radius) and a
 * point size (px at screen scale). */
export interface NewbornStar {
  /** Horizontal offset, in knot-radius units (−1..1). */
  ux: number;
  /** Vertical offset, in knot-radius units (−1..1). */
  uy: number;
  /** Point radius in px (drawn × the screen scale, like the stars). */
  size: number;
}

/** The static, seeded description of one region. */
export interface NurseryRegion {
  /** Region index, 0-based. */
  index: number;
  /** Which spiral arm the region rides (0-based). */
  arm: number;
  /** Position along the arm, 0 (core side) … 1 (rim). */
  t: number;
  /** Angular jitter within the arm band (radians). */
  jitter: number;
  /** Glow radius as a fraction of the smaller sky dimension. */
  radiusFraction: number;
  /** Rosy H II hue (degrees, ~328–354: red-pink to pink). */
  hue: number;
  /** Phase offset (ms) desynchronising this region's life cycle. */
  cycleOffset: number;
  /** Seeded phase of the active-glow wiggle (radians). */
  pulsePhase: number;
  /** The blue-white stars that ignite when this region goes through birth. */
  newborns: NewbornStar[];
}

/** The full, live description of one region at a given instant. */
export interface NurseryRegionState extends NurseryRegion {
  /** Center x, in px, in the current sky (rotates with the galaxy). */
  x: number;
  /** Center y, in px, in the current sky. */
  y: number;
  /** Current glow radius, in px (includes the life-cycle swell/shrink). */
  radius: number;
  /** Rosy glow alpha, 0…1. */
  glowAlpha: number;
  /** Birth-flash intensity, 0…1 (≈1 at the peak of the flash). */
  birthFlash: number;
  /** Expanding shock-ring radius, px (0 when no ring is visible). */
  shellRadius: number;
  /** Shock-ring alpha, 0…1. */
  shellAlpha: number;
  /** Newborn-cluster visibility, 0…1 (fades in after the flash). */
  newbornAlpha: number;
  /** Which phase of the life cycle the region is in. */
  phase: NurseryPhase;
}

export interface NurseryInput {
  /** The layer clock (ms), advanced by the starfield; frozen under reduced
   * motion, so the state is a pure function of whatever value it holds. */
  time: number;
  /** Sky width, px. */
  width: number;
  /** Sky height, px. */
  height: number;
  /** Number of spiral arms (the knots must re-ride the arms when it changes). */
  arms: number;
  /** The galaxy's current rotation (rad) — the knots orbit with it. */
  galaxyAngle: number;
  seed?: number;
}

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

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The cycle position u (0..1) of a region at a given time, with its seeded
 * phase offset applied. Deterministic and periodic.
 */
export function regionCycleU(region: NurseryRegion, time: number): number {
  return (
    (((time + region.cycleOffset) % NURSERY_CYCLE_MS) + NURSERY_CYCLE_MS) %
    NURSERY_CYCLE_MS
  ) / NURSERY_CYCLE_MS;
}

/** The phase label for a cycle position u (0..1). */
export function nurseryPhaseAt(u: number): NurseryPhase {
  if (u < NURSERY_FORMING_END) return "forming";
  if (u < NURSERY_BIRTH_END) return "birth";
  if (u < NURSERY_ACTIVE_END) return "active";
  return "settling";
}

/**
 * The rosy glow alpha (0..1) at a cycle position u. Continuous at every phase
 * boundary (and across the u=1→0 wrap): the quiet start equals the quiet end.
 */
export function glowAlphaAt(u: number, pulsePhase: number): number {
  if (u < NURSERY_FORMING_END) {
    // The cloud gathers: quiet → forming brightness.
    return lerp(NURSERY_GLOW_QUIET, NURSERY_GLOW_FORMING, u / NURSERY_FORMING_END);
  }
  if (u < NURSERY_BIRTH_END) {
    // A single smooth bump as the embedded stars light the cloud.
    const t = (u - NURSERY_FORMING_END) / (NURSERY_BIRTH_END - NURSERY_FORMING_END);
    return NURSERY_GLOW_FORMING + NURSERY_GLOW_BIRTH_BUMP * Math.sin(t * Math.PI);
  }
  if (u < NURSERY_ACTIVE_END) {
    // A gentle, seeded breathing; the sin(πt) envelope zeroes the wiggle at
    // both ends so it stays continuous with the birth and settling phases.
    const t = (u - NURSERY_BIRTH_END) / (NURSERY_ACTIVE_END - NURSERY_BIRTH_END);
    return (
      NURSERY_GLOW_FORMING +
      NURSERY_GLOW_ACTIVE_WIGGLE * Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + pulsePhase)
    );
  }
  // The gas disperses back to the quiet floor — which equals the forming
  // phase's starting alpha, so the loop wraps seamlessly.
  return lerp(NURSERY_GLOW_FORMING, NURSERY_GLOW_QUIET, (u - NURSERY_ACTIVE_END) / (1 - NURSERY_ACTIVE_END));
}

/**
 * The birth-flash intensity (0..1) at a cycle position u: a narrow Gaussian
 * centred on the flash instant. Far from the flash it is numerically 0.
 */
export function birthFlashAt(u: number): number {
  const d = u - NURSERY_FLASH_AT;
  return Math.exp(-(d * d) / (2 * NURSERY_FLASH_SIGMA * NURSERY_FLASH_SIGMA));
}

/**
 * The shock ring at a cycle position u: it appears at the flash and expands to
 * ~3× the knot radius while fading. Returns {shellRadius: 0, shellAlpha: 0}
 * outside the visible window.
 */
export function shellAt(u: number, baseRadiusPx: number): {
  shellRadius: number;
  shellAlpha: number;
} {
  if (u < NURSERY_FLASH_AT || u >= NURSERY_SHELL_END) {
    return { shellRadius: 0, shellAlpha: 0 };
  }
  const t = (u - NURSERY_FLASH_AT) / (NURSERY_SHELL_END - NURSERY_FLASH_AT);
  return {
    shellRadius: baseRadiusPx * (0.5 + t * 2.7),
    shellAlpha: NURSERY_SHELL_ALPHA * (1 - t),
  };
}

/**
 * How visible the newborn star cluster is at a cycle position u: the first
 * light appears just before the flash peaks (the stars ignite, then the shock
 * follows), ramping to 1 by the end of birth, holding, then fading to a faint
 * remnant as the gas disperses.
 */
export function newbornAlphaAt(u: number): number {
  const rampStart = NURSERY_FLASH_AT - 0.03;
  if (u < rampStart) return 0;
  if (u < NURSERY_BIRTH_END) {
    return (u - rampStart) / (NURSERY_BIRTH_END - rampStart);
  }
  if (u < NURSERY_NEWBORN_FADE_START) return 1;
  return lerp(1, NURSERY_NEWBORN_REMNANT, (u - NURSERY_NEWBORN_FADE_START) / (1 - NURSERY_NEWBORN_FADE_START));
}

/**
 * The glow radius scale (× the base radius) at a cycle position u: the cloud
 * swells as it gathers and flares, holds size while active, and shrinks as it
 * disperses.
 */
export function radiusScaleAt(u: number): number {
  if (u < NURSERY_FORMING_END) {
    return lerp(0.6, 0.9, u / NURSERY_FORMING_END);
  }
  if (u < NURSERY_BIRTH_END) {
    const t = (u - NURSERY_FORMING_END) / (NURSERY_BIRTH_END - NURSERY_FORMING_END);
    return 0.9 + 0.05 * Math.sin(t * Math.PI);
  }
  if (u < NURSERY_ACTIVE_END) return 1;
  return lerp(1, 0.8, (u - NURSERY_ACTIVE_END) / (1 - NURSERY_ACTIVE_END));
}

/**
 * The static, seeded description of every region, placed on the spiral arms.
 * Deterministic: the same (arms, seed) always yields the same set.
 */
export function createNurseryRegions(
  arms: number,
  seed: number = NURSERY_SEED,
): NurseryRegion[] {
  const safeArms = Math.max(1, Math.floor(arms));
  const regions: NurseryRegion[] = [];
  for (let k = 0; k < NURSERY_REGION_COUNT; k++) {
    // A per-region rng stream: each knot's roll is independent of the others,
    // so adding/removing a region never reshuffles its siblings.
    const rng = seedRng((seed ^ (k * 0x9e3779b1)) >>> 0);
    // Ride arm k mod arms (the same round-robin the stars use).
    const arm = k % safeArms;
    // Spread the knots along the arm: an even base position plus a small
    // seeded wobble, clamped into the visible disk (0.15..0.95 of the arm).
    const base = (k + 0.5) / NURSERY_REGION_COUNT;
    const wobble = (rng() - 0.5) * (1 / NURSERY_REGION_COUNT) * 1.2;
    const t = clamp(0.15 + 0.8 * clamp(base + wobble, 0, 1), 0.15, 0.95);
    const jitter = (rng() - 0.5) * 0.24; // stay inside the arm band
    const radiusFraction = 0.026 + rng() * 0.022;
    const hue = 328 + rng() * 26; // rosy red-pink
    const cycleOffset = rng() * NURSERY_CYCLE_MS;
    const pulsePhase = rng() * Math.PI * 2;
    const newbornCount = 3 + Math.floor(rng() * 4); // 3..6 new stars
    const newborns: NewbornStar[] = [];
    for (let i = 0; i < newbornCount; i++) {
      // sqrt(rng()) gives a uniform-in-area disk distribution, not a ring.
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * 0.9;
      newborns.push({
        ux: Math.cos(a) * d,
        uy: Math.sin(a) * d,
        size: 0.9 + rng() * 1.2,
      });
    }
    regions.push({
      index: k,
      arm,
      t,
      jitter,
      radiusFraction,
      hue,
      cycleOffset,
      pulsePhase,
      newborns,
    });
  }
  return regions;
}

/**
 * Compute the live state of every nursery region for a given instant.
 * Deterministic: the same (time, size, arms, galaxyAngle, seed) always yields
 * the same states. The knots sit on the spiral arms (same arm math as the
 * stars) and orbit with `galaxyAngle`.
 */
export function computeNursery(input: NurseryInput): NurseryRegionState[] {
  const { time, width, height, arms, galaxyAngle, seed = NURSERY_SEED } = input;
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);
  // The galaxy's disk radius — identical to the starfield's, so the knots
  // trace the same spiral the stars do.
  const maxR = minDim * 0.46;
  const regions = createNurseryRegions(arms, seed);
  return regions.map((r) => {
    const u = regionCycleU(r, time);
    const armOffset = (r.arm / Math.max(1, arms)) * Math.PI * 2;
    const angle = r.t * NURSERY_ARM_SPAN + armOffset + r.jitter + galaxyAngle;
    const orbitRadius = (Math.pow(r.t, 0.7) * 0.9 + 0.05) * maxR;
    const x = cx + Math.cos(angle) * orbitRadius;
    const y = cy + Math.sin(angle) * orbitRadius;
    const baseRadiusPx = r.radiusFraction * minDim;
    const shell = shellAt(u, baseRadiusPx);
    return {
      ...r,
      x,
      y,
      radius: baseRadiusPx * radiusScaleAt(u),
      glowAlpha: glowAlphaAt(u, r.pulsePhase),
      birthFlash: birthFlashAt(u),
      shellRadius: shell.shellRadius,
      shellAlpha: shell.shellAlpha,
      newbornAlpha: newbornAlphaAt(u),
      phase: nurseryPhaseAt(u),
    };
  });
}

/**
 * The phase label for accessibility / share previews, e.g. "Star Nursery:
 * Birth".
 */
export function describeNurseryPhase(phase: NurseryPhase): string {
  switch (phase) {
    case "forming":
      return "Star Nursery: Gathering";
    case "birth":
      return "Star Nursery: Birth";
    case "active":
      return "Star Nursery: New Stars";
    default:
      return "Star Nursery: Dispersing";
  }
}
