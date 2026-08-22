# Comet Trail — a Cursor-Following Comet

- **Date added:** 2026-08-22
- **Version:** 0.9.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

A real night sky has wanderers: comets streak across it, leaving a glowing tail
that seems to lean away from where you just pointed. Comet Trail brings that to
the hero — a small comet with a bright core and a tapering, fading tail that
**trails your cursor** as it moves. Its length grows with how fast you sweep the
pointer (a slow drift is a short comet; a swipe is a long streak) and its hue is
drawn from the galaxy's active theme, so it always stays in sync with the colour
you've chosen.

It is a direct response to the 2026 anti-homogenization trend: a little named,
pointer-reactive motion marks a site that was designed, not generated. It is
purely additive, **off by default**, and orthogonal to every other layer, so
the default galaxy looks exactly as before. It is distinct from **Shooting
Stars** — those are sky meteors on a fixed timeline; the Comet Trail lives and
dies with your pointer.

## How it works (high-level)

- `lib/comet.ts` (new) holds the **pure** logic, given as unit tests:
  - `mulberry32` — a tiny deterministic PRNG kept for seeded follow-ups;
  - `cursorSpeed` — the px/s implied by recent pointer samples;
  - `polylineLength` / `resampleTail` — evenly resampling the pointer path into
    a fixed number of tail points (the first is the comet tip at the oldest
    sample, the head left to the caller); and
  - `tailLengthFromSpeed` — mapping cursor speed onto a capped tail length.
- `components/StarField.tsx` owns the live layer. It keeps a bounded ring buffer
  of recent pointer samples and, each frame, prunes samples older than 500 ms,
  eases a "head" point toward the cursor, resamples the pointer path, and scales
  that path so its length follows `tailLengthFromSpeed`. It then paints a soft
  outer halo, a tapered gradient tail (thin/faint at the tip, thick/bright at
  the head), and a bright hot core — all coloured from the active theme hues.
- The comet is drawn **after** the galaxy-zoom transform, so it stays pinned to
  the on-screen cursor regardless of any zoom. It is pure atmosphere and never
  touches the gravity-well physics, warp streaks, nebula, constellations,
  meteors, depth or variable stars.
- `app/page.tsx` gained a **Comet: On/Off** chip in the dock.

## Key files / components

- `lib/comet.ts` (new) and `lib/comet.test.ts` (new, 16 tests).
- `components/StarField.tsx` — new `cometMode` prop, pointer-sample ring buffer,
  eased comet head, and the tapered-tail draw pass.
- `app/page.tsx` — the **Comet** toggle chip.

## User-facing behavior

- Click **Comet: On** (rightmost chip in the dock), then move the cursor over
  the hero — a glowing comet follows your pointer, its tail stretching as you
  move faster and shrinking to a short glow when you go still.
- Switch theme — the comet's tail and halo re-colour to match.
- Move the cursor off the hero — the comet's tail ages out and fades.
- Works alongside every other toggle and the galaxy presets.

## How to test / try it

1. `npm install` → `npm run build` → `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Comet: On** and move the cursor — a comet trails the pointer.
4. Move slowly, then swipe fast — the tail grows with speed.
5. Switch theme — the comet re-colours.
6. Toggle Off — the sky goes calm again.
7. `npm test` — 16 new tests cover the PRNG, speed, polyline length,
   resampling, and tail-length mapping.

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (a follow-up could add a
  `?comet=` param like `?z=`).
- The tail is tapered single-pass segments, not a bloom halo (a possible
  follow-up: a second blurred pass for a softer glow).
- Tail length follows recent pointer movement, so a fast stop leaves a tail that
  ages out over ~0.5 s rather than instantly vanishing (intentional, gives the
  comet momentum).
