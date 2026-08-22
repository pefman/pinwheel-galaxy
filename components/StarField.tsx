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
  onZoom,
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
  /** Called with the live zoom whenever it changes, so the parent can share it. */
  onZoom?: (zoom: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
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
    };

    const onMove = (e: MouseEvent) => {
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

    // Galaxy Zoom: wheel / trackpad scroll zooms in and out, clamped and eased.
    const onWheel = (e: WheelEvent) => {
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
      window.removeEventListener("resize", resize);
    };
  }, [
    active,
    reduced,
    config,
    nebula,
    shooting,
    zoomEnabled,
    depthMode,
    variableMode,
    cometMode,
    onZoom,
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-[auto] absolute inset-0 h-full w-full"
    />
  );
}
