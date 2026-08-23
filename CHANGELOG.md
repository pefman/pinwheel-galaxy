# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

## [0.20.0] — 2026-08-23

### Added

- **Ringed Giant** — a new sky body: a ringed gas giant that drifts slowly
  across the sky on its own clock, its rings spinning (inner particles racing
  outer ones, per Kepler's third law). Adds a new object class to the sky
  (gas giant + tilted particle ring) alongside the moon, distant galaxy and
  black hole.
  - `lib/ringedGiant.ts` (new) — pure, deterministic logic: sky-crossing drift,
    atmospheric bands, palette, and a Keplerian particle ring; `projectRingParticle`
    projects particles onto the tilted plane and reports which side sits behind
    the planet for correct occlusion. `lib/ringedGiant.test.ts` (new, 9 tests).
  - `lib/recipe.ts` — new `ringedGiant` layer and `?ringedGiant=on` URL param.
  - `components/StarField.tsx` — new `ringedGiantMode` prop, drift clock, and a
    draw pass (soft glow, banded disk with spherical shading, and a two-pass
    ring: back rings → opaque disk → front rings). Painted behind the stars.
  - `app/page.tsx` — dock toggle chip + prop wiring.
  - Off by default; enabled from the Galaxy Controls dock (gold “Ringed Giant”
    chip) or `?ringedGiant=on`. Pauses with reduced motion. Test count: 170/170.

## [0.19.0] — 2026-08-24

### Added

- **Fullscreen Galaxy** — expand the interactive hero starfield to fill the
  whole viewport and return to the normal hero layout with one click. A new
  **Fullscreen** button (⛶ / ✕) in the bottom control bar requests the browser
  Fullscreen API, with a graceful fallback chrome-less expanded layout where the
  API is unavailable. The hero's title overlay hides while fullscreen and the
  environment chips collapse to a single "Show galaxy features" toggle so the
  galaxy reads as a clean backdrop. Toggle with the button, the **`f`** keyboard
  shortcut, or **Esc**. Entering writes `?fullscreen=on` into the URL, so a
  shared link (or reloading with `?fullscreen=on`) starts already in fullscreen.
  Off by default and purely additive — the default galaxy is unchanged.
  - `lib/fullscreen.ts` (new) + `lib/fullscreen.test.ts` (7 tests).
  - `components/GalaxyDock.tsx` — Fullscreen button and collapsible environment
    row.
  - `app/page.tsx` — fullscreen state, enter/exit (API + fallback), `f`
    shortcut, Escape handling, `?fullscreen=on` deep-linking, and the
    chrome-less expanded hero layout. Browser API availability is checked lazily
    (never during render) so hydration stays clean.
  - `docs/features/fullscreen.md` (new). Full test count: 161/161.

## [0.18.0] — 2026-08-23

### Added

- **Black Hole** — the sky now holds a placeable gravitational singularity. A
  black hole is a pure-black event horizon ringed by a photon ring and a
  swirling accretion disk of infalling matter. It appears off-default anywhere
  in the upper sky and you can **drag it by its glow** to reposition it. The
  disk's near half wraps in front of the horizon; its Doppler shift makes the
  approaching side brighter and bluer and the receding side dimmer and redder
  — the hallmark of real accretion disks. The opaque horizon hides whatever
  stars sit behind it. Purely additive and off by default, orthogonal to gravity,
  warp, nebula, constellations, meteors, variable stars, Stellar Depth, zoom, the
  comet, the moon, the aurora, the supernovae and the distant galaxy.
  - `lib/blackHole.ts` (new) — the **pure** model. `computeBlackHole` picks a
    deterministic, off-centre, edge-padded placement and precomputes a field of
    Keplerian accretion particles (inner particles orbit faster, brightness
    falls off toward the edge). `accretionPoint` projects a particle onto the
    tilted, spinning disk; `dopplerFactor` / `dopplerHue` give the
    blueshift/redshift; `deflectionMagnification` / `einsteinRadius` model the
    gravitational lensing; `isInsideEventHorizon` tests the event horizon.
  - `components/StarField.tsx` — new `blackHoleMode` prop, a draggable hole
    (mouse + touch), a running disk-spin clock, and an end-of-frame draw of the
    halo, photon ring, event horizon and near-half accretion disk.
  - `lib/recipe.ts` — the shareable `?blackHole=` layer toggle.
  - `app/page.tsx` — the **Black Hole** toggle chip in the Galaxy Dock.

## [0.17.0] — 2026-08-23

### Added

- **Distant Galaxy** — the deep background now holds *another* galaxy. A
  far-away spiral galaxy drifts slowly in one corner of the sky, made of a
  dense field of faint stars wound into spiral arms around a warm central
  bulge, seen at a tilted inclination. It reads as looking out into deep space
  past the interactive galaxy you are making — scenery rather than the thing
  you are making — so it sits behind everything and rotates only a hair over a
  session. Unlike every other layer, it is a whole *second* galaxy (the
  interactive one is the foreground), purely additive and off by default, and
  orthogonal to gravity, warp, nebula, constellations, meteors, variable stars,
  Stellar Depth, the comet, the moon, the aurora and zoom.
  - `lib/distantGalaxy.ts` (new) — the **pure** model. A deterministic
    `armPoint` helper walks a logarithmic spiral arm (`r` grows linearly with
    the normalised radius `u`, the angle winds by `turns` full rotations), and
    `buildDistantGalaxyField` fans stars along `arms` such arms (with
    perpendicular scatter) and clusters the warm bulge stars near the core.
    `computeDistantGalaxy` picks a seeded placement (off-centre, kept clear of
    the interactive galaxy and padded from the edges), a small distant radius,
    an arm count (2–5), an inclination `tilt` and a base rotation — returning a
    ready-to-draw `DistantGalaxy` with its pre-computed star field. Everything
    is plain numbers so the behaviour is unit-tested without a canvas
    (`lib/distantGalaxy.test.ts`, 10 tests).
  - `components/StarField.tsx` gained an opt-in `distantMode` prop that builds
    the galaxy once in `resize()` and advances only its global rotation on a
    slow clock (one turn per ~260 s), painting a warm bulge glow plus the
    rotated + tilted field of faint stars at screen scale (inside the hero, but
    outside the galaxy's zoom transform) so it stays far away while you zoom.
  - `lib/recipe.ts` gained a shareable `?distant=` layer toggle (off by
    default, so a calm galaxy keeps a tidy URL) and it is surfaced in
    `describeRecipe`.
  - `app/page.tsx` wires `distantMode={recipe.distant}` and adds a
    **Distant Galaxy** chip to the Galaxy Dock's environment row.

### Notes

- Additive and non-breaking: every existing layer is untouched, the default
  galaxy looks exactly as before, and the distant galaxy is inert until toggled
  on. Built and locally verified (`npm run build` + `npm test` 141/141, and a
  headless screenshot confirming the tilted spiral renders in the background).
  Deploying to Vercel production.

## [0.16.0] — 2026-08-22

### Added

- **Supernova** — the calm sky occasionally *detonates*. A background star lives
  quietly for a long intermission (40–70 s), then over ~17 s brightens to a
  brilliant blue-white flash (with diffraction spikes and an expanding
  shockwave shell), fades to a faint remnant, and goes quiet again. Unlike every
  other layer — which is a continuous field or glow — a supernova is a single,
  rare, **discrete event**, so it reads as something happening inside the distant
  spiral we are looking at. It is off by default, purely additive, and orthogonal
  to gravity, warp, nebula, constellations, meteors, variable stars, Stellar
  Depth, the comet, the moon and zoom.
  - `lib/supernova.ts` (new) — the **pure** model. A deterministic explosion
    schedule (`intermissionFor`, `explosionStartAt`) built from a mulberry32
    PRNG; `computeSupernova` walks the schedule and returns the active
    `SupernovaState` — `{ phase, x, y, intensity, shellRadius, shellAlpha,
    remnantAlpha, spikeLength }` — with the star placed off-centre (never
    overlapping the interactive galaxy) and padded from the edges. The timeline
    advances rise → peak → fade → remnant → quiet, and the phase is exposed via
    `describeSupernovaPhase`.
  - `lib/supernova.test.ts` (new, 11 tests) covers determinism, schedule
    coverage, on-screen + off-centre placement, the rise→peak→fade→remnant
    ordering, the intensity curve, the shell's expand-and-fade behaviour, the
    intermission floor/ceiling, explosion spacing, seed sensitivity, and phase
    labels.
  - `lib/recipe.ts` gained a shareable `?supernova=` layer toggle (off by
    default) and it is surfaced in `describeRecipe`.
  - `components/StarField.tsx` gained an opt-in `supernovaMode` prop that advances
    a supernova clock each frame and paints, **behind the stars** (like the moon):
    a thin expanding shockwave ring with a soft glow, a four-way diffraction
    cross whose length tracks intensity, and a core glow/bloom whose size and
    brightness track the flash — plus a faint lingering remnant after the flash.
  - `app/page.tsx` wires `supernovaMode={recipe.supernova}` and adds a
    **Supernovae** chip to the Galaxy Dock's environment row.

### Notes

- Additive and non-breaking: the starfield, presets, recipes, dock and every
  prior feature are untouched, the default galaxy looks exactly as before, and
  the supernova is inert until toggled on. Built and locally verified
  (`npm run build` + `npm test` 131/131). Deploying to Vercel production.

## [0.15.0] — 2026-08-22

### Added

- **Lunar Transit** — the night sky now has a *moon*. A single, recognisable
  body rises from the left edge of the hero, drifts slowly across the sky on its
  own clock, and waxes and wanes through a full cycle (new → full → new on a
  4-minute cycle so a visitor sees every phase in a single session). It is
  off by default, purely additive, and distinct from every other layer: not a
  field of points, not a sky-wide ribbon — one body with its own face and
  phase.
  - `lib/moon.ts` (new) — the **pure** model: `computeMoon` (a drifting position
    on a 240 s transit, a fixed seeded crater face, a `monthT`-clock phase
    `litFraction = 0.5 + 0.5·cos(2π·monthT)`, a lit-side flip at full moon, and
    a human phase label), plus `terminatorXRadius` — the terminator is a true
    half-ellipse whose extent `radius·(1−2·litFraction)` makes the drawn lit
    area exactly equal `litFraction` of the disk.
  - `lib/moon.test.ts` (new, 10 tests) covers determinism, the new→full→new
    sweep, the lit-side flip, the terminator's half-ellipse extent, the lit-area
    matching the fraction, label correctness, and the transit period.
  - `lib/recipe.ts` gained a shareable `?moon=` layer toggle (off by default) and
    it is surfaced in `describeRecipe`.
  - `components/StarField.tsx` gained an opt-in `moonMode` prop that advances a
    moon clock each frame and paints, **behind the stars** (like nebula,
    meteors and the aurora): a soft outer glow, the full disk base (faint
    earthshine on the dark side), the seeded craters clipped to the disk, and
    the lit region (a semicircle on the lit limb closed by the terminator
    half-ellipse, mirrored for waxing vs waning).
  - `app/page.tsx` wires `moonMode={recipe.moon}` and adds a **Moon** chip to
    the Galaxy Dock's environment row.

### Notes

- Additive and non-breaking: the starfield, presets, recipes, dock and every
  prior feature are untouched, the default galaxy looks exactly as before, and
  the moon is inert until toggled on. Built and locally verified
  (`npm run build` + `npm test` 120/120). Deploying to Vercel production.

## [0.14.0] — 2026-08-22

### Added

- **Aurora** — the sky now has *northern lights*. A handful of soft, wavy
  ribbons drift across the upper sky, painted **behind** the stars like nebula
  and meteors so the interactive galaxy stays in the foreground. The effect is
  a pure, deterministic function of the sky (`lib/aurora.ts`), so it keeps its
  shape between frames and reloads — the same galaxy always shows the same
  aurora. The ribbons drift slowly on their own clock and sway gently with the
  gravity well, so the sky reads as live weather rather than a looped animation.
  - `lib/aurora.ts` (new) — the **pure** model: `computeAuroraBands` (a stable
    set of ribbon geometry seeded by a mulberry32 PRNG, hues drawn from the
    active theme), `auroraEdgeY` / `auroraEdgePoints` (the wavy top edge, two
    layered sines plus a gravity-well sway), and `AURORA_SAMPLES`.
  - `lib/aurora.test.ts` (new, 10 tests) covers determinism, band count, range
    invariants, theme-hue selection, seed sensitivity, edge math, time drift,
    sway, and rasterisation.
  - `lib/recipe.ts` gained a shareable `?aurora=` layer toggle (off by default,
    so a calm galaxy keeps a tidy URL) and it is surfaced in `describeRecipe`.
  - `components/StarField.tsx` gained an opt-in `auroraMode` prop that renders
    the ribbons behind the stars; it is orthogonal to every other layer.
  - `app/page.tsx` wires `auroraMode={recipe.aurora}` and adds an **Aurora**
    chip to the Galaxy Dock's environment row.

### Notes

- Additive and non-breaking: the starfield, presets, recipes, dock, soundscape
  and every prior feature are untouched, the default galaxy looks exactly as
  before, and the aurora is inert until toggled on. Built and locally verified
  (`npm run build` + `npm test` 110/110). Deploying to Vercel production.

## [0.13.0] — 2026-08-22

### Added

- **Shareable Galaxy Prints** — export the galaxy you are looking at as a
  branded, shareable PNG “print”. A new **Share** (⛶) button in the Galaxy Dock
  opens a small popover that captures the live starfield, composites it onto a
  1080×1350 portrait card (cosmos glow, a cover-cropped galaxy inside a rounded
  frame, and a footer with the brand, a one-line galaxy description, and the
  shareable deep link), and offers three ways out: **Download PNG**, **Web
  Share** (native OS share sheet, when available), and **Copy link** (copies the
  current deep link). The print is a pure, deterministic function of the current
  galaxy and URL — no canvas, no state, no network — so the same galaxy always
  produces the same image.
  - `lib/exportCard.ts` (new) — the **pure** composition model: `computeCover`
    (fit/crop of the galaxy onto the card image window), `wrapText` (font-aware
    word wrapping), `imageWindow` (the framed image rectangle), `deepLink`
    (canonical share URL), and `describePrint` (the human-readable galaxy label
    with default labels stripped). `lib/exportCard.test.ts` (new, 10 tests)
    covers cover geometry, wrapping, window math, deep-link composition, and the
    description.
  - `components/GalaxyShareCard.tsx` (new) — the client runtime: a
    `getCanvas`/`deepLinkUrl`/`description`-driven component that renders the
    card, wires up Download / Web Share / Copy link, and manages only its own
    preview state. It is a pure function of its props, so it is trivially
    testable and side-effect free until the user acts.
  - `components/StarField.tsx` gained an optional `canvasRef` callback so the
    parent can forward the live canvas element to the share card. The existing
    internal canvas ref is now `canvasElementRef` to avoid a name clash.
  - `components/GalaxyDock.tsx` gained an optional `share` slot; a **Share**
    button is surfaced next to Shuffle / Gravity only when the parent passes a
    control, keeping the dock lean by default.
  - `app/page.tsx` wires it together: it forwards the live canvas to StarField,
    builds the current deep link from the page URL, and renders
    `GalaxyShareCard` in the dock with a description derived from
    `describeConfig` + `describeRecipe`.

### Notes

- Additive and non-breaking: the starfield, presets, recipes, dock and Galaxy
  of the Day are untouched, the default galaxy looks exactly as before, and the
  Share control is inert until clicked. Built and locally verified
  (`npm run build` + `npm test` 100/100). Deploying to Vercel production.

## [0.12.0] — 2026-08-22

### Added

- **Cosmic Soundscape** — the galaxy now has a *sound*. A generative,
  reactive ambient soundscape synthesises live tone-by-tone with the Web Audio
  API (no samples, no network, no dependencies), and it tracks the visible
  galaxy: the theme sets the musical scale, the spin speed sets the tempo, the
  star density sets the sparkle rate, and the sky layers add their voice — the
  nebula a sustained pad, constellations a slow arpeggio, variable stars
  high-octave twinkle, and a comet an upward sweep. It is a pure function of
  the galaxy (`lib/soundscape.ts`), so it is deterministic, backend-free, and
  shareable via the existing recipe/URL system (`?sound=on` pre-arms the
  toggle).
  - `lib/soundscape.ts` (new) — the **pure** musical model: each theme maps to
    a distinct modal scale + tonic, `composeVoice` derives tempo from rpm and
    sparkle density from star count and maps layer toggles to voice triggers,
    plus `midiToFreq` and `describeVoice`. `lib/soundscape.test.ts` (new, 8
    tests) covers the scale/tonic mapping, tempo and density ranges, the
    layer triggers, determinism, and the description.
  - `lib/useSoundscape.ts` (new) — the client runtime: a tiny `SoundscapeEngine`
    that owns a few oscillators + gain nodes, rebuilds the pad and re-arms the
    per-beat scheduler whenever the voice changes, and schedules shimmer /
    twinkle / comet events on tempo. **Muted by default** and gated behind the
    first user gesture (respecting autoplay policies), with graceful
    degradation when `AudioContext` is unavailable or `prefers-reduced-motion`
    is on.
  - `lib/useGalaxyParams.ts` gained a shareable `?sound=` toggle (muted by
    default, so a quiet galaxy keeps a tidy URL) and a `toggleSound` setter.
  - `app/page.tsx` drives `useSoundscape(config, recipe, sound)` and adds a
    compact **Sound** chip to the Galaxy Dock; `installSoundscapeGesture()`
    revives the audio context on the first click/keypress.

### Notes

- Additive and non-breaking: the starfield, dock, presets, recipes and Galaxy
  of the Day are untouched and the default galaxy looks and sounds exactly as
  before (silent, by design). Built, locally verified (`npm run build` +
  `npm test` 90/90), and deployed to Vercel production.

## [0.11.0] — 2026-08-22

### Added

- **Galaxy of the Day** — a fresh, seeded galaxy that refreshes once per
  calendar day, giving visitors a shared reason to return. Everyone sees the
  same galaxy today and a new one tomorrow, with no backend and no stored state.
  It is the natural companion to the shipped Galaxy Recipes (v0.10.0): the daily
  galaxy is just another deep link that re-hydrates exactly.
  - `lib/galaxyOfDay.ts` (new) — the **pure** logic: a local-time `dayKey`
    (`YYYY-MM-DD`), a stable 32-bit FNV-1a `hashSeed`, a `mulberry32` PRNG
    seeded by the day, `dailyConfig` (arms/rpm/stars snapped to the real preset
    knobs, theme drawn from the preset palettes), `pickLayers` (a low-bias
    subset of the sky layers, 0–3), `dailyPrompt` (a short creative constraint
    drawn from a fixed catalogue), `galaxyOfDay` (the full daily result) and
    `dailyDeepLink` (the shareable `/?theme=&arms=&rpm=&stars=&<layers>=on`
    URL). `lib/galaxyOfDay.test.ts` (new, 12 tests) covers determinism, range,
    per-day stability, subset budget, and deep-link round-tripping.
  - `app/page.tsx` gained a `GalaxyOfTheDay` section: the daily prompt chip, a
    one-line summary of today's galaxy, an "Open today's galaxy" deep link
    (opens the exact galaxy in a new tab), and a "Copy shareable link" button.
    It is fully client-side and flips to the new galaxy at local midnight via a
    `setTimeout`/`setInterval` tick.

### Notes

- Additive and non-breaking; the starfield, dock, presets and recipe system are
  untouched and the default galaxy looks exactly as before. Built, locally
  verified (`npm run build` + `npm test` 82/82), and deployed to Vercel
  production.

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
