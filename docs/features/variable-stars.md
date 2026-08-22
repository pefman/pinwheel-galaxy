# Variable Stars — a Living-Sky Layer

- **Date added:** 2026-08-22
- **Version:** 0.8.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

A real night sky is never perfectly still: a fraction of stars brighten and dim
on their own slow light curves, and a handful are *giants* — larger and softer.
**Variable Stars** borrows that idea and layers it over the interactive
starfield so the galaxy *breathes* even when you leave it alone.

It is **off by default**, purely additive, and orthogonal to every existing
feature (gravity, spin, warp, nebula, constellations, meteors, zoom, Stellar
Depth), so the default galaxy looks exactly as it did before.

It answers the ongoing trend toward living, generative backgrounds — here the
starfield gains its own subtle temporal motion without any animation graph or
external asset, just per-star trigonometric maths seeded deterministically.

It is **purely additive and non-breaking**:

- It adds a new `variableMode` layer that only touches the star *draw* pass — it
  never touches the spring/gravity physics, so the gravity well behaves
  identically.
- It is **off by default**: when off, every multiplier is exactly `1` and the
  galaxy is visually unchanged.
- When off, the affected code paths are no-ops (no per-star light curve, no
  giant sizing).

## How it works (high-level)

- `lib/variableStars.ts` (new) holds the **pure** logic, given as unit tests:
  - `assignVariableStars(count, seed)` uses a deterministic `mulberry32` PRNG to
    give every star a stable profile `{ period, phase, amplitude, isGiant,
    isVariable }`. Because it is a pure function of the index and a fixed seed,
    the same star is always the same variable star across frames and reloads —
    the sky never shimmers or reshuffles.
  - `variableBrightness(t, star)` returns a bounded sinusoid in
    `[1 - amplitude, 1 + amplitude]`, so a star never goes fully black or blows
    out. Each star has its own period, phase and amplitude, so the field
    twinkles out of unison.
  - Giants are a rare subset: they are drawn larger (`variableSize` ≈ 2.4×) and
    breathe on a deeper curve. Giants are always variable (`isVariable`), so a
    giant is never a dim, invisible point.
- `components/StarField.tsx` owns the live layer. It builds the per-star
  profiles once in `resize()` (so they track the star count but stay fixed
  between frames), then in the star draw pass multiplies each star's alpha by
  its light curve and draws giants at `variableSize` — only when the layer is
  on. It touches the draw pass only, so it is fully orthogonal to gravity, warp,
  nebula, constellations, meteors, zoom and Stellar Depth.
- `app/page.tsx` gained a **Variable Stars: On/Off** chip in the dock.

### Constants (`lib/variableStars.ts`)

| Constant | Value | Meaning |
|-------|:-----:|------|
| `VARIABLE_SEED` | `1337` | Seed for the deterministic per-star assignment |
| `VARIABLE_FRAC` | `0.15` | Fraction of stars that brighten/dim on light curves |
| `GIANT_FRAC` | `0.02` | Fraction of stars that are larger, softer giants |
| `MIN_PERIOD` / `MAX_PERIOD` | `6 s` / `40 s` | Inclusive light-curve period range |

## Key files / components

- `lib/variableStars.ts` (new) — `mulberry32`, `assignVariableStars`,
  `variableBrightness`, `variableAlpha`, `variableSize`.
- `lib/variableStars.test.ts` (new) — 12 unit tests for the pure logic.
- `components/StarField.tsx` — new `variableMode` prop, profile build in
  `resize`, and draw-time light-curve + giant-size modulation.
- `app/page.tsx` — the **Variable Stars** toggle chip.

## User-facing behavior

- Click **Variable Stars: On** (new chip in the dock) and watch — over a few
  seconds a scattered subset of stars gently brighten and dim at their own
  rates, while a few rare giants glow noticeably larger and breathe more
  dramatically. The gravity well, spin and every other toggle keep working
  exactly as before.
- Off by default; the default galaxy is unchanged.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Variable Stars: On** and watch the sky settle into a gentle,
   uneven twinkle; a handful of stars glow larger (giants).
4. Toggle it off again — the field returns to its steady state.
5. Turn on Constellation or Stellar Depth together — the light curves compose
   cleanly with those layers.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 45/45 unit tests pass, including 12 in
  `lib/variableStars.test.ts`: determinism, range, giant/variable fractions,
  light-curve bounds/periodicity/phase, and seed sensitivity.

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (same as Constellation Mode,
  Nebula Drift, Shooting Stars, Zoom and Stellar Depth) — only the galaxy
  config is shareable. A natural follow-up is persisting the variable toggle via
  a `?variable=` param.
- All variable stars share one fixed seed; future cycles could seed it from the
  galaxy config so a saved galaxy keeps its own variable pattern.
