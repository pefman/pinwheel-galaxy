# Warp Drive — Hyperspace Motion Streaks

- **Date added:** 2026-08-22
- **Version:** 0.3.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

Crank the galaxy's spin fast enough and the stars begin to stretch into
hyperspace motion streaks — the classic "warp speed" look. This exists to give
the **Spin** knob a real, visible payoff: for a long time the `rpm` slider only
changed how fast the galaxy rotated, with little visual drama. Warp Drive turns
that dial into a throttle — slow spins stay calm and star-like, and as you push
the rotation faster the whole galaxy elongates into streaks of light.

It is purely additive and emergent: there is no toggle. The streaks are a
function of how fast the galaxy is already spinning, so they are always in
sync with the galaxy the visitor is controlling. They also ripple with the
gravity well and to click shockwaves, because a streak's length is driven by
each star's instantaneous speed — not just the global spin.

## How it works (high-level)

- Implemented as an extra draw pass in `components/StarField.tsx`, painted just
  before the stars themselves.
- `warpFactor` is derived from the current `rpm`: it is `0` at or below
  `WARP_RPM_THRESHOLD` (10 rpm) and rises linearly to `1` at the max rpm (20).
- For every star moving faster than a small speed floor, a linear-gradient line
  is drawn along the star's velocity direction. The line fades to transparent at
  both ends and is brightest in the middle, so each star becomes a soft streak.
- Streak length = `min(70, speed * 0.45 + warpFactor * 26)` and alpha grows with
  both the star's speed and `warpFactor`, so fast stars and a fast-spinning
  galaxy both produce longer, brighter streaks.
- The streak uses each star's own `hue`, so it matches the active theme.

## Key files / components

- `components/StarField.tsx` — the Warp Drive draw pass, `warpFactor`, and the
  `WARP_RPM_THRESHOLD` / `WARP_RPM_RANGE` constants.

## User-facing behavior

- With the default spin (6 rpm) nothing changes — the galaxy looks exactly as
  before.
- Push the **Spin** stepper past ~10 and faint streaks appear behind the fastest
  stars.
- Push it all the way to 20 and the galaxy blurs into a tight hyperspace swirl;
  move the cursor or click and the streaks stretch and brighten where the well
  or shockwave drags the stars.
- Works with every theme and independently of Constellation Mode and the
  Gravity Well toggle.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, open the glass **Galaxy controls** dock.
3. Bump **Spin** past 10 — streaks fade in behind the stars.
4. Bump it to 20 — the galaxy becomes a warp swirl.
5. Move the cursor / click — streaks near the well and the shockwave brighten.
6. Return Spin to 6 — the streaks vanish and the calm galaxy returns.

Try a direct link with a fast spin:
`?theme=ember&arms=5&rpm=18&stars=400`.

## Known limitations / follow-ups

- The threshold is fixed at 10 rpm; a softer ramp would feel more gradual.
- Streaks are single segments, not a glowing bloom (possible follow-up: a second
  additive-blurred pass for a softer warp halo).
- Streak length is capped at 70 px so it never overwhelms the star field.
