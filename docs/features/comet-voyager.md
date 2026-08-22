# Comet Voyager — A Lone Comet Arcing Across the Galaxy

- **Date added:** 2026-08-22
- **Version:** 0.4.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

A lone comet periodically arcs across the galaxy, leaving a tapering ribbon of
light with a glowing head. It exists to give the starfield something to *happen*
even when a visitor is just watching — a recurring, unscripted moment of motion
that makes the galaxy feel like a living sky rather than a static spiral.

It is purely additive and emergent: there is no toggle and no UI control. A new
comet launches from a random edge of the screen on a timer (roughly every 9–20 s,
the first one appearing a few seconds after load), so the default look is
completely unchanged — you just occasionally watch one drift by.

## How it works (high-level)

- Implemented as an additive draw pass in `components/StarField.tsx`, painted
  **over** the stars so the comet reads as a foreground visitor crossing the
  galaxy.
- A `cometTimer` accumulates frame time; once it passes a random `cometGap`
  (9–20 s, the first gap seeded to ~4–10 s) a comet is launched from a random
  viewport edge, aimed roughly across the sky at a random speed.
- Each frame the comet advances and pushes its position onto a short trail array
  (capped at `COMET_TRAIL_LEN` = 28 points). The tail is drawn as a series of
  segments that fade and thin toward the tail end; a radial-gradient glow is
  painted for the head.
- The comet's path **bends in the gravity well** using the same attraction
  formula as the stars, so a comet that drifts near the cursor gets a
  gravitational slingshot and curves. Under `prefers-reduced-motion` the well is
  inactive, so the comet still travels (in a straight line) but does not bend.
- Each comet's hue is chosen from the active theme's palette, so it matches the
  current galaxy.

## Key files / components

- `components/StarField.tsx` — the `Comet` / `TrailPoint` types, the comet launch
  timer (`cometTimer` / `cometGap`), the per-comet physics + trail update, the
  comet draw pass, the `COMET_TRAIL_LEN` / `COMET_MIN_GAP` / `COMET_MAX_GAP`
  constants, and the **C** key-to-launch shortcut.

## User-facing behavior

- Every so often a comet streaks across the hero from a random direction.
- Its head glows and its tail fades to nothing; its colour matches the active
  theme.
- Move the cursor into its path: the comet curves around the gravity well.
- Press **C** to launch one immediately (handy for a quick look or a demo).
- Works with every theme, preset, and the other features (Constellation Mode,
  Warp Drive) — comets float above all of them.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site and look at the hero. Within a few seconds a comet may already
   appear; otherwise it shows up every ~9–20 s.
3. Press **C** to force one and watch the glowing head and tapering tail.
4. Move the cursor into the comet's path and watch it bend around the well.
5. Switch theme (e.g. to **Ember**) — the next comet is warm-toned to match.

Try forcing one with a themed, spinning galaxy open:
`?theme=ember&arms=5&rpm=12&stars=360`.

## Known limitations / follow-ups

- One comet at a time; a future follow-up could allow a short burst or a
  per-comet size spread.
- Launch timing is fully random — a softer, more rhythmic cadence could feel more
  deliberate.
- The **C** shortcut is the only way to launch on demand; a small on-screen
  affordance is a possible follow-up if a visible control is desired.
