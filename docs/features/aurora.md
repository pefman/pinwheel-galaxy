# Aurora — a Northern-Lights Sky Layer

- **Date added:** 2026-08-22
- **Version:** 0.14.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

A real night sky holds more than stars: a faint, drifting atmospheric glow near
the horizon. **Aurora** borrows the look of the earth's northern lights and
paints a handful of soft, wavy ribbons across the upper sky of the galaxy. It
gives the sky a second, slower layer of motion — live “weather” that drifts and
sways — complementing the fast, cursor-driven starfield.

It is **off by default**, purely additive, and orthogonal to every existing
feature (gravity, spin, warp, nebula, constellations, meteors, variable stars,
Stellar Depth, zoom, the comet), so the default galaxy looks exactly as it did
before.

It is **purely additive and non-breaking**:

- It adds a new `auroraMode` layer that only touches the star *draw* pass — it
  is painted behind the stars and never touches the spring/gravity physics, so
  the gravity well behaves identically.
- It is **off by default**: when off, the ribbon layer is a no-op and the galaxy
  is visually unchanged.
- The shareable `?aurora=` recipe toggle is **off by default**, so a calm galaxy
  keeps a tidy URL.

## How it works (high-level)

- `lib/aurora.ts` (new) holds the **pure** logic, given as unit tests:
  - `computeAuroraBands({ height, hues, bandCount, seed })` uses a
    deterministic `mulberry32` PRNG to return a stable set of ribbon geometry
    `{ baseY, amplitude, wavelength, phase, speed, secondaryWavelength,
    secondaryPhase, hue, saturation, lightness, alpha }`. Hues are drawn from the
    active theme, so the ribbons stay in palette. Because the geometry is a pure
    function of a fixed seed, the same galaxy always shows the same aurora across
    frames and reloads — the sky never shimmers or reshuffles.
  - `auroraEdgeY(band, x, width, height, time, sway)` returns the vertical
    position of a ribbon's top edge: two layered sines (a primary wave plus a
    finer secondary) scaled by the band's amplitude and wavelength, plus an
    optional `sway` offset so the ribbon ripples with the gravity well.
  - `auroraEdgePoints(band, width, height, time, sway)` rasterises an edge into
    `AURORA_SAMPLES + 1` points across the width for drawing.
- `components/StarField.tsx` owns the live layer. It builds the band geometry
  once in `resize()` (so it tracks the current sky size but stays fixed between
  frames), then each frame advances an aurora clock, eases a horizontal sway
  toward the cursor's offset from the centre, and draws each ribbon as a filled
  path with a vertical gradient — **behind** the stars (like nebula and meteors).
  It touches the draw pass only, so it is fully orthogonal to every other layer.
- `lib/recipe.ts` gained a shareable `?aurora=` layer toggle (surfaced in
  `describeRecipe`).
- `app/page.tsx` wires `auroraMode={recipe.aurora}` and adds an **Aurora** chip
  to the Galaxy Dock's environment row.

### Constants (`lib/aurora.ts`)

| Constant | Value | Meaning |
|-------|:-----:|------|
| `AURORA_SEED` | `7` | Seed for the deterministic per-band assignment |
| `AURORA_BANDS` | `5` | Number of ribbons drawn |
| `AURORA_HEIGHT_FRACTION` | `0.55` | Ribbons occupy the top 55% of the sky |
| `AURORA_SAMPLES` | `96` | Horizontal samples per ribbon edge |

## Key files / components

- `lib/aurora.ts` (new) — `mulberry32`, `computeAuroraBands`, `auroraEdgeY`,
  `auroraEdgePoints`.
- `lib/aurora.test.ts` (new) — 10 unit tests for the pure logic.
- `components/StarField.tsx` — new `auroraMode` prop, band build in `resize`, and
  the behind-the-stars ribbon draw.
- `lib/recipe.ts` — the shareable `?aurora=` layer toggle.
- `app/page.tsx` — the **Aurora** toggle chip.

## User-facing behavior

- Click **Aurora: On** (new chip in the dock) — or open `?aurora=on` — and watch
  a handful of soft green/cyan ribbons drift across the upper sky, gently swaying
  with the gravity well. The gravity well, spin and every other toggle keep
  working exactly as before.
- Off by default; the default galaxy is unchanged.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Aurora: On** and watch the ribbons drift; add Nebula or Constellation
   alongside — the ribbons sit behind both cleanly.
4. Toggle it off again — the sky returns to its steady state.
5. `npm test` — 10 new tests cover determinism, band count, range invariants,
   theme-hue selection, seed sensitivity, edge math, time drift, sway, and
   rasterisation.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 110/110 unit tests pass, including 10 in
  `lib/aurora.test.ts`: determinism, band count, range invariants, theme-hue
  selection, seed sensitivity, edge math, time drift, sway, and rasterisation.

## Known limitations / follow-ups

- Toggle state is shareable via `?aurora=` (like Nebula Drift, Shooting Stars,
  Zoom and Stellar Depth) but not persisted in the dock beyond the recipe. A
  natural follow-up is a saved “Aurora” preset.
- The ribbon palette is drawn from the active theme hues; future cycles could add
  a dedicated aurora hue (e.g. a faint red aurora band) and per-ribbon intensity
  controls.
- All ribbons share one fixed seed; future cycles could seed it from the galaxy
  config so a saved galaxy keeps its own aurora pattern.
