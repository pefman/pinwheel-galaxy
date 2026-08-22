/**
 * Nebula Drift — living depth backdrop geometry.
 *
 * Pure, side-effect-free maths for the nebula layer that StarField paints
 * *behind* the stars. Given the current time, canvas size, galaxy centre, and
 * a cursor parallax offset, it returns the position / colour / opacity of each
 * drifting nebula cloud. Kept pure so the behaviour can be unit-tested without
 * a canvas or a browser.
 *
 * Design intent:
 * - 3 clouds at different "depths" create a parallax sense of 3D space — the
 *   closer layers shift more with the cursor than the farther ones.
 * - Each cloud slowly orbits the galaxy centre and gently "breathes" (its
 *   alpha rises and falls on a sine wave with a per-layer phase offset).
 * - Colours are derived from the galaxy's active theme hue, so the nebula
 *   always stays in sync with whatever theme the visitor has selected.
 */

export interface NebulaLayerDef {
  /** 0..1 — how strongly the layer follows the cursor (closer = more). */
  depth: number;
  /** Cloud radius as a fraction of the smaller canvas dimension. */
  radiusFrac: number;
  /** Hue offset (deg) relative to the active theme hue. */
  hueShift: number;
  /** Base opacity before the breathing modulation is applied. */
  baseAlpha: number;
  /** Orbital spin rate (radians/second). Negative = reverse. */
  spin: number;
}

/** The three depth layers, far → near. */
export const NEBULA_LAYERS: readonly NebulaLayerDef[] = [
  { depth: 0.25, radiusFrac: 0.58, hueShift: 0, baseAlpha: 0.16, spin: 0.006 },
  { depth: 0.55, radiusFrac: 0.46, hueShift: 130, baseAlpha: 0.18, spin: -0.008 },
  { depth: 0.9, radiusFrac: 0.36, hueShift: 250, baseAlpha: 0.14, spin: 0.01 },
];

export interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  hue: number;
  alpha: number;
}

export interface NebulaParams {
  time: number; // seconds since start
  width: number; // canvas client width (px)
  height: number; // canvas client height (px)
  centerX: number; // galaxy centre x (screen px)
  centerY: number; // galaxy centre y (screen px)
  parallaxX: number; // cursor offset from centre (screen px)
  parallaxY: number; // cursor offset from centre (screen px)
  hues: number[]; // active theme hues (deg)
}

/**
 * Compute the nebula cloud layer for one frame. Pure: same inputs → same
 * output, so it is deterministic and unit-testable.
 */
export function computeNebulaClouds({
  time,
  width,
  height,
  centerX,
  centerY,
  parallaxX,
  parallaxY,
  hues,
}: NebulaParams): NebulaCloud[] {
  const minDim = Math.min(width, height);
  const baseHue = hues[0] ?? 260;

  return NEBULA_LAYERS.map((layer, i) => {
    // Slow orbit around the galaxy centre.
    const angle = time * layer.spin + i;
    const orbit = minDim * 0.16;
    const bx = centerX + Math.cos(angle) * orbit + parallaxX * layer.depth * 0.3;
    const by =
      centerY + Math.sin(angle) * orbit * 0.75 + parallaxY * layer.depth * 0.3;
    const radius = minDim * layer.radiusFrac;
    // Gentle breathing: 0..1 sine, phase-offset per layer so they don't pulse
    // in lock-step.
    const breathe = 0.5 + 0.5 * Math.sin(time * 0.5 + i);
    const hue = ((baseHue + layer.hueShift + time * 3) % 360 + 360) % 360;
    const alpha = layer.baseAlpha * (0.65 + 0.35 * breathe);
    return { x: bx, y: by, radius, hue, alpha };
  });
}
