/**
 * Galaxy Zoom — the pure maths behind zooming into the interactive starfield.
 *
 * Zoom is a *view* transform, not part of the galaxy's own configuration: it
 * changes how the visitor looks at the galaxy, not the galaxy itself. That is
 * why it lives here (a self-contained, side-effect-free module) rather than in
 * `galaxyPresets.ts`, and why it is deliberately orthogonal to theme / arms /
 * rpm / stars.
 *
 * Everything in this module is a pure function of its inputs so the behaviour
 * can be unit-tested without a canvas or a browser. The React component
 * (`StarField`) owns the live zoom state, turns wheel / pinch gestures into a
 * `target` value, and eases the visible zoom toward that target every frame.
 *
 * Design intent:
 * - Dolly, don't blow up: stars are scaled by `1 / zoom` while the scene is
 *   scaled by `zoom`, so they hold a constant on-screen size. The galaxy
 *   therefore "comes towards you" instead of turning into blurry blobs.
 * - Gentle and forgiving: clamped to a sane range, eased into motion, and
 *   resettable with a double-click.
 */

/** Inclusive lower bound for the zoom level (how far out you can pull). */
export const ZOOM_MIN = 0.6;
/** Upper bound for the zoom level (how far in you can push). */
export const ZOOM_MAX = 2.5;
/** The calm, default zoom — the galaxy at 1×. */
export const ZOOM_DEFAULT = 1;

/**
 * How strongly the visible zoom chases the target each frame. 0 = never,
 * 1 = instant. 0.18 reads as a smooth, weighted "dolly".
 */
export const ZOOM_EASE = 0.18;

/** Continuous wheel / trackpad scroll multiplier per pixel of wheel delta. */
const WHEEL_K = 0.0016;
/** Pinch: divide the new touch distance by the old one to get the multiplier. */

/** Clamp a zoom level into the supported range. */
export function clampZoom(z: number): number {
  // Reject only NaN; Math.min/max already turn ±Infinity into the bounds.
  if (Number.isNaN(z)) return ZOOM_DEFAULT;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

/**
 * Ease a visible zoom toward a target by a fraction of a frame. Returns a
 * zoom already clamped into range. When already within a hair of the target it
 * snaps, so it never visibly stalls.
 */
export function easeZoom(current: number, target: number, factor: number): number {
  // Snap when we are within a hair of the target so it never visibly stalls.
  if (Math.abs(target - current) < 1e-4) return clampZoom(target);
  const next = current + (target - current) * factor;
  return clampZoom(next);
}

/**
 * The screen-size scale stars should use so they hold a constant on-screen
 * size under a given zoom. A 2× zoom shrinks star geometry to half so the
 * galaxy dollys in instead of bloating.
 */
export function screenSizeScale(zoom: number): number {
  return 1 / zoom;
}

/**
 * Convert a wheel delta (px, positive = scrolling down) into a zoom
 * multiplier. Scrolling up (negative delta) zooms in; scrolling down zooms
 * out. The mapping is exponential so fine control is preserved at every zoom
 * level.
 */
export function wheelDeltaToMultiplier(deltaY: number): number {
  return Math.exp(-deltaY * WHEEL_K);
}

/**
 * Apply a multiplier to a current zoom, clamped into range. Used by both the
 * wheel handler (per-pixel) and the pinch handler (ratio of touch distances).
 */
export function applyZoomMultiplier(current: number, multiplier: number): number {
  return clampZoom(current * multiplier);
}

/** Parse the `?z=` URL param into a zoom, or `null` when absent/invalid. */
export function paramsToZoom(raw: string | null): number | null {
  if (raw === null) return null;
  const z = Number(raw);
  if (!Number.isFinite(z)) return null;
  return clampZoom(z);
}

/** Build a URLSearchParams carrying the current zoom under `z`. */
export function zoomToParams(zoom: number): URLSearchParams {
  const p = new URLSearchParams();
  p.set("z", clampZoom(zoom).toFixed(2));
  return p;
}

