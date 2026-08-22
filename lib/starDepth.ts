/**
 * Stellar Depth — the pure maths behind the optional 3D parallax layer.
 *
 * Stellar Depth is a *view* layer, not part of the galaxy's own configuration:
 * it changes how the visitor perceives the depth of the galaxy, not the galaxy
 * itself. That is why it lives here (a self-contained, side-effect-free module)
 * rather than in `galaxyPresets.ts`, and why it is deliberately orthogonal to
 * theme / arms / rpm / stars / gravity / zoom.
 *
 * Three ideas, each a pure function of its inputs:
 * - `depthForIndex` gives every star a stable "distance" in [0.15, 1]. The map
 *   is derived from a seedable pseudo-random so it never re-randomises between
 *   mounts — the galaxy keeps its shape instead of shimmering.
 * - `parallaxFor` shifts nearer stars more than farther ones as the cursor
 *   moves, so the field reads as 3D rather than a flat disc.
 * - `twinkleAlpha` + `depthScale` give the draw pass per-star variation: near
 *   stars twinkle harder and sit crisper/brighter; far stars are dimmed and
 *   softened, like atmospheric perspective.
 *
 * Everything here is a pure function of its inputs so the behaviour can be
 * unit-tested without a canvas or a browser.
 */

/** Seed for the deterministic depth map. Bump to reshuffle the whole field. */
export const DEPTH_SEED = 7;
/** Depth of the farthest stars (least parallax, dimmest). */
export const DEPTH_MIN = 0.15;
/** Depth of the nearest stars (most parallax, crispest). */
export const DEPTH_MAX = 1;
/**
 * How far a depth-1 star shifts, in px, when the cursor sits at the edge of the
 * field. Near stars shift by this × their depth.
 */
export const PARALLAX_RANGE = 26;
/** Rad/s for the base twinkle oscillation. */
export const TWINKLE_SPEED = 1.6;

/**
 * Deterministic per-star depth in [DEPTH_MIN, DEPTH_MAX].
 *
 * A tiny trigonometric pseudo-random (a stand-in for a seeded LCG) keeps the
 * depth map stable across mounts and re-renders while spreading stars evenly
 * across the depth range. `index`/`total`/`seed` are the only inputs.
 */
export function depthForIndex(index: number, total: number, seed: number): number {
  const n = Math.max(1, total);
  const u = pseudoUnit((index + 1) / n, seed);
  return DEPTH_MIN + u * (DEPTH_MAX - DEPTH_MIN);
}

/**
 * A stable pseudo-random value in [0, 1) from a normalized position `x` in
 * [0, 1] and a `seed`. Uses the "sine hash" trick — cheap, deterministic, and
 * good enough to spread stars across the depth range without a real RNG.
 */
function pseudoUnit(x: number, seed: number): number {
  const hash = Math.sin((x + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  const frac = hash - Math.floor(hash);
  return frac;
}

/**
 * Parallax offset for a star at `depth`. `baseX`/`baseY` are the cursor's
 * offset from the galaxy centre; nearer stars (higher depth) shift more.
 */
export function parallaxFor(
  depth: number,
  baseX: number,
  baseY: number,
): { x: number; y: number } {
  return { x: baseX * depth, y: baseY * depth };
}

/**
 * Twinkle alpha multiplier in roughly (0.1, 1.1]. `phase` staggers stars so
 * they do not blink in unison; `depth` scales the amplitude so nearer stars
 * twinkle more strongly than distant ones.
 */
export function twinkleAlpha(phase: number, t: number, depth: number): number {
  const amplitude = 0.15 + 0.3 * depth; // nearer stars twinkle harder
  const base = 0.65;
  return base - amplitude * Math.cos(TWINKLE_SPEED * t + phase);
}

/**
 * Atmospheric-perspective scale for a star at `depth`: far stars are drawn
 * smaller and dimmer, near stars crisper and brighter. Returns a single
 * multiplier applied to both size and alpha.
 */
export function depthScale(depth: number): number {
  return 0.6 + 0.4 * depth;
}

/** A per-star twinkle phase, derived deterministically from its depth slot. */
export function twinklePhase(index: number, total: number, seed: number): number {
  return depthForIndex(index, total, seed * 3 + 5) * Math.PI * 2;
}
