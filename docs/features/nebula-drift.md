# Nebula Drift — Living Depth Backdrop

- **Date added:** 2026-08-22
- **Version:** 0.4.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

Behind every galaxy there is only black space. **Nebula Drift** fills that
space with a soft, slow-drifting **nebula** — a living depth backdrop that
sits *behind* the stars and gives the hero a real sense of three-dimensional
space instead of a flat field of points on black.

It is a direct response to the 2026 anti-homogenization trend (PINW-11): the
average AI-built site is a flat, generic template, while distinctive, tactile,
layered depth is rising as a marker of a site that was *designed*, not generated.
A breathing nebula coloured to match the galaxy is a signature visual token that
generic templates don't have.

It is **purely additive and non-breaking**:

- It paints a new draw pass *behind* every existing layer (well, constellation,
  warp streaks, stars) — it never touches or occludes them.
- It is **off by default**, so the default 6-rpm violet galaxy looks exactly as
  it did before. Enabling it changes only the background atmosphere.
- It works with every theme, every arm count, and independently of the Gravity
  Well toggle, Constellation Mode, and Warp Drive.

## How it works (high-level)

- A new `nebula` prop on `StarField` gates an additive draw pass that runs right
  after `ctx.clearRect`, before the pulses and stars are painted.
- `lib/nebula.ts` (new) holds the **pure** geometry: given the frame time,
  canvas size, galaxy centre, and a cursor parallax offset, it returns the
  position, colour, and opacity of each drifting cloud. Being pure, it is
  unit-tested without a canvas or browser.
- Three clouds at different **depths** create a parallax sense of 3D: the closer
  layers follow the cursor more than the farther ones. Each cloud slowly orbits
  the galaxy centre and gently **breathes** (its opacity rises and falls on a
  sine wave with a per-layer phase offset, so they don't pulse in lock-step).
- Colours are derived from the galaxy's **active theme hue**, so the nebula
  always stays in sync with whatever theme the visitor has selected.

### The depth layers

| Layer | Depth | Role |
|-------|:-----:|------|
| Far   | 0.25  | Large, slow, faint — deepest space |
| Mid   | 0.55  | Medium, counter-rotating |
| Near  | 0.90  | Smallest, follows the cursor most |

## Key files / components

- `lib/nebula.ts` (new) — `NEBULA_LAYERS`, `computeNebulaClouds()`, types.
- `lib/nebula.test.ts` (new) — 6 unit tests for the pure geometry.
- `components/StarField.tsx` — new `nebula` prop + the draw pass behind the stars.
- `app/page.tsx` — the **Nebula: On/Off** toggle in the hero control row.

## User-facing behavior

- Click **Nebula: Off → On** (the left toggle in the bottom control row, next to
  Constellations). A soft, glowing cloud field fades in behind the galaxy.
- Move the cursor: the clouds drift with a parallax depth — near layers follow
  the cursor, far layers lag.
- The nebula's colours match the active theme: violet for the Violet Spiral,
  green/teal for Aurora, warm orange for Ember, etc.
- It breathes slowly and orbits; it never draws over the stars or text.
- Works independently of the Gravity Well, Constellation, and Warp features.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Click **Nebula: Off** → **On** — a soft depth backdrop appears behind the stars.
4. Move the cursor — the clouds shift with parallax depth.
5. Pick a different theme (or a deep link) — the nebula re-colours to match.
6. Toggle Off — the backdrop fades out; the stars remain.

Direct link with the Aurora theme + nebula:
`?theme=aurora&arms=5&rpm=9&stars=400` (then toggle Nebula On).

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 6/6 unit tests pass (`lib/nebula.test.ts`): layer count,
  on-screen bounds, determinism, theme-hue derivation, depth-sorted parallax,
  and temporal orbital drift.

## Vision verification

- Playwright screenshots confirm the backdrop renders as a soft, low-opacity glow
  behind the stars and text (never occluding them), toggles cleanly On/Off, and
  re-colours with the active theme (violet default / green-aurora).

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (same as Constellation Mode).
- The clouds orbit on a fixed radius; a noise-driven drift would feel more
  organic.
- A "depth" slider could let visitors dial the parallax strength.
- Only the theme's first hue seeds the nebula; a future pass could spread all
  theme hues across the clouds.
