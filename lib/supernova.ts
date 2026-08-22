/**
 * Supernova — a distant star that quietly lives, then periodically explodes.
 *
 * Every other sky layer is either a field of stars or a soft, *continuous*
 * glow/motion (nebula, aurora, meteors, the moon's steady drift). Supernova is
 * something different: a single, rare, *discrete event*. A background star
 * sits quietly for a long intermission, then over ~17s brightens to a brilliant
 * blue-white flash (with diffraction spikes and an expanding shockwave ring),
 * fades to a faint remnant, and goes quiet again — for a while.
 *
 * It reads as a supernova happening inside the distant spiral we are looking
 * at: a moment of wonder in an otherwise calm sky. Pure atmosphere, off by
 * default, and fully orthogonal to gravity, warp, nebula, constellations,
 * meteors, variable stars, Stellar Depth, the comet, the moon and zoom — none
 * of them read this. It is painted *behind* the stars, so the interactive
 * galaxy stays in the foreground.
 *
 * Everything here is a pure, deterministic function of a monotonic running
 * `time` (ms) and a seed, so the explosions happen at the same places and on
 * the same schedule every session. The timeline, phases and colours are all
 * exposed as plain numbers so the behaviour is unit-tested without a canvas.
 */

/** Seed for the deterministic per-explosion placement + intermission jitter. */
export const SUPERNOVA_SEED = 7;

/** Rise phase: 0 → full brightness (ms). */
export const SUPERNOVA_RISE_MS = 2_500;
/** Peak phase: held near full brightness (ms). */
export const SUPERNOVA_PEAK_MS = 1_500;
/** Fade phase: full brightness → gone, with the shockwave expanding (ms). */
export const SUPERNOVA_FADE_MS = 12_000;
/** After the flash, a faint remnant point lingers before going quiet (ms). */
export const SUPERNOVA_REMNANT_MS = 3_000;

/** Shortest intermission between the end of one explosion and the start of the
 * next (ms). */
export const SUPERNOVA_MIN_INTERMISSION_MS = 40_000;
/** Longest intermission between explosions (ms). */
export const SUPERNOVA_MAX_INTERMISSION_MS = 70_000;

/**
 * The four phases of a single explosion, in order. `quiet` is the intermission
 * between explosions (no supernova drawn).
 */
export type SupernovaPhase = "quiet" | "rising" | "peak" | "fading" | "remnant";

/** The full description of the supernova at a given instant. */
export interface SupernovaState {
  /** Which phase we are in. `quiet` ⇒ nothing is drawn. */
  phase: SupernovaPhase;
  /** Center x, in px, in the current sky. */
  x: number;
  /** Center y, in px, in the current sky. */
  y: number;
  /**
   * How bright the flash is, 0 (invisible) … 1 (peak). Drives core glow and
   * diffraction-spike length.
   */
  intensity: number;
  /**
   * Radius (px) of the expanding shockwave shell. 0 until the fade phase
   * begins, then grows until it has expanded well past the star.
   */
  shellRadius: number;
  /** Alpha (0..1) of the shockwave shell; fades as it expands. */
  shellAlpha: number;
  /** Alpha (0..1) of the faint lingering remnant point after the flash. */
  remnantAlpha: number;
  /** Length (px) of the diffraction spikes at full intensity, scaled by 100. */
  spikeLength: number;
}

/** Total time (ms) a single explosion is "active" (rise + peak + fade). */
export const SUPERNOVA_EXPLOSION_MS =
  SUPERNOVA_RISE_MS + SUPERNOVA_PEAK_MS + SUPERNOVA_FADE_MS;

/** The phase label for accessibility / share previews, e.g. "Supernova: Flash". */
export function describeSupernovaPhase(phase: SupernovaPhase): string {
  switch (phase) {
    case "rising":
      return "Supernova: Rising";
    case "peak":
      return "Supernova: Flash";
    case "fading":
      return "Supernova: Fading";
    case "remnant":
      return "Supernova: Remnant";
    default:
      return "Quiet sky";
  }
}

/**
 * mulberry32 — a tiny, fast, deterministic PRNG. Given the same seed it
 * produces the same sequence, so the schedule and placement are reproducible.
 * (Not cryptographically safe, which is exactly what we want here.)
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
 * The intermission (ms) before explosion `index` (0-based). Deterministic from
 * the seed, and gently increasing so explosions come a little faster the
 * longer the sky has been alive — never below the floor or above the ceiling.
 */
export function intermissionFor(index: number, seed: number): number {
  const rng = seedRng(seed ^ (index * 0x9e3779b1));
  const base = SUPERNOVA_MIN_INTERMISSION_MS;
  const span = SUPERNOVA_MAX_INTERMISSION_MS - SUPERNOVA_MIN_INTERMISSION_MS;
  return base + rng() * span;
}

/**
 * The cumulative wall-clock time (ms) at which explosion `index` *starts*,
 * measured from when the supernova layer was enabled. `explosionFor(0)` is the
 * first intermission; each later one adds the previous explosion's full
 * active time plus its own intermission.
 */
export function explosionStartAt(index: number, seed: number): number {
  let acc = 0;
  for (let i = 0; i <= index; i++) {
    acc += intermissionFor(i, seed);
    if (i < index) acc += SUPERNOVA_EXPLOSION_MS + SUPERNOVA_REMNANT_MS;
  }
  return acc;
}

/**
 * Whether the star is currently exploding (any phase other than `quiet`).
 */
export function isSupernovaActive(phase: SupernovaPhase): boolean {
  return phase !== "quiet";
}

/**
 * Compute the supernova's state for a given running `time` (ms) in a sky of the
 * given size. Deterministic: the same (time, size, seed) always yields the same
 * state. The star sits at a fixed, seeded position (kept off the centre so it
 * never overlaps the interactive galaxy, and padded from the edges); explosions
 * happen on the deterministic schedule and advance through rise → peak → fade →
 * remnant → quiet.
 *
 * Returns a `quiet` state (intensity 0, no shell/remnant) when no explosion is
 * active, so the caller can draw nothing.
 */
export function computeSupernova({
  time,
  width,
  height,
  seed = SUPERNOVA_SEED,
}: {
  time: number;
  width: number;
  height: number;
  seed?: number;
}): SupernovaState {
  const quiet: SupernovaState = {
    phase: "quiet",
    x: 0,
    y: 0,
    intensity: 0,
    shellRadius: 0,
    shellAlpha: 0,
    remnantAlpha: 0,
    spikeLength: 0,
  };

  // Find the active explosion, if any, by walking the deterministic timeline.
  // Intermissions are >= MIN_INTERMISSION_MS, so the loop is short even for a
  // very long session; it breaks as soon as it passes `time`.
  const edge = 60; // px padding from the sky edges.
  const galaxyGuard = Math.min(width, height) * 0.18; // keep clear of the galaxy.
  let x = 0;
  let y = 0;
  let acc = 0;
  let index = 0;
  for (;;) {
    const start = acc + intermissionFor(index, seed);
    const explosionEnd = start + SUPERNOVA_EXPLOSION_MS;
    const remnantEnd = explosionEnd + SUPERNOVA_REMNANT_MS;
    // Before this explosion has started we are still in an intermission ⇒ quiet.
    if (time < start) {
      return quiet;
    }
    if (time < remnantEnd) {
      // Place the star once, deterministically, on the first pass.
      if (x === 0 && y === 0) {
        const rng = seedRng(seed ^ 0xdeadbeef);
        // Pick a position across the sky, avoiding the centre and the edges.
        let px: number, py: number;
        do {
          px = edge + rng() * (width - 2 * edge);
          py = edge + rng() * (height - 2 * edge);
        } while (
          Math.hypot(px - width / 2, py - height / 2) < galaxyGuard
        );
        x = px;
        y = py;
      }
      const c = time - start; // clock within this event.
      if (c < SUPERNOVA_RISE_MS) {
        const t = c / SUPERNOVA_RISE_MS;
        return {
          phase: "rising",
          x,
          y,
          intensity: t, // 0 → 1.
          shellRadius: 0,
          shellAlpha: 0,
          remnantAlpha: 0,
          spikeLength: t,
        };
      }
      const peakEnd = SUPERNOVA_RISE_MS + SUPERNOVA_PEAK_MS;
      if (c < peakEnd) {
        const t = (c - SUPERNOVA_RISE_MS) / SUPERNOVA_PEAK_MS;
        // A subtle double-pulse at peak so it "detonates" rather than just
        // snapping on.
        const intensity = 1 - 0.12 * Math.sin(t * Math.PI);
        return {
          phase: "peak",
          x,
          y,
          intensity,
          shellRadius: 0,
          shellAlpha: 0,
          remnantAlpha: 0,
          spikeLength: 1,
        };
      }
      const fadeEnd = peakEnd + SUPERNOVA_FADE_MS;
      if (c < fadeEnd) {
        const t = (c - peakEnd) / SUPERNOVA_FADE_MS; // 0 → 1 across the fade.
        const intensity = 1 - t; // 1 → 0.
        const shellRadius = 4 + t * Math.max(width, height) * 0.35;
        const shellAlpha = 0.6 * (1 - t);
        return {
          phase: "fading",
          x,
          y,
          intensity,
          shellRadius,
          shellAlpha,
          remnantAlpha: 0,
          spikeLength: 1 - t,
        };
      }
      // Remnant: a faint residual glow shrinking away.
      const t = (c - fadeEnd) / SUPERNOVA_REMNANT_MS;
      return {
        phase: "remnant",
        x,
        y,
        intensity: 0.25 * (1 - t),
        shellRadius: 4 + Math.max(width, height) * 0.35,
        shellAlpha: 0.15 * (1 - t),
        remnantAlpha: 0.6 * (1 - t),
        spikeLength: 0,
      };
    }
    acc = remnantEnd;
    index++;
    // Safety net for a session long enough to overflow the loop in practice:
    // once we've walked past a very large time, fall back to the tail modulo so
    // the function still returns promptly and deterministically.
    if (index > 100_000) {
      const loop = SUPERNOVA_MIN_INTERMISSION_MS + SUPERNOVA_EXPLOSION_MS + SUPERNOVA_REMNANT_MS;
      const tail = ((time - acc) % loop);
      // Place near the centre-ish so the fallback is always visible.
      return {
        phase: "fading",
        x: width * 0.5,
        y: height * 0.4,
        intensity: 0.5,
        shellRadius: 4 + Math.max(width, height) * 0.17,
        shellAlpha: 0.3,
        remnantAlpha: 0,
        spikeLength: 0.5,
      };
    }
  }
}
