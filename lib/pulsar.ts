/**
 * Pulsar — a lighthouse neutron star.
 *
 * Every sky body already shipped is either a slow-drifting world (the moon, the
 * distant galaxy, the black hole, the ringed giant), a soft glow / atmosphere
 * (nebula, aurora, comet tail), a lit sphere, or an extreme body. None of them
 * is *time-keeping*: they all hold a steady shape and drift on clocks that are
 * far slower than a human notice. The Pulsar adds a genuinely different kind of
 * sky body — a rapidly rotating neutron star whose twin radiation beams sweep
 * across the sky like a lighthouse, so its core *pulses* on its own rhythm.
 *
 * A real pulsar is a collapsed stellar core that spins many times a second and
 * fires beams of radiation from its magnetic poles. Where those beams sweep
 * past the viewer, an observer sees regular pulses — which is exactly the
 * behaviour this module fakes: a tiny, brilliant core whose brightness spikes
 * once every time a beam swings toward the centre of the screen, with two soft
 * radiative cones sweeping out from it.
 *
 * The sweep is the new ingredient, and it is deliberately slow (see
 * `PULSAR_PERIOD_MS`) so it reads as a living, breathing beacon rather than a
 * strobe. The pulsar also drifts slowly across the sky on its own clock, like
 * the moon and the ringed giant, so it is never pinned to one spot.
 *
 * Everything here is a pure, deterministic function of the running `time`
 * (ms) and the sky size, so the pulse stays in step between frames and the
 * same link always shows the same pulsar, palette and sweep. The beam-direction
 * geometry and the pulse factor are exposed as plain numbers so the whole
 * behaviour is unit-tested without a canvas.
 *
 * Pure atmosphere: off by default, painted behind the stars, and fully
 * orthogonal to gravity, warp, nebula, constellations, meteors, variable stars,
 * Stellar Depth, zoom, the comet, the aurora, the moon, supernovae, the distant
 * galaxy and the black hole — none of them read this.
 */

/** Seed for the deterministic placement, palette and sweep geometry. */
export const PULSAR_SEED = 7;

/**
 * How long one full rotation takes (ms). Real pulsar spin ranges from
 * milliseconds to seconds; we pick a leisurely ~1.3 s so the lighthouse sweep
 * reads as a slow, living beacon rather than a strobe.
 */
export const PULSAR_PERIOD_MS = 1300;

/** How long a single sky-crossing takes (ms). A slow, meditative drift. */
export const PULSAR_TRANSIT_MS = 400_000;

/** Pulsar core radius as a fraction of the smaller sky dimension. */
export const PULSAR_RADIUS_FRACTION = 0.02;

/** Clamp the core to a comfortable on-screen range (px). */
export const PULSAR_CORE_MIN = 3;
export const PULSAR_CORE_MAX = 9;

/** Beam half-opening angle (radians) — how wide each radiative cone sweeps. */
export const PULSAR_BEAM_HALF_ANGLE = 0.42;

/** How far the beams reach, as a fraction of the sky's diagonal. */
export const PULSAR_BEAM_LENGTH_FRACTION = 0.9;

/**
 * Tilt of the rotation axis from straight up (radians). The beams sweep an arc
 * about this axis rather than a full circle, so the pulsar oscillates like a
 * real lighthouse seen at an inclination.
 */
export const PULSAR_AXIS_TILT = 0.5;

/**
 * Offset (radians) between the rotation axis and the beam axis. This is what
 * makes the beam sweep an arc at all — a beam exactly on the rotation axis
 * would never pulse.
 */
export const PULSAR_POLE_OFFSET = 0.6;

/** The two opposing beams are exactly opposite down the rotation sweep. */
export const PULSAR_BEAMS_OPPOSITE = Math.PI;

/** A single radiative beam: a unit direction and the cone it sweeps through. */
export interface PulsarBeam {
  /** Unit direction of the beam centre (screen space: +x right, +y down). */
  x: number;
  /** Unit direction of the beam centre (screen space: +x right, +y down). */
  y: number;
}

/** The full, static description of the pulsar at a given instant. */
export interface PulsarState {
  /** Center x, in px. */
  x: number;
  /** Center y, in px. */
  y: number;
  /** Rest radius of the bright core, in px (before the pulse scales it up). */
  coreRadius: number;
  /**
   * Pulse 0…1: how strongly the core is flaring right now. 1 when a beam faces
   * the centre of the screen (a "pulse"), near 0 when a beam points away.
   */
  pulse: number;
  /** The two opposing beams (one points toward the viewer, one away, per frame). */
  beams: [PulsarBeam, PulsarBeam];
  /** Tilt of the rotation axis (radians), exposed for tests / debugging. */
  tilt: number;
  /** Current spin angle (radians) of the star. */
  spinAngle: number;
  /** Hex colour of the beams / core. */
  color: string;
}

/** A few compact-neutron-star palettes. One is chosen deterministically from the seed. */
const PALETTES: string[][] = [
  // Cytron — a cool, hard cyan-white.
  ["#baf6ff", "#8fe3ff", "#c9fbff"],
  // Vela — a crisp blue-white.
  ["#a9c7ff", "#7aa8ff", "#d4e2ff"],
  // Fireball — a hot, intense white-blue.
  ["#dff2ff", "#a0d0ff", "#f2f8ff"],
  // Gem — an electric violet neutron star.
  ["#d6b8ff", "#b48cff", "#efe0ff"],
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
 * The unit direction of a beam after the star has spun by `spinAngle` radians,
 * given a rotation-axis `tilt` and a beam/axis `poleOffset`.
 *
 * The beam axis sits `poleOffset` off the rotation axis, and the star's spin
 * carries it around a cone. Projected onto the 2D sky (the out-of-plane
 * component dropped) the beam oscillates along an arc about the tilted axis:
 *
 *   dir = cos(poleOffset)·A + sin(poleOffset)·cos(spinAngle)·U
 *
 * where `A` is the tilted rotation axis (pointing up) and `U` is the in-plane
 * perpendicular to it. Normalised, this is the beam's sweep direction — a clean
 * lighthouse arc rather than a full 360° spin.
 */
export function beamDirectionAt({
  spinAngle,
  tilt,
  poleOffset,
}: {
  spinAngle: number;
  tilt: number;
  poleOffset: number;
}): { x: number; y: number } {
  const sinTilt = Math.sin(tilt);
  const cosTilt = Math.cos(tilt);
  const sinSpin = Math.sin(spinAngle);
  const cosPO = Math.cos(poleOffset);
  const sinPO = Math.sin(poleOffset);
  // A = (sin(tilt), -cos(tilt)); U = (cos(tilt), sin(tilt)).
  let x = cosPO * sinTilt + sinPO * sinSpin * cosTilt;
  let y = -cosPO * cosTilt + sinPO * sinSpin * sinTilt;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/**
 * The pulse factor — how strongly a beam faces the viewer right now.
 *
 * `towardViewer` is the unit vector from the pulsar toward the centre of the
 * screen. `beamDir` is the (unit) beam direction. The viewer sees a pulse when
 * a beam points at them, so the factor is the absolute cosine between them:
 * `|cos θ|`, which is 1 when a beam points straight at the viewer and 0 when a
 * beam is edge-on. Both opposing beams are captured by the absolute value, so a
 * full rotation yields one pulse per beam — two pulses per rotation.
 */
export function pulseFactor(beamDir: { x: number; y: number }, towardViewer: { x: number; y: number }): number {
  // |dot(a, b)| for unit vectors = |cos θ|.
  return Math.abs(beamDir.x * towardViewer.x + beamDir.y * towardViewer.y);
}

/** Normalise an arbitrary vector, returning {x, y} with length 1 (or {0,0}). */
function normalize(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

/**
 * Compute the pulsar's state for a given running `time` (ms) in a sky of the
 * given size. Deterministic: the same (time, size) always yields the same
 * state. The pulsar drifts across the sky on the transit clock; its palette,
 * sweep geometry and pulse are fixed per seed.
 */
export function computePulsar({
  time,
  width,
  height,
  seed = PULSAR_SEED,
  tilt = PULSAR_AXIS_TILT,
  poleOffset = PULSAR_POLE_OFFSET,
}: {
  time: number;
  width: number;
  height: number;
  seed?: number;
  tilt?: number;
  poleOffset?: number;
}): PulsarState {
  // Drift: 0 (just risen, left edge) … 1 (set, right edge), on a gentle arc.
  const t = (time % PULSAR_TRANSIT_MS) / PULSAR_TRANSIT_MS;
  const margin = Math.max(width, height) * 0.06;
  const radius = Math.min(width, height) * PULSAR_RADIUS_FRACTION;
  const x = lerp(margin, width - margin, t);
  const baseY = height * 0.22;
  const dip = height * 0.05;
  const y = baseY + Math.sin(t * Math.PI) * dip;

  // Spin angle within the current rotation.
  const spinAngle = ((time % PULSAR_PERIOD_MS) / PULSAR_PERIOD_MS) * Math.PI * 2;

  // The two opposing beams.
  const north = beamDirectionAt({ spinAngle, tilt, poleOffset });
  const south: PulsarBeam = { x: -north.x, y: -north.y };

  // Toward the centre of the screen — where the viewer "is".
  const towardViewer = normalize({ x: width / 2 - x, y: height / 2 - y });

  // A pulse happens each time *either* beam faces the viewer, so combine both
  // with a max (equivalently |dot| of the north beam, since south is −north).
  const pulse = Math.max(pulseFactor(north, towardViewer), pulseFactor(south, towardViewer));

  const palette = PALETTES[seed % PALETTES.length];

  return {
    x,
    y,
    coreRadius: Math.max(PULSAR_CORE_MIN, Math.min(PULSAR_CORE_MAX, radius)),
    pulse,
    beams: [north, south],
    tilt,
    spinAngle,
    color: palette[0],
  };
}

/**
 * The beam's outer endpoint (px) given the pulsar centre, a beam direction and
 * the requested beam length. Used by the draw code to cone the beams out.
 */
export function beamEndpoint(
  cx: number,
  cy: number,
  beam: PulsarBeam,
  length: number,
): { x: number; y: number } {
  return { x: cx + beam.x * length, y: cy + beam.y * length };
}

/**
 * The human-readable name of the pulsar for accessibility labels.
 */
export function describePulsar(pulse: number): string {
  return `Pulsar · pulse ${Math.round(pulse * 100)}`;
}
