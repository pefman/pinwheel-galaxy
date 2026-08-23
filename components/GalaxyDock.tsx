"use client";

import { useEffect, useState } from "react";
import type React from "react";

/**
 * GalaxyDock — the glass control bar under the hero.
 *
 * Replaces the old single "Gravity Well: On/Off" toggle with a compact,
 * wrap-friendly dock that lets visitors tune the live galaxy:
 *   - theme (colour palette)   — swatches
 *   - spiral arms              — stepper 1–8
 *   - spin speed (rpm)         — stepper 1–20
 *   - star count               — stepper 120–640
 *   - gravity well             — toggle (kept from v1)
 *   - Shuffle (🎲)             — randomises everything and rewrites the URL
 *
 * Every change is reflected in the URL, so the current galaxy is shareable by
 * copying the address bar. `describeConfig` shows what the current galaxy is.
 */

import { GalaxyConfig, RANGES, THEMES, describeConfig } from "@/lib/galaxyPresets";

/**
 * An environment/sky toggle rendered as a compact chip in the dock's second
 * row (Nebula, Constellations, Shooting Stars, Zoom, Stellar Depth, …).
 * `color` is the fill used while the toggle is on; it is passed in so the dock
 * stays generic and every toggle keeps its own identity colour.
 */
export interface EnvironmentToggle {
  label: string;
  active: boolean;
  onToggle: () => void;
  color: string;
}

function Knob({
  label,
  value,
  onDec,
  onInc,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-left text-white/50">{label}</span>
      <button
        onClick={onDec}
        aria-label={`Decrease ${label}`}
        className="h-6 w-6 rounded-md border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        −
      </button>
      <span className="w-9 text-center tabular-nums text-sm text-white" aria-live="polite">
        {value}
        {unit ?? ""}
      </span>
      <button
        onClick={onInc}
        aria-label={`Increase ${label}`}
        className="h-6 w-6 rounded-md border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        +
      </button>
    </div>
  );
}

export default function GalaxyDock({
  config,
  gravity,
  applyConfig,
  toggleGravity,
  shuffle,
  label,
  environment,
  share,
  fullscreen = false,
  onToggleFullscreen,
}: {
  config: GalaxyConfig;
  gravity: boolean;
  applyConfig: (p: Partial<GalaxyConfig>) => void;
  toggleGravity: () => void;
  shuffle: () => void;
  label: string | null;
  environment?: EnvironmentToggle[];
  /** Optional “Share as an image” control, rendered next to Shuffle / Gravity. */
  share?: React.ReactNode;
  /** Whether the galaxy is currently in fullscreen mode (for the button state). */
  fullscreen?: boolean;
  /** Called to toggle fullscreen mode. Always present (the fallback layout
   * works even without the browser Fullscreen API). */
  onToggleFullscreen?: () => void;
}) {
  const inc = (k: keyof Omit<GalaxyConfig, "theme">) => (v: number) => {
    const { max } = RANGES[k];
    applyConfig({ [k]: Math.min(v + RANGES[k].step, max) });
  };
  const dec = (k: keyof Omit<GalaxyConfig, "theme">) => (v: number) => {
    const { min } = RANGES[k];
    applyConfig({ [k]: Math.max(v - RANGES[k].step, min) });
  };

  // In fullscreen mode the galaxy is the whole point, so the dock starts
  // collapsed to a single row of primary controls. The visitor can still
  // expand it to reach the environment/sky chips — the controls are never
  // hidden, just collapsible. Collapsing is reset whenever fullscreen toggles.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(fullscreen);
  }, [fullscreen]);

  // `data-galaxy-ui` marks this control surface so the interactive starfield
  // knows to ignore pointer events (gravity follow, click ripples, zoom,
  // double-click) that land on the dock instead of the galaxy itself.
  return (
    <div className="absolute bottom-6 left-1/2 z-20 w-[min(680px,92vw)] -translate-x-1/2" data-galaxy-ui>
      <div className="glass max-h-[70vh] overflow-x-auto rounded-2xl px-3 py-3 text-sm sm:px-5">
        <p className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-widest text-white/45">
          <span>Galaxy controls</span>
          <span className="hidden font-mono tabular-nums text-white/35 sm:inline">{label ?? describeConfig(config)}</span>
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* Theme swatches */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-left text-white/50">Theme</span>
            <div className="flex -space-x-2" role="group" aria-label="Galaxy theme">
              {Object.values(THEMES).map((t) => (
                <button
                  key={t.key}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={config.theme === t.key}
                  onClick={() => applyConfig({ theme: t.key })}
                  className={`h-6 w-6 rounded-full bg-gradient-to-br ${t.gradient} transition-transform ${
                    config.theme === t.key
                      ? "scale-110 outline-2 outline-white/70 outline-offset-1"
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <Knob
            label="Arms"
            value={config.arms}
            min={RANGES.arms.min}
            max={RANGES.arms.max}
            onDec={() => dec("arms")(config.arms)}
            onInc={() => inc("arms")(config.arms)}
          />
          <Knob
            label="Spin"
            value={config.rpm}
            min={RANGES.rpm.min}
            max={RANGES.rpm.max}
            unit="r"
            onDec={() => dec("rpm")(config.rpm)}
            onInc={() => inc("rpm")(config.rpm)}
          />
          <Knob
            label="Stars"
            value={config.stars}
            min={RANGES.stars.min}
            max={RANGES.stars.max}
            onDec={() => dec("stars")(config.stars)}
            onInc={() => inc("stars")(config.stars)}
          />

          <div className="ml-auto flex items-center gap-3">
            {/* Optional share-as-image control. GalaxyShareCard renders its own
                button + popover, so we only surface it when the parent passes
                `share`. */}
            {share}
            <button
              onClick={shuffle}
              title="Generate a random galaxy"
              aria-label="Shuffle to a random galaxy"
              className="rounded-full px-3 py-1 font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              🎲 Shuffle
            </button>
            <button
              onClick={onToggleFullscreen}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen (F)"}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              aria-pressed={fullscreen}
              className="rounded-full px-3 py-1 font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              {fullscreen ? "✕ Fullscreen" : "⛶ Fullscreen"}
            </button>
            <button
              onClick={toggleGravity}
              aria-pressed={gravity}
              className={`relative rounded-full px-3 py-1 font-medium transition-colors ${
                gravity ? "text-white" : "text-white/40"
              }`}
              style={{ backgroundColor: gravity ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)" }}
            >
              Gravity: {gravity ? "On" : "Off"}
            </button>
          </div>
        </div>

        {/* Environment/sky toggles — a single, wrap-friendly row of compact
            chips. Kept in the same dock (not a second floating overlay) so the
            controls never collide or spill off the edges on narrow screens.

            In fullscreen mode the dock starts collapsed (see `collapsed` above)
            so the galaxy stays front-and-centre; a single link expands the row
            back out. The controls are never hidden — just collapsible. */}
        {environment && environment.length > 0 && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-1 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/15 hover:text-white/90"
          >
            ▸ Show galaxy features
          </button>
        )}
        {environment && environment.length > 0 && !collapsed && (
          <div className="flex flex-wrap items-center gap-2">
            {environment.map((t) => (
              <button
                key={t.label}
                onClick={t.onToggle}
                aria-pressed={t.active}
                aria-label={`Toggle ${t.label}`}
                title={`Toggle ${t.label}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  t.active ? "text-white" : "text-white/65"
                }`}
                style={{ backgroundColor: t.active ? t.color : "rgba(255,255,255,0.1)" }}
              >
                {t.label}: {t.active ? "On" : "Off"}
              </button>
            ))}
            {fullscreen && (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-white/15 hover:text-white/80"
                title="Collapse the feature list back to primary controls"
              >
                ◂ Hide features
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
