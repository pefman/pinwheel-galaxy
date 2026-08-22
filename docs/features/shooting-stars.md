# Shooting Stars — Meteors Across the Deep Sky

- **Date added:** 2026-08-22
- **Version:** 0.5.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

Behind every galaxy there has only been black space. **Shooting Stars** lets
occasional **meteors streak across that deep sky** — a bright head fading into a
long, soft tail — so the hero reads as looking up at a living night rather than
a fixed backdrop of points.

It is a small, delightful, purely additive atmospheric touch, **off by
default**, so the default 6-rpm violet galaxy looks exactly as it did before. It
answers the 2026 anti-homogenization trend: a little named, atmospheric motion —
a shooting star — that marks a site as *designed* rather than generated, and
that complements (rather than competes with) the interactive galaxy.

It is **purely additive and non-breaking**:

- It paints a new draw pass *behind* every existing layer (nebula, pulses,
  constellation web, warp streaks, stars) — it never touches or occludes them.
- It is **off by default**, so the default galaxy is visually unchanged.
- It works with every theme, every arm count, and independently of the Gravity
  Well toggle, Constellation Mode, Warp Drive, and Nebula Drift.

## How it works (high-level)

- A new `shooting` prop on `StarField` gates an additive draw pass that runs
  right after `ctx.clearRect`, *behind* the nebula and everything else, so the
  interactive galaxy stays the foreground.
- `lib/shootingStars.ts` (new) holds the **pure** logic. Given the frame clock,
  canvas size, intensity, a stable seed, and the theme hues, `computeShootingStars()`
  returns the list of meteors alive at that instant. It holds **no mutable
  animation state** — the render loop simply asks "which meteors are alive now?"
- The effect is **deterministic**: a tiny seeded PRNG (`mulberry32`) builds a
  fixed spawn timeline, and each frame we enumerate which of those spawned
  meteors are still within their short lifetime. Because the timeline is stable,
  meteors flow smoothly across the sky instead of flickering in and out.
- Each meteor spawns just above the top edge, travels down and to one side at a
  random speed, and lives 0.5–1.1 s. Its visual streak length follows
  `speed × life`, and its colour is drawn from the galaxy's active theme hues.

### The spawn model

- The first spawn is placed slightly before `t = 0` (so the shower is already
  underway on load).
- Each subsequent gap is `baseInterval × (0.4..1.0)`, where
  `baseInterval = 2.2s / intensity` — so higher intensity means tighter spacing.
- A per-meteor `mulberry32` draw sets its lifetime, travel angle (~26°–55°
  below the horizontal), speed (460–800 px/s), and spawn offset.
- At most `SHOOTING_MAX_ALIVE` (4) meteors are drawn at once, so an intense
  shower never turns the sky into a wall of streaks.

### Constants (`lib/shootingStars.ts`)

| Constant | Value | Meaning |
|-------|:-----:|------|
| `SHOOTING_BASE_INTERVAL` | `2.2` | Mean spacing (s) between meteors at intensity 1 |
| `SHOOTING_MIN_LIFE` / `MAX_LIFE` | `0.5` / `1.1` | Lifetime range (s) |
| `SHOOTING_MAX_ALIVE` | `4` | Cap on simultaneously visible meteors |
| `SHOOTING_SPEED_MIN` / `MAX` | `460` / `800` | Head speed range (px/s) |
| `SHOOTING_LEN_FACTOR` | `0.55` | Streak length = `speed × life × factor` |

## Key files / components

- `lib/shootingStars.ts` (new) — `ShootingStar`, `computeShootingStars()`,
  `shootingStarSpawns()`, `mulberry32()`, constants.
- `lib/shootingStars.test.ts` (new) — 8 unit tests for the pure logic.
- `components/StarField.tsx` — new `shooting` prop + the draw pass behind the stars.
- `app/page.tsx` — the **Shooting Stars: On/Off** toggle in the hero control row.

## User-facing behavior

- Click **Shooting Stars: Off → On** (the right toggle in the bottom control row,
  next to Constellations) — meteors begin to cross the deep sky.
- Pick a different theme — the meteor heads re-colour to match: violet for the
  Violet Spiral, green/teal for Aurora, warm orange for Ember, etc.
- The meteors never draw over the stars, the hero text, or the control dock.
- Works independently of Gravity Well, Constellation, Warp Drive, and Nebula Drift.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Shooting Stars: On** — meteors streak across the deep sky.
4. Switch theme — the meteor heads re-colour to match.
5. Toggle Off — the sky goes calm again; the stars remain.

Direct link with the Ember theme:
`?theme=ember&arms=5&rpm=9&stars=400` (then toggle Shooting Stars On).

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 8/8 unit tests pass (`lib/shootingStars.test.ts`):
  determinism, intensity-scaled spawn count, stable pattern for a fixed seed,
  on-screen bounds for live meteors, theme-hue derivation, monotonic alive
  count, and the zero-intensity no-op case.

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (same as Constellation Mode and
  Nebula Drift).
- Intensity is a fixed internal constant (`1.4`); a "Shower strength" knob could
  let visitors dial it.
- Meteors always travel down-and-to-the-right; a future pass could vary the
  quadrant so showers feel less uniform.
- No click interaction (a click could "make a wish" and fire a burst); this was
  left out to keep the feature a calm backdrop rather than another interactive layer.
