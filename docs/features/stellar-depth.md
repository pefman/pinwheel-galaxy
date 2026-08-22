# Stellar Depth — a 3D Parallax Layer for the Starfield

- **Date added:** 2026-08-22
- **Version:** 0.7.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

The hero starfield had always read as a flat, rotating disc: every star sat on
the same plane and moved together. **Stellar Depth** gives the field a third
dimension — a subtle **3D parallax + twinkle layer** — so the galaxy reads as a
volume of stars at different distances rather than a flat spiral.

When enabled, moving the cursor shifts the *near* stars more than the *far*
ones (true parallax), the stars gently twinkle with nearer stars twinkling
harder, and far stars are dimmed and softened like atmospheric perspective. It is
**off by default**, purely additive, and orthogonal to every existing feature
(gravity, spin, warp, constellations, nebula, meteors, zoom), so the default
galaxy looks exactly as it did before.

It answers the 2026 trend toward immersive, explorable hero spaces — here the
starfield gains real depth without any 3D engine, just per-star draw-time
maths.

It is **purely additive and non-breaking**:

- It adds a new `depthMode` layer that only touches the star *draw* pass — it
  never touches the spring/gravity physics, so the gravity well behaves
  identically.
- It is **off by default**, so the default galaxy is visually unchanged.
- When off, the component runs exactly as before (no parallax, no twinkle, no
  per-star scaling).

## How it works (high-level)

- `lib/starDepth.ts` (new) holds the **pure** logic, given as unit tests:
  - `depthForIndex` assigns every star a stable "distance" in `[0.15, 1]`. The
    map is derived from a trigonometric pseudo-random (seeded by `DEPTH_SEED`)
    so it never re-randomises between mounts — the galaxy keeps its 3D shape
    instead of shimmering.
  - `twinklePhase` gives each star a staggered twinkle phase so they do not blink
    in unison.
- `components/StarField.tsx` owns the live layer. It builds the `depths` and
  `phases` arrays in `resize()` (so they track the star count but stay fixed
  between frames), eases a cursor-parallax vector toward the mouse each frame,
  and applies a draw-time offset `parallax × depth` to every star. The star draw
  pass also applies `twinkleAlpha` (per-star alpha modulation) and `depthScale`
  (atmospheric-perspective size/alpha scaling).
- `app/page.tsx` gained a **Depth: On/Off** toggle in the hero control row.

### Parallax, not a trick

The parallax offset is added to each star's drawn position *after* the spring
physics, so it is fully orthogonal to the gravity well: gravity still pulls the
stars, and the parallax merely shifts where each star is painted. Near stars
(move more) and far stars (move less) then separate, giving the eye the depth
cue of looking past layers.

### Constants (`lib/starDepth.ts`)

| Constant | Value | Meaning |
|-------|:-----:|------|
| `DEPTH_MIN` / `DEPTH_MAX` | `0.15` / `1` | Inclusive depth range (far → near) |
| `DEPTH_SEED` | `7` | Seed for the deterministic depth map |
| `TWINKLE_SPEED` | `1.6` | Rad/s base twinkle oscillation |
| `PARALLAX_RANGE` | `26` | px a depth-1 star shifts at the field edge (documented) |

## Key files / components

- `lib/starDepth.ts` (new) — `depthForIndex`, `parallaxFor`, `twinkleAlpha`,
  `depthScale`, `twinklePhase`.
- `lib/starDepth.test.ts` (new) — 9 unit tests for the pure logic.
- `components/StarField.tsx` — new `depthMode` prop, depth-map build in `resize`,
  eased parallax vector, and the twinkle + atmospheric-perspective draw pass.
- `app/page.tsx` — the **Depth: On/Off** toggle in the hero control row.

## User-facing behavior

- Click **Depth: On** (new toggle at the right end of the bottom control row),
  then move the cursor — the stars separate into depth layers and the galaxy
  gains a 3D feel. The stars also gently twinkle.
- Move the cursor away and the parallax settles back to centre.
- Works alongside every other toggle (gravity, warp, constellations, nebula,
  shooting stars, zoom) — it only affects the star layer.
- Off by default; the default galaxy is unchanged.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Depth: On** and move the cursor side to side — the near stars shift
   more than the far ones (parallax), and the stars twinkle.
4. Toggle it off again — the field returns to a flat disc.
5. Turn on Constellation Mode with Depth on — the link web bends with the 3D
   layering.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 33/33 unit tests pass, including 9 in `lib/starDepth.test.ts`:
  depth stays in range and is deterministic/spread, parallax scales with depth
  and direction, twinkle stays bounded and oscillates harder for nearer stars,
  twinkle phases stagger, and depth scale maps depth into a sensible multiplier.

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (same as Constellation Mode,
  Nebula Drift, Shooting Stars, and Zoom) — only the galaxy config is shareable.
  A natural follow-up is persisting the depth toggle via a `?depth=` param.
- Depth is a simulated parallax (single offset axis from the cursor); a more
  elaborate follow-up would add multiple depth layers with independent parallax
  for a stronger sense of scale.
- The depth map is deterministic per seed; bumping `DEPTH_SEED` reshuffles the
  whole field (intentional, stable across reloads).
