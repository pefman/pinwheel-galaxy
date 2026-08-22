# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

## [0.6.0] — 2026-08-22

### Added

- **Galaxy Zoom** — scroll with the wheel / trackpad (or pinch with two
  fingers on touch) to dolly into the interactive starfield. The galaxy eases
  smoothly toward the target, clamped between 0.6× and 2.5×, and a double-click
  (or double-tap) snaps back to 1×. Stars are drawn at `1 / zoom` while the
  scene is scaled by `zoom`, so the galaxy *comes towards you* instead of
  bloating into blurry blobs. The effect is **off by default** and orthogonal
  to every other feature; when off, the wheel scrolls the page as usual. The
  live zoom is shareable via `?z=` in the URL.
  - `lib/zoom.ts` (new) — the **pure** logic: `clampZoom`, `easeZoom`,
    `screenSizeScale`, the wheel/pinch multiplier maths, and the `?z=` URL
    binding. `lib/zoom.test.ts` (new) covers clamping, wheel direction,
    easing convergence, constant-on-screen sizing, and URL round-trips.
  - `components/StarField.tsx` gained a `zoomEnabled` prop and an `onZoom`
    callback, owns the animated zoom state, and renders the galaxy
    (constellation web, warp streaks, stars) inside a `zoom`-scaled transform
    around the galaxy centre. Atmosphere outside the galaxy (nebula, meteors,
    click pulses) stays at screen scale.
  - `lib/useGalaxyParams.ts` now carries the `?z=` zoom param alongside theme /
    arms / rpm / stars and gravity, so a zoomed galaxy is deep-linkable and
    survives Back/Forward navigation.
  - `app/page.tsx` — a new **Zoom: On/Off** toggle in the hero control row.

### Notes

- All changes are additive and non-breaking; the default galaxy is visually
  unchanged. Galaxy Zoom is off by default and orthogonal to Gravity Well,
  Constellation, Warp Drive, Nebula Drift, and Shooting Stars.

## [0.5.0] — 2026-08-22

### Added

- **Shooting Stars** — occasional meteors streak across the hero's deep sky,
  so the galaxy sits under a living night rather than flat black. A bright head
  fades into a long, soft tail; each meteor spawns just above the top edge and
  travels down and to one side at a random speed, its streak length following
  `speed × life`. Colours are drawn from the active theme, so meteor heads
  re-colour with the selected palette.
  - `lib/shootingStars.ts` (new) — the **pure** logic: a seeded PRNG builds a
    deterministic spawn timeline and `computeShootingStars()` returns the meteors
    alive at a given instant (no mutable animation state). `lib/shootingStars.test.ts`
    (new) covers determinism, intensity scaling, on-screen bounds, theme hues, and
    the zero-intensity case.
  - `components/StarField.tsx` gained an additive `shooting` prop and a draw pass
    painted *behind* every existing layer (nebula, pulses, constellation, warp,
    stars), so the interactive galaxy stays the foreground.
  - `app/page.tsx` — a new **Shooting Stars: On/Off** toggle in the hero control
    row.

### Notes

- All changes are additive and non-breaking; the default galaxy is visually
  unchanged. Shooting Stars is off by default and orthogonal to Gravity Well,
  Constellation, Warp Drive, and Nebula Drift. Deployed to Vercel production.

## [0.4.0] — 2026-08-22

### Added

- **Nebula Drift** — a living depth backdrop. A soft, slow-drifting nebula is
  painted *behind* the stars, giving the hero a sense of 3D space instead of a
  flat field on black. Three clouds at different depths create a cursor
  parallax; each orbits the galaxy centre and gently breathes. Colours derive
  from the active theme, so the nebula always stays in sync with the selected
  palette. Controlled by a new **Nebula: On/Off** toggle next to Constellations.
  Pure geometry lives in `lib/nebula.ts` (unit-tested); StarField gains an
  additive `nebula` prop and a draw pass behind every existing layer.
- **Bug Report Link** — a "Report a bug" link in the nav bar and footer that
  opens a pre-filled GitHub new-issue page (`[Bug]` title + structured body
  template). Feedback now lands directly in the issue tracker, feeding the
  autonomous bug-fixing feedback loop. The reporter suggests a problem; the fix
  is owned by the autopilot, never dictated by the reporter.

### Notes

- All changes are additive and non-breaking; the default galaxy is visually
  unchanged. Nebula Drift is orthogonal to Gravity Well, Constellation, and
  Warp Drive. The Bug Report Link changes no galaxy visuals.

## [0.3.0] — 2026-08-22

### Added

- **Warp Drive** — hyperspace motion streaks. Crank the galaxy's spin past
  ~10 rpm and the stars begin to stretch into hyperspace streaks; at the max
  spin (20 rpm) the whole galaxy blurs into a tight swirl. The streaks are an
  emergent function of the spin knob (no toggle), so they always stay in sync
  with the galaxy the visitor is controlling, and they ripple with the gravity
  well and click shockwaves because their length follows each star's speed.
  Implemented as an additive draw pass in `components/StarField.tsx`.

### Notes

- Additive and non-breaking; the default 6 rpm galaxy is visually unchanged.

## [0.2.0] — 2026-08-22

### Added

- **Galaxy Presets** — shareable, deep-linkable galaxy configurations.
  - Config (theme, spiral arms, spin rpm, star count) is expressed as URL search
    params, so any galaxy is shareable by copying the URL.
  - `lib/galaxyPresets.ts` (config model, theme palettes, validation, shuffle).
  - `lib/useGalaxyParams.ts` (binds config to the URL; Back/Forward sync).
  - `components/GalaxyDock.tsx` — glass dock with theme swatches, steppers, the
    preserved Gravity toggle, and a **Shuffle** (🎲) button.
  - `components/StarField.tsx` gained an additive `config` prop; defaults are
    unchanged when no params are present.
- **Constellation Mode** — an optional toggle that connects nearby stars with a
  living web of faint cyan links. Links form between stars within a threshold
  distance and brighten where the stars are moving fastest, so the web ripples
  with the gravity well and to click shockwaves. Implemented as an additive draw
  pass in `components/StarField.tsx`; controlled by a new "Constellations: On/Off"
  toggle in the hero control bar.

### Fixed

- **Vercel production deploy unblocked.** The `VERCEL_API` token was refreshed
  with project-create rights. Created the `pinwheel-galaxy` project and shipped
  production at https://pinwheel-galaxy.vercel.app.

### Notes

- All changes are additive and non-breaking; the original gravity well and its
  default look are preserved. Constellation Mode is orthogonal to the Gravity
  Well toggle.
- Both features were built, locally verified (HTTP 200), and deployed to Vercel
  production.

## [0.1.0] — 2026-08-22

### Added
- Next.js 15 + TypeScript + Tailwind CSS project scaffold.
- Responsive landing page: glass nav bar, animated hero, feature cards, footer.
- **"Gravity Well" interactive starfield** — a canvas background with a
  cursor-driven gravitational well and click shockwaves, spring-back orbital
  physics, speed-based star glow, and a `prefers-reduced-motion` fallback.
- A "Gravity Well: On/Off" toggle in the hero.
- `FEATURES.md` (feature catalog) and this changelog.

### Notes
- Production deploy to Vercel is pending: the current `VERCEL_API` token has a
  read-only role and cannot create projects. Local build verified (HTTP 200).

[0.1.0]: https://github.com/pefman/pinwheel-galaxy/releases/tag/v0.1.0
