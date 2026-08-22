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
 */

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CONFIG, GalaxyConfig, THEMES } from "@/lib/galaxyPresets";
import {
  computeNebulaClouds,
  NebulaCloud,
} from "@/lib/nebula";

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
}: {
  active: boolean;
  config?: GalaxyConfig;
  constellation?: boolean;
  nebula?: boolean;
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

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(w, h, arms, STAR_COUNT, hues);
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

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;

      // Spin the galaxy.
      galaxyAngle += (rpm * Math.PI * 2) / 60 * dt;

      const cx = w / 2;
      const cy = h / 2;

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
        const grad = ctx.createRadialGradient(p.x, p.y, p.radius - PULSE_WIDTH, p.x, p.y, p.radius + PULSE_WIDTH);
        grad.addColorStop(0, `hsla(190, 90%, 70%, 0)`);
        grad.addColorStop(0.5, `hsla(190, 90%, 75%, ${0.5 * p.life})`);
        grad.addColorStop(1, `hsla(190, 90%, 70%, 0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = PULSE_WIDTH * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Constellation mode: draw faint links between nearby stars.
      if (constellation) {
        for (let i = 0; i < stars.length; i++) {
          const a = stars[i];
          for (let j = i + 1; j < stars.length; j++) {
            const b = stars[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
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
            ctx.lineWidth = 0.6 + proximity * 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Warp Drive: stretch fast-moving stars into hyperspace streaks. The
      // streak length scales with both the star's speed and the global warp
      // factor, so the streaks ripple with the gravity well and shockwaves.
      if (warpFactor > 0) {
        for (const s of stars) {
          const speed = Math.hypot(s.vx, s.vy);
          if (speed < 2) continue;
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
          ctx.lineWidth = s.size * (1 + glow);
          ctx.beginPath();
          ctx.moveTo(s.x - nx * len, s.y - ny * len);
          ctx.lineTo(s.x + nx * len, s.y + ny * len);
          ctx.stroke();
        }
      }

      for (const s of stars) {
        const speed = Math.hypot(s.vx, s.vy);
        const glow = Math.min(1, speed / 40);
        const alpha = s.baseAlpha + glow * 0.4;
        ctx.beginPath();
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * (2 + glow));
        grad.addColorStop(0, `hsla(${s.hue}, 90%, ${70 + glow * 20}%, ${alpha})`);
        grad.addColorStop(1, `hsla(${s.hue}, 90%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.arc(s.x, s.y, s.size * (2 + glow), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", leave);
    window.addEventListener("click", onClick);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", touchEnd);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", leave);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("resize", resize);
    };
  }, [active, reduced, config, nebula]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-[auto] absolute inset-0 h-full w-full"
    />
  );
}
