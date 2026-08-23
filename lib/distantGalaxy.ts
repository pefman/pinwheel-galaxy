/**
 * Distant Galaxy — a far-away spiral galaxy drifting slowly through the deep
 * background.
 *
 * Every other sky layer is either a field of stars, a soft glow/motion, or a
 * single body/event (the moon, a supernova). A distant galaxy is something
 * else: a whole *other* galaxy, seen edge- or face-on in the distance, made of
 * a dense field of faint stars wound into spiral arms around a warm central
 * bulge. It reads as looking out into deep space past the interactive galaxy —
 * scenery rather than the thing you are making — so it sits behind everything
 * and rotates only a hair over a session.
 *
 * It is off by default, purely additive, and fully orthogonal to every other
 * layer (none of them read this). Everything here is a pure, deterministic
 * function of a seed, so the same galaxy always looks the same. The arm
 * geometry and placement are exposed as plain numbers so the behaviour is
 * unit-tested without a canvas.
 */

/** Seed for the deterministic per-galaxy placement + arm + scatter jitter. */
export const DISTANT_GALAXY_SEED = 13;

/** How many times the arms wind from the bulge to the outer edge. */
export const TURNS = 2.2;
/** Where the arms start, as a fraction of the outer radius (the bulge core). */
export const ARM_INNER = 0.12;
/** Per-sample stars per arm when building the field. */
export const ARM_SAMPLES = 96;
/** Scatter of arm stars off the ideal spiral line, as a fraction of radius. */
export const ARM_WIDTH = 0.30;
/** Fraction of stars that live in the warm central bulge. */
export const BULGE_STARS = 140;
/** Slow, distant rotation: one full turn every this many seconds. */
export const ROTATION_SECONDS_PER_TURN = 260;

/**
 * A single pre-computed star of the distant galaxy, expressed in *local*
 * coordinates centred on the galaxy (0,0) and in absolute pixels. The caller
 * rotates, tilts and translates these each frame — the model never draws.
 */
export interface DistantGalaxyStar {
  /** Local x before rotation (px). */
  dx: number;
  /** Local y before rotation + tilt (px). */
  dy: number;
  /** Base brightness 0 (faint) … 1 (bright). */
  bright: number;
  /** Hue (degrees). Bulge stars run warm; arm stars run cooler/white. */
  hue: number;
  /** Radius (px). */
  size: number;
}

/** The full description of one distant galaxy, ready for the caller to draw. */
export interface DistantGalaxy {
  /** Center x, in px, in the current sky. */
  x: number;
  /** Center y, in px, in the current sky. */
  y: number;
  /** Outer radius, in px. */
  radius: number;
  /** Global rotation (rad) — the base angle the caller keeps advancing. */
  angle: number;
  /** Inclination (tilt), 0 = face-on … ~0.75 = nearly edge-on. */
  tilt: number;
  /** Number of spiral arms (2…5). */
  arms: number;
  /** The pre-computed field of faint stars that makes up the galaxy. */
  stars: DistantGalaxyStar[];
}

/**
 * mulberry32 — a tiny, fast, deterministic PRNG. Given the same seed it
 * produces the same sequence, so the placement, arms and scatter are
 * reproducible. (Not cryptographically safe, which is exactly what we want
 * here.)
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

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * The ideal (un-jittered) position on spiral arm `armOffset` at normalized
 * radius `u` (0 = bulge core, 1 = outer edge), in local pixels. `radius` is
 * the galaxy's outer radius, `turns` how far the arms wind, and `inner` where
 * the arms start as a fraction of `radius`.
 *
 * The radius grows linearly with `u` while the angle winds by `turns` full
 * turns — the classic arm look. This is the clean spiral line; the field
 * generator adds perpendicular scatter around it.
 */
export function armPoint({
  armOffset,
  u,
  radius,
  turns = TURNS,
  inner = ARM_INNER,
  width = 0,
  rng = () => 0,
}: {
  armOffset: number;
  u: number;
  radius: number;
  turns?: number;
  inner?: number;
  width?: number;
  rng?: () => number;
}): { x: number; y: number } {
  const turnAngle = u * turns * Math.PI * 2;
  const r = radius * (inner + (1 - inner) * u);
  let px = r * Math.cos(armOffset + turnAngle);
  let py = r * Math.sin(armOffset + turnAngle);
  if (width > 0) {
    // Scatter along the perpendicular to the arm (and a little along it), so
    // the arm has thickness rather than being a thin line.
    const len = Math.hypot(px, py) || 1;
    const nx = px / len; // radial unit
    const ny = py / len;
    const along = (rng() - 0.5) * 2 * width * radius * 0.3;
    const perp = (rng() - 0.5) * 2 * width * radius;
    px += nx * along + (-ny) * perp;
    py += ny * along + nx * perp;
  }
  return { x: px, y: py };
}

/**
 * Build the star field of a distant galaxy given its arm/tilt parameters.
 * Deterministic from `seed`: the same (arms, tilt, radius, seed) always yields
 * the same field. Arm stars follow the logarithmic spiral (with scatter);
 * bulge stars cluster near the centre and run warmer and brighter.
 */
export function buildDistantGalaxyField({
  arms,
  radius,
  seed = DISTANT_GALAXY_SEED,
  turns = TURNS,
  inner = ARM_INNER,
  width = ARM_WIDTH,
}: {
  arms: number;
  radius: number;
  seed?: number;
  turns?: number;
  inner?: number;
  width?: number;
}): DistantGalaxyStar[] {
  const rng = seedRng(seed);
  const stars: DistantGalaxyStar[] = [];

  // Spiral arms: a fan of stars winding outward from the bulge.
  for (let a = 0; a < arms; a++) {
    const armOffset = (a / arms) * Math.PI * 2;
    for (let i = 0; i < ARM_SAMPLES; i++) {
      const u = i / (ARM_SAMPLES - 1);
      const p = armPoint({ armOffset, u, radius, turns, inner, width, rng });
      // Arm stars are cooler (blue-white young stars) with occasional warm
      // knots; brightness falls off toward the edge.
      const cool = rng() > 0.28;
      const hue = cool ? 200 + rng() * 60 : 30 + rng() * 30;
      const bright = (0.35 + 0.65 * (1 - u * 0.5)) * (0.5 + rng() * 0.5);
      stars.push({
        dx: p.x,
        dy: p.y,
        bright: clamp(bright, 0.15, 1),
        hue,
        size: 0.6 + bright * 1.1,
      });
    }
  }

  // Central bulge: warm, bright, concentrated toward the core.
  for (let i = 0; i < BULGE_STARS; i++) {
    // u^2 concentrates points near the centre (area grows as r, so sample r ∝ √u).
    const u = Math.sqrt(rng());
    const ang = rng() * Math.PI * 2;
    const r = radius * inner * 3.2 * u;
    const bright = (0.5 + 0.5 * (1 - u)) * (0.55 + rng() * 0.45);
    stars.push({
      dx: Math.cos(ang) * r,
      dy: Math.sin(ang) * r,
      bright: clamp(bright, 0.2, 1),
      hue: 38 + rng() * 28, // warm gold → orange
      size: 0.6 + bright * 1.2,
    });
  }

  return stars;
}

/**
 * Compute one distant galaxy for a sky of the given size. Deterministic from
 * `seed`: the same (width, height, seed) always yields the same galaxy. The
 * placement is kept off-centre (so it never overlaps the interactive galaxy)
 * and padded from the edges; its size is a small fraction of the sky so it
 * reads as far away. The arm count, tilt and base rotation are seeded.
 */
export function computeDistantGalaxy({
  width,
  height,
  seed = DISTANT_GALAXY_SEED,
}: {
  width: number;
  height: number;
  seed?: number;
}): DistantGalaxy {
  const rng = seedRng(seed);
  const diag = Math.hypot(width, height);

  // Placement: across the sky, avoiding the centre (the interactive galaxy)
  // and padded from the edges.
  const edge = 46;
  const guard = Math.min(width, height) * 0.17;
  let x = width / 2;
  let y = height / 2;
  do {
    x = edge + rng() * (width - 2 * edge);
    y = edge + rng() * (height - 2 * edge);
  } while (Math.hypot(x - width / 2, y - height / 2) < guard);

  // Size: a small, distant fraction of the sky.
  const radius = diag * (0.11 + rng() * 0.07);

  // Seeded geometry.
  const arms = 2 + Math.floor(rng() * 4); // 2…5
  const tilt = rng() * 0.72; // 0 (face-on) … ~0.72 (edge-on)
  const baseAngle = rng() * Math.PI * 2;

  const stars = buildDistantGalaxyField({ arms, radius, seed: seed ^ 0x3719 });

  return { x, y, radius, angle: baseAngle, tilt, arms, stars };
}

/** Total number of stars in a galaxy's field — handy for tests + budgets. */
export function distantGalaxyStarCount(arms: number): number {
  return arms * ARM_SAMPLES + BULGE_STARS;
}

/** Human-readable summary for accessibility / share previews. */
export function describeDistantGalaxy(): string {
  return "Distant Galaxy";
}
