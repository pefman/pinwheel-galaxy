"use client";

/**
 * StarField — the "Gravity Well" interactive starfield.
 *
 * A full-screen canvas background in which stars are arranged into a slowly
 * rotating spiral (pinwheel) galaxy. Moving the cursor creates a gravitational
 * well that pulls nearby stars toward it; clicking fires a radial pulse that
 * flings stars outward. Stars spring back to their orbital rest position when
 * left alone, so the galaxy always settles back into its spiral shape.
 *
 * Design notes:
 * - Everything is additive and client-only; the component is a self-contained
 *   background layer that never blocks or reflow the page.
 * - Performance: frames are throttled by requestAnimationFrame, the device
 *   pixel ratio is capped, and the canvas resizes on viewport changes.
 * - Accessibility: when `prefers-reduced-motion` is set, gravitational
 *   interactivity is disabled and stars only drift with the galaxy spin.
 * - Galaxy Zoom (opt-in via `zoomEnabled`): wheel / trackpad / two-finger
 *   pinch gestures dolly into the starfield. The galaxy is rendered inside a
 *   `zoom`-scaled transform around its centre while its stars are drawn at
 *   `1 / zoom`, so it approaches the viewer instead of bloating.
 */

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CONFIG, GalaxyConfig, THEMES } from "@/lib/galaxyPresets";
import {
  computeNebulaClouds,
  NebulaCloud,
} from "@/lib/nebula";
import {
  computeShootingStars,
  ShootingStar,
} from "@/lib/shootingStars";
import {
  ZOOM_DEFAULT,
  ZOOM_EASE,
  easeZoom,
  screenSizeScale,
  applyZoomMultiplier,
  wheelDeltaToMultiplier,
} from "@/lib/zoom";
import {
  DEPTH_SEED,
  depthForIndex,
  depthScale,
  twinkleAlpha,
  twinklePhase,
} from "@/lib/starDepth";
import {
  VARIABLE_SEED,
  type VariableStar,
  assignVariableStars,
  variableAlpha,
  variableSize,
} from "@/lib/variableStars";
import {
  cursorSpeed,
  lerp,
  polylineLength,
  resampleTail,
  tailLengthFromSpeed,
  type Point as CometPoint,
} from "@/lib/comet";
import {
  AURORA_SAMPLES,
  auroraEdgePoints,
  computeAuroraBands,
  type AuroraBand,
} from "@/lib/aurora";
import {
  computeMoon,
  describeMoonPhase,
  terminatorXRadius,
  type MoonState,
} from "@/lib/moon";
import {
  computeRingedGiant,
  projectRingParticle,
  particleAngleAt,
  type RingedGiantState,
} from "@/lib/ringedGiant";
import { computeSupernova } from "@/lib/supernova";
import {
  computePulsar,
  beamEndpoint,
  PULSAR_BEAM_LENGTH_FRACTION,
  PULSAR_BEAM_HALF_ANGLE,
  type PulsarState,
} from "@/lib/pulsar";
import {
  ROTATION_SECONDS_PER_TURN,
  computeDistantGalaxy,
  type DistantGalaxy,
} from "@/lib/distantGalaxy";
import {
  DISK_RPS,
  DISK_OUTER_FRACTION,
  computeBlackHole,
  accretionPoint,
  dopplerFactor,
  dopplerHue,
  einsteinRadius,
  isInsideEventHorizon,
  type BlackHoleState,
} from "@/lib/blackHole";

const SPRING_K = 0.02; // how strongly stars return to their orbit
const DAMPING = 0.86; // velocity damping per frame
const ATTRACT_RADIUS = 220; // px around the cursor that stars feel the well
const ATTRACT_STRENGTH = 0.9;
const PULSE_SPEED = 520; // px/s for click shockwave
const PULSE_WIDTH = 120; // px thickness of the shockwave ring
const PULSE_STRENGTH = 260; // px/s kick given to stars a pulse crosses
const DPR_CAP = 2;

// Constellation mode: connect nearby stars with faint linking lines.
const CONSTELLATION_MAX_DIST = 96; // px — two stars link when closer than this
const CONSTELLATION_MIN_ALPHA = 0.06;
const CONSTELLATION_MAX_ALPHA = 0.32;

// Warp Drive: crank the galaxy's spin fast enough and the stars start to
// stretch into hyperspace motion streaks. This gives the "Spin" knob a real,
// visible payoff — the faster the galaxy rotates, the deeper the warp.
const WARP_RPM_THRESHOLD = 10; // rpm at which streaks first appear
const WARP_RPM_RANGE = 20 - WARP_RPM_THRESHOLD; // 20 is the max rpm

// Comet Trail: a glowing comet with a tapering tail trails the pointer. The
// tail length grows with cursor speed and its hue is drawn from the theme.
const COMET_HISTORY_MAX = 48; // max pointer samples kept
const COMET_SAMPLE_MAX_AGE = 500; // ms a sample is retained before it ages out
const COMET_TAIL_POINTS = 26; // tail points resampled from the pointer path
const COMET_BASE_TAIL_LEN = 60; // px tail length at a slow drift
const COMET_MAX_TAIL_LEN = 320; // px tail length at full speed
const COMET_MAX_SPEED = 900; // px/s at which the tail reaches its max length

interface Star {
  radius: number; // orbit radius from galaxy centre (px)
  angle: number; // base angle on its spiral arm
  armOffset: number; // angular offset for this spiral arm
  size: number;
  baseAlpha: number;
  // live perturbation state
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

interface Pulse {
  x: number;
  y: number;
  radius: number;
  life: number; // 1 -> 0 as it expands
}

function createStars(
  w: number,
  h: number,
  arms: number,
  starCount: number,
  hues: number[],
): Star[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) * 0.46;
  const stars: Star[] = [];

  for (let i = 0; i < starCount; i++) {
    // Distribute along spiral arms with spread so the galaxy looks cloudy.
    const arm = i % arms;
    const armOffset = (arm / arms) * Math.PI * 2;
    const t = i / starCount;
    // Spiral: outer arms lead inner ones.
    const spiral = t * Math.PI * 2.2;
    const radiusFrac = Math.pow(t, 0.7) * 0.9 + 0.05;
    const jitter = (Math.random() - 0.5) * 0.5;
    const angle = spiral + armOffset + jitter;
    const radius = radiusFrac * maxR;

    stars.push({
      radius,
      angle,
      armOffset,
      size: Math.random() * 1.8 + 0.6,
      baseAlpha: Math.random() * 0.6 + 0.35,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      hue: hueFor(i, starCount, hues),
    });
  }
  return stars;
}

function hueFor(i: number, n: number, hues: number[]): number {
  // Spread the theme's hues evenly across all stars.
  const seg = hues.length - 1;
  const pos = (i / n) * seg;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, seg);
  const t = pos - lo;
  return Math.round(hues[lo] + (hues[hi] - hues[lo]) * t);
}

/**
 * Extract the HSL hue (0..360) from a `#rrggbb` hex colour, so the ring's glow
 * and particles can be drawn with the same hue as the giant's palette.
 */
function hexToHue(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return Math.round(r * 360);
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return Math.round(hue);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function StarField({
  active,
  config = DEFAULT_CONFIG,
  constellation = false,
  nebula = false,
  shooting = false,
  zoomEnabled = false,
  depthMode = false,
  variableMode = false,
  cometMode = false,
  auroraMode = false,
  moonMode = false,
  supernovaMode = false,
  distantMode = false,
  blackHoleMode = false,
  ringedGiantMode = false,
  pulsarMode = false,
  onZoom,
  canvasRef,
}: {
  active: boolean;
  config?: GalaxyConfig;
  constellation?: boolean;
  nebula?: boolean;
  shooting?: boolean;
  zoomEnabled?: boolean;
  /** Stellar Depth: an opt-in 3D parallax + twinkle layer over the stars. */
  depthMode?: boolean;
  /** Variable Stars: an opt-in living-sky layer — some stars brighten/dim on
   * their own light curves and a few rare giants glow larger. */
  variableMode?: boolean;
  /** Comet Trail: an opt-in glowing comet that trails the pointer, its tail
   * length growing with cursor speed and its hue drawn from the active theme. */
  cometMode?: boolean;
  /** Aurora: an opt-in northern-lights ribbon layer across the upper sky. */
  auroraMode?: boolean;
  /**
   * Lunar Transit: an opt-in moon that drifts slowly across the sky and waxes
   * and wanes through a full cycle. Pure atmosphere — never touches the stars.
   */
  moonMode?: boolean;
  /**
   * Supernova: an opt-in, rare, discrete event — a background star that lives
   * quietly, then periodically explodes into a brilliant flash that fades to a
   * faint remnant. Pure atmosphere — never touches the stars.
   */
  supernovaMode?: boolean;
  /**
   * Distant Galaxy: an opt-in far-away spiral galaxy slowly rotating in the
   * deep background. Pure atmosphere — never touches the stars.
   */
  distantMode?: boolean;
  /**
   * Black Hole: an opt-in placeable gravitational singularity with an
   * accretion disk, photon ring and event horizon. Draggable to reposition.
   * Pure atmosphere — never touches the stars or the spring physics.
   */
  blackHoleMode?: boolean;
  /**
   * Ringed Giant: an opt-in ringed gas giant that drifts slowly across the sky
   * on its own clock, its rings spinning (inner particles racing outer ones).
   * Pure atmosphere — never touches the stars or the spring physics.
   */
  ringedGiantMode?: boolean;
  /**
   * Pulsar: an opt-in lighthouse neutron star — a tiny, brilliant core whose
   * twin radiation beams sweep the sky on a slow arc and whose brightness
   * pulses rhythmically each time a beam swings toward the centre. Pure
   * atmosphere — never touches the stars or the spring physics.
   */
  pulsarMode?: boolean;
  /** Called with the live zoom whenever it changes, so the parent can share it. */
  onZoom?: (zoom: number) => void;
  /** Forwarded to the canvas element, so the parent can capture it (e.g. for a
   * shareable image export). Never triggers a re-render of the starfield. */
  canvasRef?: (el: HTMLCanvasElement | null) => void;
}) {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    let w = 0;
    let h = 0;
    const { arms, rpm, stars: STAR_COUNT, theme } = config;
    const hues = (THEMES[theme]?.hues ?? THEMES[DEFAULT_CONFIG.theme].hues) as number[];

    let stars: Star[] = [];
    // Stellar Depth: a stable per-star depth map ([0.15, 1]) and twinkle
    // phase. Built in `resize()` so it tracks the current star count but never
    // re-randomises between frames — the galaxy keeps its 3D shape.
    const depthSeed = DEPTH_SEED;
    let depths: number[] = [];
    let phases: number[] = [];
    // Variable Stars: a stable per-star light-curve profile (some stars
    // brighten/dim, giants are larger). Built in `resize()` so it tracks the
    // current star count but never re-randomises between frames.
    let variableAssign: VariableStar[] = [];
    // Stellar Depth: the eased cursor-parallax vector (px at depth 1). Near
    // stars shift by this × their depth, so the field reads as 3D.
    const parallax = { x: 0, y: 0 };
    const PARALLAX = 26;
    let raf = 0;
    let last = 0;
    // Warp Drive strength: 0 (calm) -> 1 (full warp), driven by the spin knob.
    const warpFactor =
      config.rpm > WARP_RPM_THRESHOLD
        ? (config.rpm - WARP_RPM_THRESHOLD) / WARP_RPM_RANGE
        : 0;
    const mouse = { x: -9999, y: -9999, active: false };
    const pulses: Pulse[] = [];
    let galaxyAngle = 0;
    // Nebula Drift: running clock + smoothed cursor parallax offset.
    let nebulaTime = 0;
    const nebulaParallax = { x: 0, y: 0 };
    // Shooting Stars: a running clock for the deterministic spawn timeline.
    let shootingTime = 0;
    // Galaxy Zoom: the visible zoom and its animated target. The scene is
    // scaled by `zoom` while stars are drawn at `1 / zoom`, so the galaxy
    // dollys in instead of bloating into blurry blobs.
    let zoom = ZOOM_DEFAULT;
    let targetZoom = ZOOM_DEFAULT;
    let lastPinchDist = 0;
    let lastTap = 0;
    let lastZoomBroadcast: number | undefined;
    // Comet Trail: a bounded ring buffer of recent pointer samples and the
    // eased head position the comet's bright core follows.
    const cometHistory: CometPoint[] = [];
    const cometHead = { x: -9999, y: -9999 };
    // Aurora: the static per-band geometry (built in `resize()`) and a running
    // clock. The ribbons drift on `auroraTime` and sway with the gravity well.
    let auroraTime = 0;
    let auroraBands: AuroraBand[] = [];
    let auroraSway = 0;
    // Lunar Transit: a running clock for the moon's drift + phase, plus its
    // static per-frame geometry (built in `resize()` so it tracks the current
    // sky size but never re-randomises between frames). Built when the layer is
    // on; cleared when off.
    let moonTime = 0;
    let moon: MoonState = {} as MoonState;
    // Supernova: a running clock for the deterministic explosion schedule. The
    // active explosion (position, phase, intensity, shell, remnant) is recomputed
    // each frame from this clock via `computeSupernova` — cheap arithmetic, so
    // the flash and its expanding shockwave read as smooth rather than jittery.
    let supernovaTime = 0;
    // Distant Galaxy: a running clock for the galaxy's slow rotation. Its star
    // field is built once (in `resize()`) and never re-randomises between
    // frames; only the global rotation advances on this clock.
    let distantGalaxyTime = 0;
    let distant: DistantGalaxy | null = null;
    // Black Hole: a running clock for the disk's spin, the static hole state
    // (built in `resize()` so it keeps its shape), and drag state so the visitor
    // can reposition the hole by its glow. Built when the layer is on; cleared
    // when off. Pure atmosphere — never touches the stars or the spring physics.
    let blackHoleTime = 0;
    let blackHole: BlackHoleState = {} as BlackHoleState;
    let blackHoleDragging = false;
    let blackHoleDragOffset = { x: 0, y: 0 };
    // Ringed Giant: a running clock for the giant's slow sky-crossing drift. Its
    // whole state (position, bands, ring field) is recomputed each frame from
    // this clock (cheap arithmetic) so it drifts smoothly, exactly like the
    // moon. Pure atmosphere — never touches the stars or the spring physics.
    let ringedGiantTime = 0;
    // Pulsar: a running clock for the neutron star's slow sky-crossing drift and
    // its lighthouse sweep. The whole state (position, beam direction, pulse) is
    // recomputed each frame from this clock via `computePulsar` — cheap
    // arithmetic — so the beam sweeps smoothly and the core flares in step.
    let pulsarTime = 0;
    let pulsar: PulsarState = {} as PulsarState;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(w, h, arms, STAR_COUNT, hues);
      // (Re)build the depth map and twinkle phases for the current star count.
      if (depthMode) {
        depths = stars.map((_, i) => depthForIndex(i, STAR_COUNT, depthSeed));
        phases = stars.map((_, i) => twinklePhase(i, STAR_COUNT, depthSeed));
      } else {
        depths = [];
        phases = [];
      }
      // Variable Stars: (re)build the per-star light-curve profiles for the
      // current star count when the layer is on; clear it when off.
      if (variableMode) {
        variableAssign = assignVariableStars(STAR_COUNT, VARIABLE_SEED);
      } else {
        variableAssign = [];
      }
      // Aurora: (re)build the per-band geometry for the current sky size when
      // the layer is on; clear it when off. Bands are a pure function of the
      // size + theme, so the aurora keeps its shape across resizes.
      if (auroraMode) {
        auroraBands = computeAuroraBands({
          height: h,
          hues,
        });
      } else {
        auroraBands = [];
      }
      // Distant Galaxy: (re)build the star field for the current sky size when
      // the layer is on; clear it when off. Pure function of size + seed, so it
      // keeps its shape across resizes.
      if (distantMode) {
        distant = computeDistantGalaxy({ width: w, height: h });
      } else {
        distant = null;
      }
      // Black Hole: (re)build the placeable hole for the current sky size when
      // the layer is on; clear it when off. Pure function of size + seed, so it
      // keeps its shape across resizes (dragging only repositions, never rebuilds).
      if (blackHoleMode) {
        blackHole = computeBlackHole({ width: w, height: h });
      } else {
        blackHole = {} as BlackHoleState;
      }
    };

    // The control dock (and any other element marked with `data-galaxy-ui`) is
    // a UI overlay, not part of the galaxy. Pointer events that land on it —
    // a toggle click, a hover over the glass bar — must NOT also drive the
    // starfield. The galaxy's interaction listeners live on `window`, so they
    // would otherwise fire for every dock click (adding a ripple, moving the
    // gravity well, zooming). Skip those events by checking the target.
    const overGalaxyUI = (e: Event) => {
      const ui = document.querySelector<HTMLElement>("[data-galaxy-ui]");
      return !!ui && ui.contains(e.target as Node | null);
    };
    const onMove = (e: MouseEvent) => {
      if (overGalaxyUI(e)) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const leave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onClick = (e: MouseEvent) => {
      if (overGalaxyUI(e)) return;
      pulses.push({ x: e.clientX, y: e.clientY, radius: 0, life: 1 });
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouse.active = true;
      }
    };
    const touchEnd = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    // Black Hole: drag to reposition. A press inside the hole's outer glow
    // grabs the hole; moving the pointer drags it; release lets go. Purely
    // cosmetic — repositions the state, never the spring physics.
    const blackHoleGrabRadius = () => blackHole.radius * 3.6;
    const blackHoleDown = (e: MouseEvent) => {
      if (!blackHoleMode || !blackHole) return;
      const d = Math.hypot(e.clientX - blackHole.x, e.clientY - blackHole.y);
      if (d <= blackHoleGrabRadius()) {
        blackHoleDragging = true;
        blackHoleDragOffset.x = e.clientX - blackHole.x;
        blackHoleDragOffset.y = e.clientY - blackHole.y;
      }
    };
    const blackHoleMove = (e: MouseEvent) => {
      if (!blackHoleDragging || !blackHole) return;
      blackHole.x = e.clientX - blackHoleDragOffset.x;
      blackHole.y = e.clientY - blackHoleDragOffset.y;
    };
    const blackHoleUp = () => {
      blackHoleDragging = false;
    };
    const blackHoleTouchStart = (e: TouchEvent) => {
      if (!blackHoleMode || !blackHole || e.touches.length === 0) return;
      const t = e.touches[0];
      const d = Math.hypot(t.clientX - blackHole.x, t.clientY - blackHole.y);
      if (d <= blackHoleGrabRadius()) {
        blackHoleDragging = true;
        blackHoleDragOffset.x = t.clientX - blackHole.x;
        blackHoleDragOffset.y = t.clientY - blackHole.y;
      }
    };
    const blackHoleTouchMove = (e: TouchEvent) => {
      if (!blackHoleDragging || !blackHole || e.touches.length === 0) return;
      const t = e.touches[0];
      blackHole.x = t.clientX - blackHoleDragOffset.x;
      blackHole.y = t.clientY - blackHoleDragOffset.y;
      e.preventDefault();
    };
    const blackHoleTouchEnd = () => {
      blackHoleDragging = false;
    };

    // Galaxy Zoom: wheel / trackpad scroll zooms in and out, clamped and eased.
    const onWheel = (e: WheelEvent) => {
      if (overGalaxyUI(e)) return;
      if (!zoomEnabled) return;
      // Prevent the page from scrolling while zooming with the wheel.
      e.preventDefault();
      targetZoom = applyZoomMultiplier(targetZoom, wheelDeltaToMultiplier(e.deltaY));
    };
    // Two-finger pinch zoom on touch. The ratio of the new touch span to the
    // old one is the multiplier, exactly like a trackpad two-finger scroll.
    const onTouchStart = (e: TouchEvent) => {
      if (zoomEnabled && e.touches.length === 2) {
        const [a, b] = e.touches;
        lastPinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!zoomEnabled || e.touches.length !== 2) return;
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (lastPinchDist > 0) {
        targetZoom = applyZoomMultiplier(targetZoom, dist / lastPinchDist);
      }
      lastPinchDist = dist;
    };
    const onTouchEnd = () => {
      lastPinchDist = 0;
      // Double-tap (like double-click) resets the zoom to 1×.
      const now = Date.now();
      if (now - lastTap < 300) targetZoom = ZOOM_DEFAULT;
      lastTap = now;
    };
    const onDoubleClick = () => {
      targetZoom = ZOOM_DEFAULT;
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;

      // Spin the galaxy.
      galaxyAngle += (rpm * Math.PI * 2) / 60 * dt;

      // Lunar Transit: advance the moon's drift + phase clock. Its geometry is
      // recomputed each frame from this clock (cheap arithmetic) so it drifts
      // smoothly and wanes over its month.
      if (moonMode) {
        moonTime += dt * 1000;
      }

      // Supernova: advance the explosion schedule clock (ms), matching the moon's.
      if (supernovaMode) {
        supernovaTime += dt * 1000;
      }

      // Distant Galaxy: advance the slow rotation clock (seconds). The field is
      // static; only the global angle turns, very slowly, so it reads as a
      // distant, essentially-frozen backdrop.
      if (distantMode) {
        distantGalaxyTime += dt;
      }

      // Black Hole: advance the disk's spin clock (rad). The hole itself is
      // static; only the disk rotation advances, so the accretion disk swirls.
      if (blackHoleMode) {
        blackHole.spinPhase += dt * DISK_RPS;
      }

      // Ringed Giant: advance the sky-crossing drift clock (ms), matching the
      // moon's. The whole state is recomputed each frame from this clock so the
      // giant drifts smoothly; the ring particles' live angles are derived from
      // this same clock at draw time.
      if (ringedGiantMode) {
        ringedGiantTime += dt * 1000;
      }

      // Pulsar: advance the drift + sweep clock (ms). The sweep is brisk (a
      // lighthouse), so under reduced-motion we freeze the clock and hold the
      // beam where it was — the core still glows, it just does not strobe.
      if (pulsarMode && !reduced) {
        pulsarTime += dt * 1000;
      }

      const cx = w / 2;
      const cy = h / 2;

      // Stellar Depth: ease the parallax vector toward the cursor's offset from
      // the galaxy centre. It fades to zero when the cursor leaves so the field
      // settles. Applied as a draw-time offset (never to the spring physics), so
      // it is fully orthogonal to the gravity well.
      if (depthMode && !reduced) {
        const targetX = mouse.active ? (mouse.x - cx) : 0;
        const targetY = mouse.active ? (mouse.y - cy) : 0;
        parallax.x += (targetX - parallax.x) * 0.08;
        parallax.y += (targetY - parallax.y) * 0.08;
      } else {
        parallax.x += (0 - parallax.x) * 0.08;
        parallax.y += (0 - parallax.y) * 0.08;
      }

      // Galaxy Zoom: ease the visible zoom toward its target and broadcast
      // the live value so the parent can share it via the URL.
      if (zoomEnabled) {
        const prev = zoom;
        zoom = easeZoom(zoom, targetZoom, ZOOM_EASE);
        if (lastZoomBroadcast === undefined || Math.abs(zoom - prev) > 1e-4) {
          lastZoomBroadcast = zoom;
          onZoom?.(zoom);
        }
      }

      for (const s of stars) {
        // Desired orbital position in screen space.
        const worldAngle = s.angle + s.armOffset * 0 + galaxyAngle;
        const orbitX = cx + Math.cos(worldAngle) * s.radius;
        const orbitY = cy + Math.sin(worldAngle) * s.radius;

        // Spring back toward the orbit.
        let ax = (orbitX - s.x) * SPRING_K;
        let ay = (orbitY - s.y) * SPRING_K;

        // Gravitational well: pull toward the cursor when close.
        if (active && !reduced && mouse.active) {
          const dx = mouse.x - s.x;
          const dy = mouse.y - s.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < ATTRACT_RADIUS * ATTRACT_RADIUS) {
            const dist = Math.sqrt(dist2) || 1;
            const f = ((ATTRACT_RADIUS - dist) / ATTRACT_RADIUS) * ATTRACT_STRENGTH;
            ax += (dx / dist) * f * 60 * dt;
            ay += (dy / dist) * f * 60 * dt;
          }
        }

        s.vx = (s.vx + ax) * DAMPING;
        s.vy = (s.vy + ay) * DAMPING;
        s.x += s.vx;
        s.y += s.vy;
      }

      // Expand / expire pulses and kick stars.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.radius += PULSE_SPEED * dt;
        p.life -= dt * 0.9;
        if (p.life <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        for (const s of stars) {
          const dx = s.x - p.x;
          const dy = s.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ring = Math.abs(dist - p.radius);
          if (ring < PULSE_WIDTH) {
            const kick = PULSE_STRENGTH * p.life * (1 - ring / PULSE_WIDTH);
            s.vx += (dx / dist) * kick * dt;
            s.vy += (dy / dist) * kick * dt;
          }
        }
      }

      // Draw.
      ctx.clearRect(0, 0, w, h);

      // Shooting Stars: occasional meteors streak across the deep sky, drawn
      // *behind* every other layer so the interactive galaxy stays foreground.
      // The spawn timeline is a pure function of the running clock, so meteors
      // flow smoothly rather than flickering frame to frame.
      let meteors: ShootingStar[] = [];
      if (shooting) {
        shootingTime += dt;
        meteors = computeShootingStars({
          time: shootingTime,
          width: w,
          height: h,
          intensity: 1.4,
          seed: 13,
          hues,
        });
        for (const m of meteors) {
          const nx = Math.cos(m.angle);
          const ny = Math.sin(m.angle);
          const tailX = m.x - nx * m.len;
          const tailY = m.y - ny * m.len;
          const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
          grad.addColorStop(0, `hsla(${m.hue}, 20%, 100%, 0)`);
          grad.addColorStop(0.7, `hsla(${m.hue}, 25%, 90%, 0.55)`);
          grad.addColorStop(1, `hsla(${m.hue}, 30%, 98%, 0.95)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = m.width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
          // Bright head glow.
          const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 4);
          headGrad.addColorStop(0, `hsla(${m.hue}, 30%, 98%, 0.9)`);
          headGrad.addColorStop(1, `hsla(${m.hue}, 30%, 98%, 0)`);
          ctx.fillStyle = headGrad;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.width * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Nebula Drift: living depth backdrop painted *behind* everything. A
      // slow, breathing, parallax-shifting glow that is coloured from the
      // active theme — pure additive atmosphere, never touching the stars.
      let nebulaClouds: NebulaCloud[] = [];
      if (nebula) {
        nebulaTime += dt;
        const parX = reduced || !mouse.active ? 0 : cx - mouse.x;
        const parY = reduced || !mouse.active ? 0 : cy - mouse.y;
        // Ease toward the target so the clouds drift rather than snap.
        nebulaParallax.x += (parX - nebulaParallax.x) * 0.08;
        nebulaParallax.y += (parY - nebulaParallax.y) * 0.08;
        nebulaClouds = computeNebulaClouds({
          time: nebulaTime,
          width: w,
          height: h,
          centerX: cx,
          centerY: cy,
          parallaxX: nebulaParallax.x,
          parallaxY: nebulaParallax.y,
          hues,
        });
        for (const c of nebulaClouds) {
          const grad = ctx.createRadialGradient(
            c.x,
            c.y,
            0,
            c.x,
            c.y,
            c.radius,
          );
          grad.addColorStop(
            0,
            `hsla(${c.hue}, 80%, 48%, ${c.alpha})`,
          );
          grad.addColorStop(
            0.55,
            `hsla(${(c.hue + 40) % 360}, 80%, 42%, ${c.alpha * 0.45})`,
          );
          grad.addColorStop(1, `hsla(${c.hue}, 80%, 30%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Aurora: a handful of soft, wavy northern-lights ribbons drifting across
      // the upper sky. Painted *behind* the stars (like nebula and meteors) so
      // the interactive galaxy stays foreground. Each ribbon is a filled path
      // whose top edge waves on two layered sines; the ribbons drift on time and
      // sway gently with the gravity well. Pure atmosphere — never touches stars.
      if (auroraMode && auroraBands.length > 0) {
        auroraTime += dt;
        // Ease a horizontal sway toward the cursor's offset from the centre, so
        // the ribbons ripple with the gravity well and settle when idle.
        const swayTarget =
          reduced || !mouse.active ? 0 : (cx - mouse.x) * 0.15;
        auroraSway += (swayTarget - auroraSway) * 0.06;
        for (const band of auroraBands) {
          const pts = auroraEdgePoints(
            band,
            w,
            h,
            auroraTime,
            auroraSway,
          );
          // Vertical gradient: bright and saturated at the ribbon's top edge,
          // fading to fully transparent a short way down.
          const topY = pts[0][1];
          const grad = ctx.createLinearGradient(0, topY, 0, topY + h * 0.5);
          grad.addColorStop(
            0,
            `hsla(${band.hue}, ${band.saturation}%, ${band.lightness}%, ${band.alpha})`,
          );
          grad.addColorStop(
            0.5,
            `hsla(${band.hue}, ${band.saturation}%, ${band.lightness * 0.8}%, ${band.alpha * 0.4})`,
          );
          grad.addColorStop(1, `hsla(${band.hue}, ${band.saturation}%, ${band.lightness * 0.6}%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          // Close down through the bottom of the sky so the ribbon fills solidly.
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Lunar Transit: a single recognisable body to complement the star
      // field. A moon drifts slowly across the sky on its own clock and waxes
      // and wanes through a full cycle. Painted *behind* the stars (like nebula,
      // meteors and the aurora) so the interactive galaxy stays foreground. The
      // lit region is a semicircle on the lit limb closed by a true terminator
      // half-ellipse, so the drawn lit area always equals the moon's
      // fractional illumination. Pure atmosphere — never touches the stars.
      if (moonMode) {
        const m = computeMoon({ time: moonTime, width: w, height: h });
        const mx = m.x;
        const my = m.y;
        const R = m.radius;
        // Soft outer glow — the sun-lit moon casts a faint halo.
        const glow = ctx.createRadialGradient(mx, my, R * 0.9, mx, my, R * 2.6);
        glow.addColorStop(0, "hsla(210, 40%, 90%, 0.30)");
        glow.addColorStop(0.55, "hsla(210, 30%, 85%, 0.12)");
        glow.addColorStop(1, "hsla(210, 30%, 85%, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, R * 2.6, 0, Math.PI * 2);
        ctx.fill();
        // Disk base: the whole surface (this is what the dark side shows,
        // faintly, as earthshine).
        const surface = ctx.createRadialGradient(
          mx - R * 0.3,
          my - R * 0.3,
          R * 0.1,
          mx,
          my,
          R,
        );
        surface.addColorStop(0, "hsla(45, 14%, 92%, 0.98)");
        surface.addColorStop(1, "hsla(40, 10%, 66%, 0.95)");
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.arc(mx, my, R, 0, Math.PI * 2);
        ctx.fill();
        // Craters: subtle darker discs, clipped to the disk.
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, R, 0, Math.PI * 2);
        ctx.clip();
        for (const c of m.craters) {
          const cx = mx + c.dx * R;
          const cy = my + c.dy * R;
          const cr = c.r * R;
          const crater = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          crater.addColorStop(0, `hsla(40, 12%, 55%, ${c.a})`);
          crater.addColorStop(0.7, `hsla(40, 10%, 62%, ${c.a * 0.6})`);
          crater.addColorStop(1, "hsla(45, 12%, 80%, 0)");
          ctx.fillStyle = crater;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // Lit region: a semicircle on the lit limb closed by the terminator
        // half-ellipse. Mirror on x for waxing (right-lit) vs waning (left-lit)
        // so the phase reads on whichever side the sun is.
        const e = terminatorXRadius(R, m.litFraction);
        ctx.save();
        ctx.translate(mx, my);
        ctx.scale(m.litSide, 1);
        ctx.beginPath();
        ctx.moveTo(0, -R);
        ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
        ctx.save();
        ctx.scale(e / R, 1);
        ctx.arc(0, 0, R, Math.PI / 2, -Math.PI / 2, false);
        ctx.restore();
        ctx.closePath();
        const lit = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.2);
        lit.addColorStop(0, "hsla(45, 18%, 97%, 1)");
        lit.addColorStop(1, "hsla(42, 15%, 86%, 0.98)");
        ctx.fillStyle = lit;
        ctx.fill();
        ctx.restore();
      }

      // Supernova: a rare, *discrete* event to complement the continuous sky
      // layers. A background star lives quietly, then periodically explodes into
      // a brilliant blue-white flash with diffraction spikes and an expanding
      // shockwave shell, fading to a faint remnant. Painted behind the stars (a
      // supernova inside the distant spiral we are looking at) at screen scale,
      // like the moon. Pure atmosphere — never touches the stars.
      if (supernovaMode) {
        const s = computeSupernova({ time: supernovaTime, width: w, height: h });
        if (s.phase !== "quiet") {
          const sx = s.x;
          const sy = s.y;
          const I = Math.max(0, Math.min(1, s.intensity));
          // Shockwave shell: a thin expanding ring, only visible during the fade.
          if (s.shellAlpha > 0.001 && s.shellRadius > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sx, sy, s.shellRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(200, 80%, 72%, ${s.shellAlpha})`;
            ctx.lineWidth = 1.5 + s.shellRadius * 0.04;
            ctx.stroke();
            // Soft glow wrapping the shell.
            const shellGlow = ctx.createRadialGradient(
              sx,
              sy,
              s.shellRadius * 0.9,
              sx,
              sy,
              s.shellRadius * 1.25,
            );
            shellGlow.addColorStop(0, `hsla(200, 85%, 70%, ${s.shellAlpha * 0.25})`);
            shellGlow.addColorStop(1, "hsla(200, 85%, 70%, 0)");
            ctx.fillStyle = shellGlow;
            ctx.beginPath();
            ctx.arc(sx, sy, s.shellRadius * 1.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          // Diffraction spikes: a thin cross through the core, length scaling
          // with intensity — the way a bright object reads through a lens.
          if (I > 0.02) {
            const spikeLen = 8 + s.spikeLength * (26 + s.shellRadius * 0.3);
            const spikeAlpha = 0.35 * I;
            ctx.save();
            ctx.strokeStyle = `hsla(210, 90%, 88%, ${spikeAlpha})`;
            ctx.lineWidth = 1.4;
            for (let a = 0; a < 4; a++) {
              const angle = (a * Math.PI) / 2 + Math.PI / 6;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              ctx.beginPath();
              ctx.moveTo(sx - cos * spikeLen, sy - sin * spikeLen);
              ctx.lineTo(sx + cos * spikeLen, sy + sin * spikeLen);
              ctx.stroke();
            }
            ctx.restore();
          }
          // Core glow: a radial bloom whose size and brightness track intensity.
          const coreR = 3 + I * 10 + s.shellRadius * 0.05;
          const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR * 2.4);
          if (s.phase === "remnant") {
            core.addColorStop(0, `hsla(210, 60%, 85%, ${s.remnantAlpha * 0.9})`);
            core.addColorStop(1, "hsla(210, 60%, 85%, 0)");
          } else {
            core.addColorStop(0, `hsla(210, 95%, 96%, ${0.85 + 0.15 * I})`);
            core.addColorStop(0.35, `hsla(215, 95%, 82%, ${0.7 * I})`);
            core.addColorStop(1, "hsla(220, 90%, 70%, 0)");
          }
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(sx, sy, coreR * 2.4, 0, Math.PI * 2);
          ctx.fill();
          // Bright central point.
          ctx.fillStyle = `hsla(210, 100%, 98%, ${0.6 + 0.4 * I})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.4 + I * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Distant Galaxy: a far-away spiral galaxy slowly rotating in the deep
      // background. Built once (see resize()) and only its global angle turns,
      // very slowly, so it reads as essentially-frozen deep-field scenery behind
      // the interactive galaxy. Pure atmosphere — never touches the stars, and it
      // is drawn at screen scale (not the galaxy's zoom transform) so it stays
      // far away while you zoom the near galaxy.
      if (distant && distantMode) {
        const g = distant;
        const cosTilt = Math.cos(g.tilt);
        const rot = g.angle + (distantGalaxyTime / ROTATION_SECONDS_PER_TURN) * Math.PI * 2;
        const rotCos = Math.cos(rot);
        const rotSin = Math.sin(rot);
        // A warm central bulge glow gives the galaxy a soft luminous core.
        const bulge = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius * 0.6);
        bulge.addColorStop(0, "hsla(40, 60%, 90%, 0.30)");
        bulge.addColorStop(0.5, "hsla(38, 55%, 82%, 0.13)");
        bulge.addColorStop(1, "hsla(36, 50%, 80%, 0)");
        ctx.fillStyle = bulge;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // The field of faint stars, rotated + tilted into an oblique view.
        ctx.save();
        for (const s of g.stars) {
          // Inclination: squash one axis so a tilted galaxy reads as oblique.
          const lx = s.dx;
          const ly = s.dy * cosTilt;
          // Apply the slow global rotation.
          const rx = lx * rotCos - ly * rotSin;
          const ry = lx * rotSin + ly * rotCos;
          const px = g.x + rx;
          const py = g.y + ry;
          const alpha = 0.42 + 0.45 * s.bright;
          ctx.fillStyle = `hsla(${s.hue}, 45%, ${58 + 32 * s.bright}%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(
            px,
            py,
            Math.max(0.4, s.size * (0.8 + 0.15 * s.bright)),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      // Ringed Giant: a single ringed gas giant drifting slowly across the sky.
      // Painted behind the stars (like the moon, supernova and distant galaxy)
      // so the interactive galaxy stays foreground. The ring is drawn in two
      // passes — the half of the orbiting particles that sit on the far side of
      // the ring plane (behind the planet) first, then the opaque planet disk,
      // then the near-side particles — so the planet correctly occludes its own
      // back rings while the front rings pass in front. Pure atmosphere.
      if (ringedGiantMode) {
        const g = computeRingedGiant({ time: ringedGiantTime, width: w, height: h });
        const gx = g.x;
        const gy = g.y;
        const R = g.radius;
        const ring = g.ring;
        const tilt = ring.tilt;
        // Soft outer glow — the giant's atmosphere scatters light.
        const glow = ctx.createRadialGradient(gx, gy, R * 0.95, gx, gy, R * 3.2);
        glow.addColorStop(0, `hsla(${hexToHue(ring.color)}, 70%, 70%, 0.22)`);
        glow.addColorStop(0.5, `hsla(${hexToHue(ring.color)}, 60%, 65%, 0.10)`);
        glow.addColorStop(1, `hsla(${hexToHue(ring.color)}, 60%, 65%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(gx, gy, R * 3.2, 0, Math.PI * 2);
        ctx.fill();
        // Back half of the ring: particles whose in-plane y is negative (behind
        // the planet), drawn before the opaque disk so the planet hides them.
        ctx.save();
        for (const p of ring.particles) {
          const angle = particleAngleAt(p, ringedGiantTime);
          const proj = projectRingParticle(R, p.r, angle, tilt);
          if (!proj.behind) continue;
          const px = gx + proj.dx;
          const py = gy + proj.dy;
          // Keep only the particles whose projected position is outside the
          // planet disk (the rest are hidden by it).
          const dx = proj.dx;
          const dy = proj.dy;
          if (dx * dx + dy * dy < R * R) continue;
          ctx.fillStyle = `hsla(${hexToHue(ring.color)}, 65%, 68%, ${ring.alpha * 0.85 * p.bright})`;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, R * 0.012), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        // The gas-giant disk: bands wrapped across the sphere, clipped to the
        // disk, then a spherical-shading overlay (limb darkening) plus a sun-lit
        // highlight so it reads as a globe, not a flat disc.
        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy, R, 0, Math.PI * 2);
        ctx.clip();
        for (const band of g.bands) {
          const by = gy + band.y * R;
          const bh = Math.max(0.5, band.halfWidth * R);
          const bandGrad = ctx.createLinearGradient(0, by - bh, 0, by + bh);
          bandGrad.addColorStop(0, `${band.color}00`);
          bandGrad.addColorStop(0.5, band.color + Math.round(band.alpha * 255).toString(16).padStart(2, "0"));
          bandGrad.addColorStop(1, `${band.color}00`);
          ctx.fillStyle = bandGrad;
          ctx.fillRect(gx - R, by - bh, R * 2, bh * 2);
        }
        // Spherical shading: darker at the limb, lit toward the sun side.
        const sunX = gx + Math.cos(g.sunAngle) * R;
        const sunY = gy + Math.sin(g.sunAngle) * R;
        const shade = ctx.createRadialGradient(sunX, sunY, R * 0.1, gx, gy, R);
        shade.addColorStop(0, "rgba(255,255,255,0.35)");
        shade.addColorStop(0.45, "rgba(0,0,0,0)");
        shade.addColorStop(0.85, "rgba(0,0,0,0.45)");
        shade.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = shade;
        ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
        ctx.restore();
        // Front half of the ring: particles in front of the planet, drawn on
        // top so they pass across the disk.
        ctx.save();
        for (const p of ring.particles) {
          const angle = particleAngleAt(p, ringedGiantTime);
          const proj = projectRingParticle(R, p.r, angle, tilt);
          if (proj.behind) continue;
          const px = gx + proj.dx;
          const py = gy + proj.dy;
          if (proj.dx * proj.dx + proj.dy * proj.dy < R * R) continue;
          ctx.fillStyle = `hsla(${hexToHue(ring.color)}, 65%, 72%, ${ring.alpha * p.bright})`;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, R * 0.012), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Pulsar: a lighthouse neutron star. A tiny, brilliant core sweeps twin
      // radiation beams across the sky on a slow arc; each time a beam swings
      // toward the centre of the screen the core flares (its `pulse`), so the
      // read is a living, breathing beacon rather than a steady star. Painted
      // with additive blending so the beams glow, and behind the stars like the
      // other sky bodies. Pure atmosphere — never touches the spring physics.
      if (pulsarMode) {
        pulsar = computePulsar({ time: pulsarTime, width: w, height: h });
        const px = pulsar.x;
        const py = pulsar.y;
        const core = pulsar.coreRadius * (1 + 0.5 * pulsar.pulse); // flares open on a pulse
        const beamLen = Math.hypot(w, h) * PULSAR_BEAM_LENGTH_FRACTION;
        const [beamN, beamS] = pulsar.beams;
        const hue = hexToHue(pulsar.color);
        // Additive so the two opposing beams and the core stack into a bright glow.
        const prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (const beam of [beamN, beamS]) {
          const end = beamEndpoint(px, py, beam, beamLen);
          const angle = Math.atan2(beam.y, beam.x);
          const half = PULSAR_BEAM_HALF_ANGLE;
          // A filled cone: from the core, fanning out by ±half, arcing to beamLen.
          const x1 = px + beam.x * beamLen;
          const y1 = py + beam.y * beamLen;
          const x2 = px + beamLen * Math.cos(angle - half);
          const y2 = py + beamLen * Math.sin(angle - half);
          const x3 = px + beamLen * Math.cos(angle + half);
          const y3 = py + beamLen * Math.sin(angle + half);
          const grad = ctx.createLinearGradient(px, py, end.x, end.y);
          // Bright and opaque at the core, fading to nothing at the beam's end.
          grad.addColorStop(0, `hsla(${hue}, 90%, 75%, ${0.20 + 0.30 * pulsar.pulse})`);
          grad.addColorStop(0.45, `hsla(${hue}, 90%, 70%, ${0.08 + 0.12 * pulsar.pulse})`);
          grad.addColorStop(1, `hsla(${hue}, 90%, 70%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x1, y1);
          ctx.arc(px, py, beamLen, angle - half, angle + half);
          ctx.closePath();
          ctx.fill();
        }
        // The core: a hard, bright heart wrapped in a soft radial halo. On a
        // pulse the halo swells and brightens, so the flare reads clearly.
        const halo = ctx.createRadialGradient(px, py, 0, px, py, core * 9);
        halo.addColorStop(0, `hsla(${hue}, 95%, 92%, ${0.55 + 0.45 * pulsar.pulse})`);
        halo.addColorStop(0.15, `hsla(${hue}, 95%, 85%, ${0.35 + 0.4 * pulsar.pulse})`);
        halo.addColorStop(0.5, `hsla(${hue}, 90%, 75%, ${0.10 * pulsar.pulse})`);
        halo.addColorStop(1, `hsla(${hue}, 90%, 75%, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, core * 9, 0, Math.PI * 2);
        ctx.fill();
        // The hot centre — near-white on a pulse, dimmer when the beam points away.
        const heart = ctx.createRadialGradient(px, py, 0, px, py, core);
        heart.addColorStop(0, `rgba(255,255,255,${0.85 + 0.15 * pulsar.pulse})`);
        heart.addColorStop(0.6, `hsla(${hue}, 95%, 88%, ${0.7 + 0.3 * pulsar.pulse})`);
        heart.addColorStop(1, `hsla(${hue}, 90%, 80%, 0)`);
        ctx.fillStyle = heart;
        ctx.beginPath();
        ctx.arc(px, py, core, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = prevOp;
      }

      for (const p of pulses) {
        // The ring only reaches radius == PULSE_WIDTH once fully grown, so while
        // it is young the inner radius (p.radius - PULSE_WIDTH) is negative and
        // createRadialGradient throws — which used to kill the rAF loop and freeze
        // the whole galaxy. Clamp it to >= 0 so a click never blanks the screen.
        const grad = ctx.createRadialGradient(
          p.x,
          p.y,
          Math.max(0, p.radius - PULSE_WIDTH),
          p.x,
          p.y,
          p.radius + PULSE_WIDTH,
        );
        grad.addColorStop(0, `hsla(190, 90%, 70%, 0)`);
        grad.addColorStop(0.5, `hsla(190, 90%, 75%, ${0.5 * p.life})`);
        grad.addColorStop(1, `hsla(190, 90%, 70%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = PULSE_WIDTH * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Galaxy Zoom: the galaxy dollys in. Everything that belongs to the
      // galaxy — the constellation web, the warp streaks and the stars — is
      // rendered inside a transform scaled by `zoom` around the centre, while
      // its geometry is drawn at `1 / zoom` so it holds a constant on-screen
      // size: the galaxy comes towards you instead of bloating into blobs.
      // Atmosphere outside this box (nebula, meteors, click pulses) stays put
      // at screen scale.
      const starScale = screenSizeScale(zoom);
      if (zoomEnabled && zoom !== ZOOM_DEFAULT) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(zoom, zoom);
        ctx.translate(-cx, -cy);
      }

      // Constellation mode: draw faint links between nearby stars. When Stellar
      // Depth is on, each star is drawn at its parallax-shifted position so the
      // web bends with the 3D layering.
      if (constellation) {
        for (let i = 0; i < stars.length; i++) {
          const a = stars[i];
          const ax = a.x + parallax.x * (depths[i] ?? 0);
          const ay = a.y + parallax.y * (depths[i] ?? 0);
          for (let j = i + 1; j < stars.length; j++) {
            const b = stars[j];
            const bx = b.x + parallax.x * (depths[j] ?? 0);
            const by = b.y + parallax.y * (depths[j] ?? 0);
            const dx = bx - ax;
            const dy = by - ay;
            const dist2 = dx * dx + dy * dy;
            if (dist2 > CONSTELLATION_MAX_DIST * CONSTELLATION_MAX_DIST) continue;
            const dist = Math.sqrt(dist2) || 1;
            const proximity = 1 - dist / CONSTELLATION_MAX_DIST; // 1 (close) -> 0 (far)
            // React to motion: links brighten where stars are moving fast,
            // so the web ripples with the gravity well and pulses.
            const motion =
              (Math.hypot(a.vx, a.vy) + Math.hypot(b.vx, b.vy)) / 80;
            const alpha =
              CONSTELLATION_MIN_ALPHA +
              proximity * CONSTELLATION_MAX_ALPHA +
              Math.min(1, motion) * 0.15;
            ctx.strokeStyle = `hsla(195, 80%, 72%, ${Math.min(
              0.6,
              alpha,
            )})`;
            ctx.lineWidth = (0.6 + proximity * 0.9) * starScale;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }

      // Warp Drive: stretch fast-moving stars into hyperspace streaks. The
      // streak length scales with both the star's speed and the global warp
      // factor, so the streaks ripple with the gravity well and shockwaves.
      if (warpFactor > 0) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const speed = Math.hypot(s.vx, s.vy);
          if (speed < 2) continue;
          const sx = s.x + parallax.x * (depths[i] ?? 0);
          const sy = s.y + parallax.y * (depths[i] ?? 0);
          const len = Math.min(70, speed * 0.45 + warpFactor * 26);
          const nx = s.vx / speed;
          const ny = s.vy / speed;
          const glow = Math.min(1, speed / 40);
          const alpha = 0.15 + glow * 0.35 + warpFactor * 0.2;
          const grad = ctx.createLinearGradient(
            s.x - nx * len,
            s.y - ny * len,
            s.x + nx * len,
            s.y + ny * len,
          );
          grad.addColorStop(0, `hsla(${s.hue}, 90%, 60%, 0)`);
          grad.addColorStop(
            0.5,
            `hsla(${s.hue}, 95%, ${72 + glow * 15}%, ${alpha})`,
          );
          grad.addColorStop(1, `hsla(${s.hue}, 90%, 60%, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = s.size * (1 + glow) * starScale;
          ctx.beginPath();
          ctx.moveTo(sx - nx * len, sy - ny * len);
          ctx.lineTo(sx + nx * len, sy + ny * len);
          ctx.stroke();
        }
      }

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const depth = depthMode ? (depths[i] ?? 1) : 1;
        const speed = Math.hypot(s.vx, s.vy);
        const glow = Math.min(1, speed / 40);
        // Stellar Depth: twinkle (nearer stars twinkle harder) and an
        // atmospheric-perspective scale (far stars smaller and dimmer).
        const twinkle = depthMode ? twinkleAlpha(phases[i] ?? 0, now / 1000, depth) : 1;
        const ds = depthScale(depth);
        // Variable Stars: apply the per-star light curve (brightness) and, for
        // giants, a larger drawn size. When the layer is off these are 1.
        const vVar = variableMode ? (variableAssign[i] ?? null) : null;
        const varMult = vVar ? variableAlpha(vVar, now / 1000) : 1;
        const sizeMult = vVar ? variableSize(vVar) : 1;
        const sx = s.x + parallax.x * (depths[i] ?? 0);
        const sy = s.y + parallax.y * (depths[i] ?? 0);
        const alpha = (s.baseAlpha + glow * 0.4) * twinkle * ds * varMult;
        ctx.beginPath();
        const radius = s.size * (2 + glow) * starScale * ds * sizeMult;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        grad.addColorStop(0, `hsla(${s.hue}, 90%, ${70 + glow * 20}%, ${alpha})`);
        grad.addColorStop(1, `hsla(${s.hue}, 90%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (zoomEnabled && zoom !== ZOOM_DEFAULT) {
        ctx.restore();
      }

      // Comet Trail: a glowing comet with a tapering tail trails the pointer.
      // Drawn *after* the zoom transform so it stays pinned to the on-screen
      // cursor regardless of zoom. The tail length grows with cursor speed and
      // its hue is drawn from the active theme — pure atmosphere, never stars.
      if (cometMode) {
        const nowMs = Date.now();
        cometHistory.push({ x: mouse.x, y: mouse.y, t: nowMs });
        // Prune stale samples and keep the buffer bounded.
        let k = cometHistory.length;
        while (k-- > 0 && nowMs - cometHistory[k].t > COMET_SAMPLE_MAX_AGE) {
          cometHistory.splice(k, 1);
        }
        if (cometHistory.length >= 2 && cometHistory.length > COMET_HISTORY_MAX) {
          cometHistory.splice(0, cometHistory.length - COMET_HISTORY_MAX);
        }
        // Ease the head toward the pointer so the comet glides rather than snaps.
        cometHead.x += (mouse.x - cometHead.x) * 0.45;
        cometHead.y += (mouse.y - cometHead.y) * 0.45;
        if (cometHistory.length >= 2 && cometHead.x > -9000) {
          const speed = cursorSpeed(cometHistory, 6);
          const tail = resampleTail(cometHistory, COMET_TAIL_POINTS);
          const pathLen = polylineLength(tail);
          const desired = tailLengthFromSpeed(
            speed,
            COMET_BASE_TAIL_LEN,
            COMET_MAX_TAIL_LEN,
            20,
            COMET_MAX_SPEED,
          );
          const scale = pathLen > 0 ? desired / pathLen : COMET_BASE_TAIL_LEN / 120;
          const grow = Math.max(0.35, scale);
          const head = cometHead;
          const hueA = hues[0] ?? 200;
          const hueB = hues[1] ?? hues[0] ?? 240;
          // Soft outer halo that swells with the tail.
          const haloGrad = ctx.createRadialGradient(
            head.x,
            head.y,
            0,
            head.x,
            head.y,
            64 * grow,
          );
          haloGrad.addColorStop(0, `hsla(${hueA}, 90%, 82%, 0.4)`);
          haloGrad.addColorStop(1, `hsla(${hueA}, 90%, 70%, 0)`);
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 64 * grow, 0, Math.PI * 2);
          ctx.fill();
          // Tapered tail: thin and faint at the tip, thick and bright at the head.
          ctx.lineCap = "round";
          for (let i = 0; i < tail.length - 1; i++) {
            const p0 = tail[i];
            const p1 = tail[i + 1];
            const t = i / (tail.length - 1);
            const w = Math.max(0.5, lerp(1.5, 30, t));
            const hue = lerp(hueB, hueA, t);
            const alpha = lerp(0.02, 0.92, t * t);
            const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
            grad.addColorStop(0, `hsla(${hue}, 90%, 65%, 0)`);
            grad.addColorStop(1, `hsla(${hue}, 95%, ${76 + t * 18}%, ${alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = w * grow;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
          // Bright hot core.
          const coreGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 11);
          coreGrad.addColorStop(0, `hsla(${hueA}, 100%, 97%, 0.95)`);
          coreGrad.addColorStop(1, `hsla(${hueA}, 90%, 80%, 0)`);
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Black Hole: a placeable singularity with an accretion disk, photon
      // ring and event horizon, drawn at the very end (screen scale, on top of
      // the stars) so the opaque horizon hides whatever sits behind it. The
      // disk's near half wraps in front of the horizon; its Doppler shift makes
      // the approaching side brighter/bluer and the receding side dimmer/redder.
      // Pure atmosphere — never touches the stars or the spring physics.
      if (blackHoleMode && blackHole) {
        const bh = blackHole;
        const bx = bh.x;
        const by = bh.y;
        const R = bh.radius;
        const spin = bh.spinPhase;
        const tilt = bh.tilt;
        const viewerAz = 0; // viewer's azimuth for the Doppler projection
        ctx.save();
        // Soft outer accretion halo.
        const halo = ctx.createRadialGradient(bx, by, R * 1.5, bx, by, R * 3.6);
        halo.addColorStop(0, `hsla(${bh.hue}, 100%, 72%, 0.55)`);
        halo.addColorStop(0.4, `hsla(${bh.hue - 4}, 100%, 60%, 0.30)`);
        halo.addColorStop(1, `hsla(${bh.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(bx, by, R * 3.6, 0, Math.PI * 2);
        ctx.fill();
        // Photon ring — the thin, bright circle of bent light just outside the
        // event horizon.
        ctx.strokeStyle = `hsla(${bh.hue + 8}, 100%, 82%, 0.9)`;
        ctx.lineWidth = Math.max(1.2, R * 0.06);
        ctx.beginPath();
        ctx.arc(bx, by, einsteinRadius(R) * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        // Event horizon — the pure-black disc that hides the stars behind it.
        const horizon = ctx.createRadialGradient(bx, by, R * 0.2, bx, by, R);
        horizon.addColorStop(0, "rgba(0,0,0,1)");
        horizon.addColorStop(1, "rgba(0,0,0,0.98)");
        ctx.fillStyle = horizon;
        ctx.beginPath();
        ctx.arc(bx, by, R, 0, Math.PI * 2);
        ctx.fill();
        // A faint photon glow just outside the horizon, on the near side.
        const innerGlow = ctx.createRadialGradient(bx, by, R, bx, by, R * 1.6);
        innerGlow.addColorStop(0, `hsla(${bh.hue}, 100%, 80%, 0.5)`);
        innerGlow.addColorStop(1, `hsla(${bh.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(bx, by, R * 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Accretion disk: draw only the near half of the particles (the front
        // of the disk wrapping in front of the horizon). The far half is
        // hidden behind the opaque event horizon.
        for (const p of bh.particles) {
          if (Math.sin(p.angle) <= 0) continue; // far side — behind the hole
          const pt = accretionPoint(p, bx, by, spin, tilt, R);
          const dx = pt.x - bx;
          const dy = pt.y - by;
          if (Math.hypot(dx, dy) < R) continue; // inside the horizon
          const factor = dopplerFactor(p.angle, spin, viewerAz);
          const hue = dopplerHue(bh.hue, factor);
          const alpha = Math.max(0, 0.35 + factor * 0.5) * p.brightness;
          if (alpha <= 0.02) continue;
          const size = R * (0.5 + p.brightness * 0.9) * (1.2 - p.radiusFrac / DISK_OUTER_FRACTION + 0.3);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size);
          grad.addColorStop(0, `hsla(${hue}, 100%, ${78 + factor * 8}%, ${alpha})`);
          grad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Black Hole: show a grab cursor when the pointer is over the hole's
      // glow, so the affordance to drag it is obvious.
      if (blackHoleMode && canvasElementRef.current) {
        const near =
          blackHole &&
          Math.hypot(mouse.x - blackHole.x, mouse.y - blackHole.y) <= blackHoleGrabRadius();
        canvasElementRef.current.style.cursor = blackHoleDragging ? "grabbing" : near ? "grab" : "";
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", leave);
    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    // Black Hole drag: only when the layer is on.
    if (blackHoleMode) {
      canvas.addEventListener("mousedown", blackHoleDown);
      window.addEventListener("mousemove", blackHoleMove, { passive: true });
      window.addEventListener("mouseup", blackHoleUp);
      canvas.addEventListener("touchstart", blackHoleTouchStart, { passive: true });
      canvas.addEventListener("touchmove", blackHoleTouchMove, { passive: false });
      canvas.addEventListener("touchend", blackHoleTouchEnd);
    }
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", leave);
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      if (blackHoleMode) {
        canvas.removeEventListener("mousedown", blackHoleDown);
        window.removeEventListener("mousemove", blackHoleMove);
        window.removeEventListener("mouseup", blackHoleUp);
        canvas.removeEventListener("touchstart", blackHoleTouchStart);
        canvas.removeEventListener("touchmove", blackHoleTouchMove);
        canvas.removeEventListener("touchend", blackHoleTouchEnd);
      }
      window.removeEventListener("resize", resize);
    };
  }, [
    active,
    reduced,
    config,
    constellation,
    nebula,
    shooting,
    zoomEnabled,
    depthMode,
    variableMode,
    cometMode,
    auroraMode,
    moonMode,
    supernovaMode,
    distantMode,
    blackHoleMode,
    ringedGiantMode,
    pulsarMode,
    onZoom,
  ]);

  return (
    <canvas
      ref={(el) => {
        canvasElementRef.current = el;
        canvasRef?.(el);
      }}
      aria-hidden="true"
      className="pointer-events-[auto] absolute inset-0 h-full w-full"
    />
  );
}
