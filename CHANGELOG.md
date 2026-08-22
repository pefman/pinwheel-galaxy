# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

## [0.10.0] — 2026-08-22

### Added

- **Shareable Galaxy Recipes** — the URL now captures the state of *every*
  interactive layer, not just the spiral config. A shared link re-hydrates the
  exact galaxy a visitor was looking at: nebula, constellations, meteors, depth,
  variable stars, comet and the Zoom mode — all included, so you can finally
  share your full creation, not just its colour and arms. The base
  `galaxyPresets` system already made `?theme=&arms=&rpm=&stars=` shareable;
  this layer adds `?nebula=&constellation=&meteors=&depth=&variable=&comet=&zoom=`
  on top. Every layer defaults to **off**, so a plain galaxy still produces a
  tidy URL with no extra params, and the default galaxy is visually unchanged.
  - `lib/recipe.ts` (new) — the **pure** recipe model: `parseRecipe` (reads the
    layer toggles, missing → off), `recipeToParams` (writes only the on-layers),
    `resolveRecipe`, `toggleLayer` and `describeRecipe`. `lib/recipe.test.ts`
    (new, 9 tests) covers parse/build, the off-is-default rule, the tidy-URL
    behaviour, round-tripping, and the toggle.
  - `lib/useGalaxyParams.ts` now owns the recipe state, persists every layer
    toggle into the URL via `history.pushState`, and re-reads it on Back/Forward
    (`popstate`) — the recipe is part of the URL's source of truth alongside the
    config, gravity and zoom.
  - `app/page.tsx` drives every dock toggle from `recipe` + a single `toggle()`
    setter instead of seven local `useState`s, so all layer state round-trips
    through the URL in one place.

### Notes

- Additive and non-breaking; with no layer toggles the URL is unchanged and the
  default galaxy looks exactly as before. Built, locally verified (`npm run
  build` + `npm test` 70/70), and deployed to Vercel production.

## [0.9.0] — 2026-08-22

### Added

- **Comet Trail** — an opt-in cursor-following comet. When enabled, a bright
  comet with a tapering, fading tail trails the pointer across the hero: its
  tail length grows with cursor speed (a slow drift is a short comet, a swipe a
  long streak) and its hue is drawn from the galaxy's active theme, so it always
  stays in sync with the colour. Implemented additively as a new draw pass in
  `components/StarField.tsx`, painted *after* the galaxy-zoom transform so it
  stays pinned to the on-screen cursor regardless of zoom — it never touches the
  gravity-well spring physics, warp streaks, nebula, constellations, meteors,
  depth or variable stars, so it is fully orthogonal and **off by default**.
  - `lib/comet.ts` (new) — the **pure** logic: a deterministic `mulberry32`
    PRNG, `cursorSpeed` (px/s from recent pointer samples), `polylineLength` /
    `resampleTail` (evenly resampling the pointer path into tail points) and
    `tailLengthFromSpeed` (mapping speed onto a capped tail length).
    `lib/comet.test.ts` (new, 16 tests) covers determinism, range, px/s,
    polyline length, even resampling, and tail-length mapping/capping.
  - `components/StarField.tsx` gained a `cometMode` prop, a bounded pointer
    sample ring buffer with a 500 ms age prune, an eased comet head, and the
    tapered-tail + halo + core draw pass.
  - `app/page.tsx` gained a **Comet: On/Off** chip in the dock.

### Notes

- Additive and non-breaking; the default galaxy (toggle off) is visually
  unchanged. Built, locally verified (`npm run build` + `npm test` 61/61), and
  deployed to Vercel production.

## [0.8.0] — 2026-08-22

### Added

- **Variable Stars** — an opt-in "living sky" enrichment. When enabled, a
  fraction of the stars brighten and dim on their own slow light curves
  (Cepheid-style sinusoids with an individual period, phase and amplitude),
  and a small rare subset are *giants* — drawn larger and softer, and also
  breathing on a deeper curve. The effect is applied purely in the star draw
  pass, so it never touches the gravity-well spring physics, warp streaks,
  nebula, constellations, meteors, zoom or Stellar Depth — it is fully
  orthogonal and **off by default** (every multiplier is exactly 1 when off).
  - `lib/variableStars.ts` (new) — the **pure** logic: a deterministic
    `mulberry32` PRNG, `assignVariableStars` (a stable per-star profile per
    seed), `variableBrightness` (the bounded sinusoid), and the
    `variableAlpha` / `variableSize` accessors. `lib/variableStars.test.ts`
    (new, 12 tests) covers determinism, range, giant/variable fractions,
    light-curve bounds/periodicity/phase, and seed sensitivity.
  - `components/StarField.tsx` gained a `variableMode` prop, builds the
    per-star profiles in `resize()`, and applies `variableAlpha` to each star's
    alpha and `variableSize` to giants' radius in the draw pass.
  - `app/page.tsx` gained a **Variable Stars: On/Off** chip in the dock.

### Notes

- Additive and non-breaking; the default galaxy (toggle off) is visually
  unchanged. Built, locally verified (`npm run build` + `npm test` 45/45), and
  deployed to Vercel production.

## [0.7.0] — 2026-08-22

### Added

- **Stellar Depth** — an opt-in 3D parallax + twinkle layer over the interactive
  starfield. When enabled, moving the cursor shifts near stars more than far
  ones (parallax), stars gently twinkle (nearer stars harder), and far stars are
  dimmed and softened like atmospheric perspective. Implemented additively in the
  star draw pass only — it never touches the gravity-well spring physics, so it
  is fully orthogonal to every other feature and **off by default**.
  - `lib/starDepth.ts` (new) — the **pure** logic: `depthForIndex` (a stable,
    seeded depth map in `[0.15, 1]`), `twinklePhase`, `twinkleAlpha`,
    `depthScale`, and `parallaxFor`. `lib/starDepth.test.ts` (new) covers range,
    determinism, parallax scaling, twinkle bounds/variation, and scale mapping.
  - `components/StarField.tsx` gained a `depthMode` prop, builds the depth map +
    twinkle phases in `resize()`, eases a cursor-parallax vector each frame, and
    applies a draw-time `parallax × depth` offset plus twinkle/atmospheric
    scaling to the star pass.
  - `app/page.tsx` gained a **Depth: On/Off** toggle in the hero control row.

### Notes

- Additive and non-breaking; the default galaxy (toggle off) is visually
  unchanged. Built, locally verified (`npm run build` + `npm test` 33/33), and
  deployed to Vercel production.

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
