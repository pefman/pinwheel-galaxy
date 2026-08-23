/**
 * Black Hole — a placeable gravitational singularity with an accretion disk.
 *
 * Every other sky layer is a field of stars or a soft atmospheric glow. The
 * Black Hole adds the one thing a real galaxy is missing: a single, extreme
 * body. A black hole is a placeable singularity — a dark event horizon ringed
 * by a photon ring and a swirling accretion disk of infalling matter — that
 * warps the sky around it. It sits anywhere you put it (drag it by its glow),
 * off by default, purely additive and orthogonal to gravity, warp, nebula,
 * constellations, meteors, variable stars, Stellar Depth, zoom, the comet, the
 * moon and the aurora — none of them read this.
 *
 * Everything here is a pure, deterministic function of the sky size and a
 * fixed seed, so the hole keeps its shape between frames and reloads. The
 * accretion disk is a precomputed field of particles on an inclined Keplerian
 * orbit; the Doppler shift (the approaching side is brighter/bluer, the
 * receding side dimmer/redder) is exposed so it can be unit-tested without a
 * canvas.
 *
 * The effect is painted at screen scale (like the moon and the distant galaxy)
 * so it never participates in the galaxy's zoom transform, and it is drawn
 * between the stars — the event horizon hides whatever stars sit behind it.
 */

/** Seed for the deterministic accretion-disk assignment (stable across reloads). */
export const BLACK_HOLE_SEED = 7;

/** The black hole's event-horizon radius as a fraction of the smaller sky dim. */
export const BLACK_HOLE_RADIUS_FRACTION = 0.06;

/** Clamp the event-horizon radius to a comfortable on-screen range (px). */
export const BLACK_HOLE_RADIUS_MIN = 34;
export const BLACK_HOLE_RADIUS_MAX = 150;

/** Padding kept from the sky edges when placing the hole (px). */
export const BLACK_HOLE_MARGIN = 40;

/** Number of accretion-disk particles precomputed per hole. */
export const ACCRETION_PARTICLES = 260;

/**
 * Inner edge of the accretion disk, in units of the event-horizon radius `R`.
 * Matter spirals in down to just outside the innermost stable circular orbit.
 */
export const DISK_INNER_FRACTION = 1.55;

/** Outer edge of the accretion disk, in units of `R`. */
export const DISK_OUTER_FRACTION = 3.6;

/** Disk inclination from face-on (rad). ~55° reads as a clear ellipse. */
export const DISK_TILT = 0.96;

/** How the disk's spin phase advances per second (rad). */
export const DISK_RPS = 0.55;

/** mulberry32 — a tiny, fast, deterministic PRNG (see moon.ts). */
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * A single accretion-disk particle, expressed in *planar* (un-projected)
 * coordinates: an orbit angle and a radius in units of the event-horizon
 * radius. Its live screen position is derived by `accretionPoint`.
 */
export interface AccretionParticle {
  /** Orbit angle on the disk plane (rad, 0..2π). */
  angle: number;
  /** Orbit radius, in units of the event-horizon radius R (1.55..3.6). */
  radiusFrac: number;
  /** Keplerian angular speed multiplier — inner particles orbit faster. */
  speed: number;
  /** Base brightness 0..1 set by radial distance from the hole. */
  brightness: number;
  /** Hue offset (deg) applied on top of the disk's base hue. */
  hueOffset: number;
  /** Per-particle jitter so the disk reads as clumpy gas, not a smooth ring. */
  jitter: number;
}

/** The full, static description of a black hole at a given sky size. */
export interface BlackHoleState {
  /** Event-horizon center x, in px. */
  x: number;
  /** Event-horizon center y, in px. */
  y: number;
  /** Event-horizon (Schwarzschild) radius, in px. */
  radius: number;
  /** Disk inclination from face-on (rad). */
  tilt: number;
  /** Base spin phase (rad), advanced on the running clock. */
  spinPhase: number;
  /** The precomputed accretion-disk particle field. */
  particles: AccretionParticle[];
  /** Base hue (deg) of the hot disk — warm orange to keep it on-brand. */
  hue: number;
}

/**
 * Compute the black hole's state for a sky of the given size. Deterministic:
 * the same size/seed always yields the same hole. Placement is kept off-centre
 * and padded from the edges so it never competes with the interactive galaxy
 * at the centre.
 */
export function computeBlackHole({
  width,
  height,
  seed = BLACK_HOLE_SEED,
}: {
  width: number;
  height: number;
  seed?: number;
}): BlackHoleState {
  const r = Math.min(
    BLACK_HOLE_RADIUS_MAX,
    Math.max(BLACK_HOLE_RADIUS_MIN, Math.min(width, height) * BLACK_HOLE_RADIUS_FRACTION),
  );

  // Place the hole in the upper quadrant, well clear of centre and edges.
  const rng = seedRng(seed);
  const fracX = 0.66 + rng() * 0.18; // 66–84% across
  const fracY = 0.20 + rng() * 0.16; // 20–36% down
  const x = clamp(fracX * width, BLACK_HOLE_MARGIN + r, width - BLACK_HOLE_MARGIN - r);
  const y = clamp(fracY * height, BLACK_HOLE_MARGIN + r, height - BLACK_HOLE_MARGIN - r);

  // A warm, on-brand base hue (amber → orange).
  const hue = 32 + rng() * 18;

  // Precompute the accretion-disk particle field.
  const particles: AccretionParticle[] = [];
  for (let i = 0; i < ACCRETION_PARTICLES; i++) {
    const angle = rng() * Math.PI * 2;
    // Radius distributed so the disk looks denser toward the inner edge
    // (power law) but still fills out to the outer edge.
    const t = Math.pow(rng(), 0.6);
    const radiusFrac = DISK_INNER_FRACTION + t * (DISK_OUTER_FRACTION - DISK_INNER_FRACTION);
    // Kepler's third law: orbital period² ∝ radius³ ⇒ angular speed ∝ r^-1.5.
    const speed = Math.pow(radiusFrac, -1.5);
    // Brighter toward the inner edge (hotter) and overall a soft falloff.
    const brightness = clamp(1.4 - radiusFrac / DISK_OUTER_FRACTION * 1.1, 0.15, 1);
    particles.push({
      angle,
      radiusFrac,
      speed,
      brightness,
      hueOffset: (rng() - 0.5) * 30,
      jitter: 0.85 + rng() * 0.3,
    });
  }

  return { x, y, radius: r, tilt: DISK_TILT, spinPhase: 0, particles, hue };
}

/**
 * Project a single accretion particle to a screen-space offset (dx, dy) from
 * the hole's centre, given the running `spin` (rad). The disk plane is
 * inclined by `tilt` (compress the perpendicular axis by cos(tilt)) and then
 * rotated by `spin`, so the disk reads as a tilted ellipse that spins in
 * perspective.
 */
export function accretionPoint(
  p: AccretionParticle,
  cx: number,
  cy: number,
  spin: number,
  tilt: number,
  radius: number,
): { x: number; y: number } {
  // In-plane orbit radius in px.
  const r = p.radiusFrac * radius;
  // In-plane coordinates, then flatten y by cos(tilt) to fake the perspective
  // foreshortening that turns the round disk into a tilted ellipse.
  const cosT = Math.cos(tilt);
  const px = Math.cos(p.angle) * r;
  const py = Math.sin(p.angle) * r * cosT;
  // Rotate the whole disk by its spin about the centre.
  const sx = px * Math.cos(spin) - py * Math.sin(spin);
  const sy = px * Math.sin(spin) + py * Math.cos(spin);
  return { x: cx + sx, y: cy + sy };
}

/**
 * The Doppler factor (−1..1) of an accretion particle at orbit angle `angle`
 * with disk spin `spin`: +1 when the particle moves toward the viewer (blueshift
 * ⇒ brighter/cooler-looking), −1 when it recedes (redshift ⇒ dimmer/redder).
 *
 * The approaching side of the disk is brighter — the hallmark of real
 * accretion disks around black holes. `direction` is the viewer's azimuth
 * (rad) for the blueshift; the receding side is directly opposite.
 */
export function dopplerFactor(angle: number, spin: number, direction: number): number {
  // Tangential velocity direction of a particle on its orbit is angle + π/2.
  const velAngle = angle + Math.PI / 2 + spin;
  // Projection onto the viewer azimuth: cos(velAngle - direction) ∈ [-1, 1].
  return Math.cos(velAngle - direction);
}

/**
 * Gravitational-lensing magnification at a straight-line distance `dist` (px)
 * from the hole's centre, in units of the event-horizon radius. Stars near the
 * Einstein ring get brightened; directly behind the horizon they vanish.
 * Returns 0 inside the event horizon, rising to a peak just outside it, then
 * easing back toward 1 (undisturbed) far away.
 */
export function deflectionMagnification(dist: number, radius: number): number {
  if (dist < radius) return 0; // behind the event horizon — invisible
  const u = dist / radius;
  // Simple, bounded model: a brightening bump near the Einstein ring
  // (~1.6·R) that decays to 1 (no lensing) far away.
  const einstein = 1.6;
  const bump = (einstein * einstein) / (u * u - 1 + einstein * einstein + 0.0001);
  return 1 + Math.min(bump, 3) * Math.exp(-(u - einstein) * 1.4);
}

/**
 * The Einstein-ring radius (px) — the brightened circle of lensed light that
 * rings the event horizon. Slightly larger than the photon ring, so the two
 * read as distinct.
 */
export function einsteinRadius(radius: number): number {
  return radius * 1.9;
}

/** Whether the point (px, py) lies inside the event horizon of the hole. */
export function isInsideEventHorizon(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  return Math.hypot(px - cx, py - cy) < radius;
}

/**
 * The on-disk hue (deg) of a particle once its Doppler shift is applied:
 * blueshift cools toward cyan, redshift warms toward red. `baseHue` is the
 * disk's rest hue and `factor` is the Doppler factor (−1..1).
 */
export function dopplerHue(baseHue: number, factor: number): number {
  return baseHue - factor * 40;
}
