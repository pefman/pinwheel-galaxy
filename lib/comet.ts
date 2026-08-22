/**
 * Comet Trail — the pure, unit-tested logic for a cursor-following comet.
 *
 * A small comet with a bright head and a tapering, fading tail trails the
 * pointer as it moves across the hero. The tail length grows with cursor
 * speed and its hue is drawn from the galaxy's active theme (handled by the
 * caller); this module only owns the geometry that is cheap to reason about:
 *
 *   - a light-weight `mulberry32` PRNG (kept for seeded follow-ups),
 *   - `cursorSpeed` — the px/s implied by recent pointer samples,
 *   - `polylineLength` / `resampleTail` — evenly resampling the pointer path
 *     into a fixed number of tail points (the first is the comet tip at the
 *     oldest sample; the head at the newest sample is placed by the caller),
 *     and
 *   - `tailLengthFromSpeed` — mapping speed onto a capped tail length.
 *
 * Everything here is a pure function of its inputs, so the effect is fully
 * testable without a canvas or a timer.
 */

/** A single pointer sample: a point in time and screen space. */
export interface Point {
  x: number;
  y: number;
  /** High-resolution clock (ms) when the sample was taken. */
  t: number;
}

/** A `mulberry32` PRNG — tiny, deterministic, good enough for seeded trails. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear interpolation between `a` and `b` by `t` in [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The instantaneous speed (px/s) implied by the most recent samples in the
 * history. Compares the newest sample to the newest one `window` samples back
 * and divides the distance travelled by the elapsed time. Returns 0 when there
 * is not enough history or the elapsed time is degenerate.
 */
export function cursorSpeed(history: Point[], window = 4): number {
  const n = history.length;
  if (n < window + 1) return 0;
  const a = history[n - window];
  const b = history[n - 1];
  const dt = b.t - a.t;
  if (dt <= 0) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y) / (dt / 1000);
}

/** Total length (px) of the polyline through the given points. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return total;
}

/**
 * Resample the pointer history into `count` evenly spaced points along the
 * path, ordered oldest → newest (so the last element is the current head).
 * The returned points lie exactly on the original polyline at equal arc-length
 * intervals, so a straight-line sweep yields evenly distributed points and a
 * tight loop yields points spaced around the loop.
 *
 * The head (newest sample) is always preserved as the final point.
 */
export function resampleTail(history: Point[], count: number): Point[] {
  if (history.length < 2) return [...history];
  const n = Math.max(2, Math.min(count, history.length));

  // Cumulative arc-length along the path.
  const lengths: number[] = [0];
  for (let i = 1; i < history.length; i++) {
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          history[i].x - history[i - 1].x,
          history[i].y - history[i - 1].y,
        ),
    );
  }
  const total = lengths[history.length - 1];
  // `n` points spaced at equal arc-length intervals, starting at the comet tip
  // (arc-length 0, i.e. the oldest sample) and ending just before the head at
  // arc-length total * (n-1) / n. The head itself is left to the caller, which
  // draws it as the comet's bright core.
  const samples: Point[] = [];
  for (let i = 0; i < n; i++) {
    const target = (total * i) / n;
    // Find the segment [k, k+1] that contains `target`.
    let k = 0;
    while (k < lengths.length - 2 && lengths[k + 1] < target) k++;
    const segLen = lengths[k + 1] - lengths[k] || 1;
    const f = (target - lengths[k]) / segLen;
    samples.push({
      x: lerp(history[k].x, history[k + 1].x, f),
      y: lerp(history[k].y, history[k + 1].y, f),
      t: history[k].t,
    });
  }
  return samples;
}

/**
 * Map a cursor speed (px/s) onto a tail length in px. Below `threshold` the
 * tail is just its `base` length; it grows linearly to `max` at `maxSpeed`,
 * then stays capped. This makes a slow drift a short comet and a fast swipe a
 * long streak.
 */
export function tailLengthFromSpeed(
  speed: number,
  base: number,
  max: number,
  threshold = 0,
  maxSpeed: number,
): number {
  if (speed <= threshold) return base;
  const ramp = Math.min(1, (speed - threshold) / Math.max(1, maxSpeed - threshold));
  return base + ramp * (max - base);
}
