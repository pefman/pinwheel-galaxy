/**
 * Comet Voyager — a wandering comet.
 *
 * Everything that moves in the sky so far is either pinned to the pointer (the
 * Comet Trail), placed by the visitor (the black hole), or on a slow,
 * meditative drift (the moon, the ringed giant). The Comet Voyager adds the
 * one thing none of them are: a *visitor of the sky* — a lone comet that
 * arrives on its own clock, arcs across the hero on a long curved path, and
 * is gone before you have had time to call it back.
 *
 * The flight is fully deterministic: each cycle (`VOYAGER_CYCLE_MS`) produces
 * exactly one flight, and the seed + cycle index fix the spawn edge, the exit
 * edge, the arc's bend, the flight's duration and where in the cycle it starts.
 * A quadratic Bézier carries the head from spawn to exit, eased with a
 * cosine smoothstep so the comet accelerates through the middle of its arc
 * (the perihelion rush of a real comet) and eases out near the horizon. The
 * tail is a true trail: it re-samples the same pure path at slightly earlier
 * times, so every frame's tail is exactly where the comet has just been.
 *
 * When the gravity well is live (the cursor is over the galaxy and gravity is
 * on) the comet's path bends *toward* it — a soft slingshot attraction with a
 * capped deflection — so holding the pointer near the path visibly pulls the
 * comet off course, the way the stars lean into the well.
 *
 * Everything here is a pure, deterministic function of the running `time`
 * (ms), the sky size, the seed and the well's position, so the same link
 * always shows the same voyager and the whole behaviour is unit-tested
 * without a canvas.
 *
 * Pure atmosphere: off by default, painted in front of the stars, and fully
 * orthogonal to gravity, warp, nebula, constellations, meteors, variable
 * stars, Stellar Depth, zoom, the comet trail, the aurora, the moon,
 * supernovae, the distant galaxy, the black hole, the ringed giant and the
 * pulsar — none of them read this.
 */

/** Seed for the deterministic flight schedule and arc geometry. */
export const VOYAGER_SEED = 13;

/**
 * One cycle: exactly one flight per cycle. Long enough that the comet feels
 * rare (a visitor, not traffic), short enough that a visitor who switches the
 * layer on will see one without long patience.
 */
export const VOYAGER_CYCLE_MS = 12_000;

/** Shortest flight (ms). */
export const VOYAGER_FLIGHT_MIN_MS = 4_800;

/** Longest flight (ms). */
export const VOYAGER_FLIGHT_MAX_MS = 7_800;

/**
 * On the very first cycle only, the flight always starts within this delay
 * (ms) of the clock beginning, so enabling the layer shows a comet almost
 * immediately instead of making the visitor wait for a full cycle.
 */
export const VOYAGER_FIRST_CYCLE_DELAY_MAX_MS = 2_000;

/** Number of tail samples (including the head). */
export const VOYAGER_TAIL_POINTS = 22;

/** How far back in time (ms) the tail reaches. */
export const VOYAGER_TAIL_SPAN_MS = 1_000;

/** Speed (px/s) at which the tail is at full glow; slower is dimmer/shorter. */
export const VOYAGER_SPEED_FULL_PX_S = 420;

/** Gravity-well attraction strength (px²) — scales as 1/distance. */
export const VOYAGER_WELL_STRENGTH = 16_000;

/** Softening distance (px) that keeps the well's pull finite at close range. */
export const VOYAGER_WELL_SOFTEN = 150;

/** The well can never pull the comet more than this (px) off its path. */
export const VOYAGER_MAX_DEFLECTION = 90;

/** A point in screen space (px). */
export interface VoyagerPoint {
  x: number;
  y: number;
}

/** The full state of the voyager at a given instant. */
export interface VoyagerState {
  /** Whether the comet is in flight right now (its head is on its path). */
  inFlight: boolean;
  /** Head x, in px (0 when not in flight). */
  x: number;
  /** Head y, in px (0 when not in flight). */
  y: number;
  /** 0…1 progress along the flight (0 when not in flight). */
  progress: number;
  /** Head speed, in px/s (0 when not in flight). */
  speed: number;
  /**
   * Tail samples: `tail[0]` is the head, the last sample is the tip. Empty
   * when not in flight. Each sample is the head's position at a slightly
   * earlier time, so the tail is the comet's true trail.
   */
  tail: VoyagerPoint[];
}

/** The deterministic description of one flight within one cycle. */
interface FlightPlan {
  /** When the flight starts, in ms from the cycle's start. */
  flightStart: number;
  /** How long the flight lasts (ms). */
  flightDur: number;
  /** Where the head enters from (just outside the viewport). */
  spawn: VoyagerPoint;
  /** Where the head exits toward (just outside the viewport). */
  exit: VoyagerPoint;
  /** Bézier control point — pushes the path off the chord into an arc. */
  control: VoyagerPoint;
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Plan one flight for a given cycle. Pure: the same (seed, cycle, size)
 * always yields the same plan, so the same link always shows the same
 * voyager.
 */
function planForCycle(
  seed: number,
  cycle: number,
  width: number,
  height: number,
): FlightPlan {
  const rng = seedRng((seed + Math.imul(cycle, 0x9e3779b9)) >>> 0);

  const flightDur = lerp(VOYAGER_FLIGHT_MIN_MS, VOYAGER_FLIGHT_MAX_MS, rng());
  // Keep a quiet gap at the end of every cycle so flights never collide.
  const latestStart = Math.max(0, VOYAGER_CYCLE_MS - flightDur - 1_500);
  const maxDelay =
    cycle === 0
      ? Math.min(VOYAGER_FIRST_CYCLE_DELAY_MAX_MS, latestStart)
      : latestStart;
  const flightStart = rng() * maxDelay;

  // Spawn edge: any of the four. Exit edge: never the same edge — the
  // opposite one (a true crossing) or one of the two adjacent ones (a long
  // diagonal sweep).
  const spawnEdge = Math.floor(rng() * 4);
  const exitEdge = (spawnEdge + [2, 1, 3][Math.floor(rng() * 3)]) % 4;

  // Spawn/exit points sit just outside the viewport so the head enters and
  // leaves cleanly off-screen.
  const out = Math.max(width, height) * 0.12;
  const pointOnEdge = (edge: number, f: number): VoyagerPoint => {
    switch (edge) {
      case 0:
        return { x: -out, y: f * height }; // left
      case 1:
        return { x: f * width, y: -out }; // top
      case 2:
        return { x: width + out, y: f * height }; // right
      default:
        return { x: f * width, y: height + out }; // bottom
    }
  };
  const spawn = pointOnEdge(spawnEdge, 0.15 + rng() * 0.7);
  const exit = pointOnEdge(exitEdge, 0.15 + rng() * 0.7);

  // Control point: the chord's midpoint pushed perpendicular to the chord by
  // a per-cycle bend, giving the path its arc (sign and amount vary).
  const mx = (spawn.x + exit.x) / 2;
  const my = (spawn.y + exit.y) / 2;
  const dx = exit.x - spawn.x;
  const dy = exit.y - spawn.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = (rng() * 2 - 1) * 0.35 * Math.min(width, height);
  const control = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };

  return { flightStart, flightDur, spawn, exit, control };
}

/** Point on the quadratic Bézier at parameter `t` (0…1). */
function bezier(
  a: VoyagerPoint,
  c: VoyagerPoint,
  b: VoyagerPoint,
  t: number,
): VoyagerPoint {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * The head's position at a given `time` under a flight `plan`. The Bézier
 * parameter is a cosine smoothstep of the flight progress, so the comet
 * accelerates through the middle of its arc and eases out — the perihelion
 * rush. When a `well` is present, a capped slingshot attraction pulls the
 * position toward it.
 */
function positionAt(
  time: number,
  plan: FlightPlan,
  well: VoyagerPoint | null,
): { x: number; y: number; t: number; inFlight: boolean } {
  const inFlight =
    time >= plan.flightStart && time < plan.flightStart + plan.flightDur;
  const t = clamp01((time - plan.flightStart) / plan.flightDur);
  const ease = 0.5 - 0.5 * Math.cos(Math.PI * t);
  let p = bezier(plan.spawn, plan.control, plan.exit, ease);
  if (well) {
    const dx = well.x - p.x;
    const dy = well.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-4) {
      const mag = Math.min(
        VOYAGER_MAX_DEFLECTION,
        VOYAGER_WELL_STRENGTH / (d + VOYAGER_WELL_SOFTEN),
      );
      p = { x: p.x + (dx / d) * mag, y: p.y + (dy / d) * mag };
    }
  }
  return { x: p.x, y: p.y, t, inFlight };
}

/**
 * Compute the voyager's state for a given running `time` (ms) in a sky of the
 * given size. Deterministic: the same (time, size, seed, well) always yields
 * the same state.
 */
export function computeVoyager({
  time,
  width,
  height,
  seed = VOYAGER_SEED,
  well = null,
}: {
  time: number;
  width: number;
  height: number;
  seed?: number;
  well?: VoyagerPoint | null;
}): VoyagerState {
  const t0 = Math.max(0, time);
  const cycle = Math.floor(t0 / VOYAGER_CYCLE_MS);
  const plan = planForCycle(seed, cycle, width, height);
  const head = positionAt(t0, plan, well);

  if (!head.inFlight) {
    return { inFlight: false, x: 0, y: 0, progress: 0, speed: 0, tail: [] };
  }

  // Head speed via a central difference where both samples are in flight,
  // one-sided otherwise.
  const d = 40;
  const back = positionAt(t0 - d, plan, well);
  const ahead = positionAt(t0 + d, plan, well);
  let speed = 0;
  if (back.inFlight && ahead.inFlight) {
    speed = Math.hypot(ahead.x - back.x, ahead.y - back.y) / ((2 * d) / 1000);
  } else if (ahead.inFlight) {
    speed = Math.hypot(ahead.x - head.x, ahead.y - head.y) / (d / 1000);
  } else if (back.inFlight) {
    speed = Math.hypot(head.x - back.x, head.y - back.y) / (d / 1000);
  }

  // Tail: re-sample the same pure path at slightly earlier times. The head
  // is sample 0; the trail stops where the flight began.
  const tail: VoyagerPoint[] = [];
  for (let i = 0; i < VOYAGER_TAIL_POINTS; i++) {
    const ts = t0 - (i * VOYAGER_TAIL_SPAN_MS) / (VOYAGER_TAIL_POINTS - 1);
    const s = positionAt(ts, plan, well);
    if (!s.inFlight) break;
    tail.push({ x: s.x, y: s.y });
  }

  return { inFlight: true, x: head.x, y: head.y, progress: head.t, speed, tail };
}
