/**
 * Shooting Stars — the "meteor shower" sky effect.
 *
 * Occasional meteors streak across the hero's deep sky: a bright head that
 * fades into a long, soft tail. Each meteor is a short-lived diagonal streak
 * that spawns somewhere along the top of the viewport and travels down and to
 * one side, so the sky feels alive without ever competing with the interactive
 * galaxy in the foreground.
 *
 * Design notes:
 * - Everything here is a PURE, side-effect-free function of its inputs. Given
 *   the same `(time, width, height, intensity, seed, hues)` it always returns
 *   the same meteors — which is what makes the effect deterministic and unit
 *   testable, and keeps it from "flickering" as the clock advances.
 * - Meteors are derived, not animated per-frame with mutable state: we ask
 *   "which meteors are alive right now?" by enumerating a deterministic spawn
 *   timeline. This keeps the render loop allocation-light and reproducible.
 * - The effect is orthogonal to Gravity Well, Constellation, Warp Drive and
 *   Nebula Drift — a pure sky backdrop, never touching the stars.
 */

/** A single live meteor at a given instant. */
export interface ShootingStar {
  x: number; // head position, px (where the bright point is)
  y: number;
  len: number; // streak length behind the head, px
  angle: number; // travel angle in radians (0..~PI/2, pointing down-right)
  width: number; // head line width, px
  hue: number; // colour, drawn from the active theme's hues
}

export interface ShootingStarsParams {
  time: number; // seconds since the shower began
  width: number; // viewport width, px
  height: number; // viewport height, px
  intensity: number; // relative meteor rate (higher = more meteors)
  seed: number; // stable seed; a fixed seed gives a stable pattern
  hues: number[]; // theme hues the meteor colours are drawn from
}

/** Mean spacing (s) between meteors at intensity 1. */
export const SHOOTING_BASE_INTERVAL = 2.2;
/** A meteor lives between these many seconds. */
export const SHOOTING_MIN_LIFE = 0.5;
export const SHOOTING_MAX_LIFE = 1.1;
/** How many meteors may be alive at once before we stop drawing extras. */
export const SHOOTING_MAX_ALIVE = 4;
/** Speed of a meteor head, px/s. */
export const SHOOTING_SPEED_MIN = 460;
export const SHOOTING_SPEED_MAX = 800;
/** Visual streak length factor of `speed * life`. */
export const SHOOTING_LEN_FACTOR = 0.55;

/**
 * mulberry32 — a tiny, fast, seedable PRNG. Deterministic for a given seed,
 * which is what lets the spawn timeline be reproduced frame to frame.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spawn {
  t: number; // spawn time (s)
  life: number; // lifetime (s)
  angle: number; // travel angle (rad)
  speed: number; // head speed (px/s)
  x0: number; // spawn x (px)
  y0: number; // spawn y (px, usually above the top edge)
}

/**
 * Enumerate the deterministic spawn timeline up to `time`. Pure function of
 * its inputs — used directly by the unit tests and by `computeShootingStars`.
 *
 * The first spawn is placed slightly before t = 0 (so the shower is already
 * underway on load), and each subsequent gap is `baseInterval * (0.4..1.0)` —
 * the mean gap scales inversely with `intensity`.
 */
export function shootingStarSpawns(
  seed: number,
  time: number,
  intensity: number,
): Spawn[] {
  const rng = mulberry32(seed);
  const baseInterval = SHOOTING_BASE_INTERVAL / Math.max(0.1, intensity);
  const spawns: Spawn[] = [];
  let t = -rng() * baseInterval; // already part-way through on load
  let guard = 0;
  while (guard++ < 100000) {
    t += baseInterval * (0.4 + rng());
    if (t > time) break;
    spawns.push({
      t,
      life: SHOOTING_MIN_LIFE + rng() * (SHOOTING_MAX_LIFE - SHOOTING_MIN_LIFE),
      angle: 0.45 + rng() * 0.5, // ~26°–55° below the horizontal
      speed: SHOOTING_SPEED_MIN + rng() * (SHOOTING_SPEED_MAX - SHOOTING_SPEED_MIN),
      x0: rng() * 1920, // spawn spread is independent of the live viewport
      y0: -rng() * 220, // start just above the top edge
    });
  }
  return spawns;
}

/** Pick a hue from the theme, wrapping if needed. */
function hueFor(i: number, hues: number[]): number {
  const seg = hues.length - 1;
  const pos = (i / Math.max(1, hues.length)) * seg;
  const lo = Math.min(Math.floor(pos), seg);
  const hi = Math.min(lo + 1, seg);
  const t = pos - lo;
  return Math.round(hues[lo] + (hues[hi] - hues[lo]) * t);
}

/**
 * Return the meteors alive at `time`. Empty when `intensity <= 0`. Each meteor
 * is positioned along its travel vector by how far it has fallen, and given a
 * streak length so it reads as a proper meteor rather than a dot.
 */
export function computeShootingStars(params: ShootingStarsParams): ShootingStar[] {
  const { time, width, height, intensity, seed, hues } = params;
  if (intensity <= 0 || hues.length === 0) return [];

  const meteors: ShootingStar[] = [];
  for (const s of shootingStarSpawns(seed, time, intensity)) {
    const elapsed = time - s.t;
    if (elapsed < 0 || elapsed > s.life) continue; // not alive now

    const speed = s.speed;
    const len = Math.min(
      460,
      Math.max(140, speed * s.life * SHOOTING_LEN_FACTOR),
    );
    const headX = s.x0 + Math.cos(s.angle) * speed * elapsed;
    const headY = s.y0 + Math.sin(s.angle) * speed * elapsed;

    // Keep a meteor on screen: if its head has fallen past the bottom, clamp
    // the visible portion so we never draw a meteor whose head is off-canvas.
    if (headY > height + len) continue;
    if (headX < -len || headX > width + len) continue;

    meteors.push({
      x: headX,
      y: headY,
      len,
      angle: s.angle,
      width: 1.4 + (s.speed - SHOOTING_SPEED_MIN) / (SHOOTING_SPEED_MAX - SHOOTING_SPEED_MIN) * 1.6,
      hue: hueFor(Math.round(s.t * 10), hues),
    });

    if (meteors.length >= SHOOTING_MAX_ALIVE) break;
  }
  return meteors;
}
