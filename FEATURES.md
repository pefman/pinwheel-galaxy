# Features

Living catalog of everything shipped to **Pinwheel Galaxy**. Each entry is
additive and dated. New features are added here every evolution cycle.

---

## Galaxy Zoom — Dolly Into the Starfield

- **Date added:** 2026-08-22
- **Version:** 0.6.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Until now the hero starfield was fixed: you could spin and poke the galaxy, but
never get closer to it. Galaxy Zoom lets a visitor **scroll into the galaxy** —
a wheel / trackpad two-finger scroll (or a two-finger pinch on touch) eases the
camera in and out, and a double-click snaps back. This adds a whole new axis of
interaction on top of the gravity well and spin knobs: you can now zoom up and
poke individual stars. It is a small, delightful, purely additive touch and it
is **off by default**, so the default galaxy looks unchanged.

### How it works (high-level)

- `lib/zoom.ts` (new) holds the **pure** logic given as unit tests: clamping to
  the 0.6×–2.5× range, easing the visible zoom toward an animated target each
  frame, turning a wheel delta into a multiplier, the `1 / zoom` screen-size
  scale that keeps stars crisp, and the `?z=` URL binding.
- `components/StarField.tsx` owns the live zoom state. When `zoomEnabled` it
  listens to `wheel` and two-finger `touch` gestures to set a `targetZoom`, and
  eases the visible `zoom` toward it. Every frame it renders the galaxy — the
  constellation web, the warp streaks and the stars — inside a `ctx`
  transform scaled by `zoom` around the galaxy centre, while drawing that
  geometry at `1 / zoom` so it holds a constant on-screen size (a dolly, not a
  blow-up). Nebula, meteors and click pulses are drawn outside the box at screen
  scale, so the atmosphere reads as a fixed backdrop the galaxy moves through.
- `lib/useGalaxyParams.ts` now carries `?z=` alongside theme / arms / rpm /
  stars and gravity, so a zoomed galaxy is deep-linkable and survives
  Back/Forward navigation.

### Key files / components

- `lib/zoom.ts`, `lib/zoom.test.ts` (new)
- `components/StarField.tsx` — new `zoomEnabled` prop + `onZoom` callback, zoom
  gesture handlers, and the `zoom`-scaled galaxy draw transform.
- `lib/useGalaxyParams.ts` — `?z=` param read/write.
- `app/page.tsx` — the **Zoom: On/Off** toggle in the hero control row.

### User-facing behavior

- Click **Zoom: On** (rightmost toggle in the bottom control row), then scroll
  with the wheel / trackpad — the galaxy eases in and out. Pinch on touch.
- Double-click (or double-tap) resets to the default 1× view.
- The current zoom level is written into the URL (`?z=1.30`), so a zoomed
  galaxy is shareable and restores on reload / Back+Forward.
- When Zoom is Off, the wheel scrolls the page as normal.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Zoom: On** and scroll with the wheel — the galaxy dollys in.
4. Double-click — it snaps back to 1×.
5. Watch the URL gain a `?z=` param; reload to confirm it restores.
6. Toggle Off — the wheel scrolls the page again.

### Limitations / follow-ups

- Zoom is a global dolly around the galaxy centre; there is no per-axis pan
  yet — a natural follow-up is drag-to-pan once zoomed in.
- The `?z=` param is clamped to two decimals; sub-centimetre precision is lost
  in the URL (intentional, keeps links tidy).

---

## Shooting Stars — Meteors Across the Deep Sky

- **Date added:** 2026-08-22
- **Version:** 0.5.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Behind every galaxy there has been only black space. Shooting Stars lets
occasional **meteors streak across that deep sky** — a bright head fading into a
long, soft tail — so the hero feels like looking up at a living night rather
than a fixed backdrop. It is a small, delightful, purely additive touch and it
is **off by default**, so the default galaxy looks unchanged. It responds to the
2026 anti-homogenization trend: a little named, atmospheric motion that marks a
site that was designed, not generated.

### How it works (high-level)

- A new `shooting` prop on `StarField` gates an additive draw pass run right
  after `ctx.clearRect`, *behind* the nebula, pulses, constellation web, warp
  streaks and stars — so the interactive galaxy always stays the foreground.
- `lib/shootingStars.ts` (new) holds the **pure** logic: given the frame clock,
  canvas size, intensity, a stable seed and the theme hues, it returns the list
  of meteors alive at that instant. It never holds mutable animation state.
- The effect is **deterministic**: a seeded PRNG (`mulberry32`) builds a fixed
  spawn timeline, and each frame we simply ask "which meteors are alive now?"
  so meteors flow smoothly across the sky instead of flickering.
- Each meteor spawns just above the top edge, travels down and to one side at a
  random speed, and lives 0.5–1.1 s. Its streak length follows `speed × life`,
  and its colour is drawn from the galaxy's active theme hues.

### Key files / components

- `lib/shootingStars.ts`, `lib/shootingStars.test.ts` (new)
- `components/StarField.tsx` — new `shooting` prop + draw pass behind the stars.
- `app/page.tsx` — the **Shooting Stars: On/Off** toggle in the hero control row.

### User-facing behavior

- Click **Shooting Stars: Off → On** (right toggle in the bottom control row) —
  meteors begin to cross the sky.
- Pick a different theme — the meteor heads re-colour to match (violet, green
  aurora, warm ember, …).
- Works independently of Gravity Well, Constellation, Warp Drive, and Nebula
  Drift.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Shooting Stars: On** — meteors streak across the deep sky.
4. Switch theme — the meteor heads re-colour to match.
5. Toggle Off — the sky goes calm again; the stars remain.

See `docs/features/shooting-stars.md` for the full doc.

---

## Bug Report Link — Straight to the GitHub Tracker

- **Date added:** 2026-08-22
- **Version:** 0.4.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Visitors can now **report a bug in one click**. A "Report a bug" link in the
navigation bar and footer opens a pre-filled GitHub "new issue" page, so feedback
lands directly in the issue tracker where the autonomous bug-fixing autopilot
picks it up. This closes the loop between the live site and the agents that
maintain it.

### How it works (high-level)

- A module-level constant `BUG_REPORT_URL` in `app/page.tsx` builds the GitHub
  new-issue URL with `URLSearchParams`: a `[Bug]` title stub and a small body
  template (describe → reproduce → expected → environment).
- The link opens in a new tab. The reporter **suggests** a problem; they never
  write or dictate the fix — the autopilot owns the fix.

### Key files / components

- `app/page.tsx` — the `BUG_REPORT_URL` constant and the two link placements.
- `https://github.com/pefman/pinwheel-galaxy/issues/new` — the destination.

### User-facing behavior

- Click **Report a bug** in the top nav or the footer.
- A GitHub issue form opens with a `[Bug] …` title and a structured body.
- Submit to file the report; the bug-fixing autopilot triages it on its next run.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site and click **Report a bug** (nav bar and footer).
3. Confirm the GitHub new-issue page opens with the pre-filled title and body.

See `docs/features/bug-report-link.md` for the full doc.

---

## Nebula Drift — Living Depth Backdrop

- **Date added:** 2026-08-22
- **Version:** 0.4.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Behind every galaxy there is only black space. Nebula Drift fills that space
with a soft, slow-drifting **nebula** — a living depth backdrop that sits
*behind* the stars and gives the hero a real sense of three-dimensional space
instead of a flat field of points on black. It is a direct response to the 2026
anti-homogenization trend: distinctive, layered depth marks a site that was
designed, not generated. Purely additive and non-breaking — it paints a new draw
pass behind every existing layer and is **off by default**, so the default
galaxy looks unchanged.

### How it works (high-level)

- A new `nebula` prop on `StarField` gates an additive draw pass run right after
  `ctx.clearRect`, before the pulses and stars are painted.
- `lib/nebula.ts` (new) holds the **pure** geometry: given frame time, canvas
  size, galaxy centre, and a cursor parallax offset, it returns each drifting
  cloud's position, colour, and opacity.
- Three clouds at different **depths** create a parallax sense of 3D — closer
  layers follow the cursor more than farther ones. Each slowly orbits the centre
  and gently breathes (per-layer phase offset so they don't pulse in lock-step).
- Colours derive from the galaxy's **active theme hue**, so the nebula always
  stays in sync with the selected theme.

### Key files / components

- `lib/nebula.ts`, `lib/nebula.test.ts` (new)
- `components/StarField.tsx` — new `nebula` prop + draw pass behind the stars.
- `app/page.tsx` — the **Nebula: On/Off** toggle in the hero control row.

### User-facing behavior

- Click **Nebula: Off → On** (left toggle in the bottom control row) — a soft
  glow fades in behind the stars.
- Move the cursor — the clouds drift with parallax depth (near layers follow,
  far layers lag).
- Pick a different theme — the nebula re-colours to match (violet, green-aurora,
  warm-ember, …).
- Works independently of Gravity Well, Constellation, and Warp Drive.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Nebula: On** — a soft depth backdrop appears behind the stars.
4. Move the cursor — the clouds shift with parallax depth.
5. Switch theme or open a deep link — the nebula re-colours to match.
6. Toggle Off — the backdrop fades out; the stars remain.

Direct link with Aurora: `?theme=aurora&arms=5&rpm=9&stars=400` (then toggle
Nebula On). See `docs/features/nebula-drift.md` for the full doc.

---

## Galaxy Presets — Shareable, Deep-Linkable Galaxy Configs

- **Date added:** 2026-08-22
- **Version:** 0.2.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Visitors can tune the live gravity-well galaxy — colour theme, spiral arms,
rotation speed, and star count — and **share the exact result via the URL**. A
Shuffle button generates a random galaxy in one click. This is a small but
memorable, shareable way to make the galaxy feel personal, and it is fully
additive: the original gravity well is untouched.

### How it works (high-level)

- Config is expressible as URL params: `?theme=&arms=&rpm=&stars=`.
- `lib/useGalaxyParams.ts` binds config to the URL (shareable deep links, Back/Forward sync).
- `lib/galaxyPresets.ts` holds the config model, theme palettes, validation, and a shuffle generator.
- `components/GalaxyDock.tsx` is the glass dock (swatches, steppers, gravity toggle, Shuffle).
- `StarField` gained an additive `config` prop; defaults are unchanged when no params are present.

### Key files

- `lib/galaxyPresets.ts`, `lib/useGalaxyParams.ts` (new)
- `components/GalaxyDock.tsx` (new)
- `components/StarField.tsx`, `app/page.tsx`, `app/layout.tsx`

### User-facing behavior

- Click theme swatches to re-skin the galaxy; stepper the arms/spin/stars to reshape it.
- 🎲 Shuffle randomises everything and rewrites the URL so it is instantly shareable.
- The address bar always reflects the current galaxy; copy and share it.
- Browser Back/Forward re-renders the galaxy from the URL.
- Visiting without params shows the original 3-arm violet spiral.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the glass **Galaxy controls** dock below the hero.
3. Tune theme / arms / spin / stars; hit **Shuffle**.
4. Copy the URL, open it elsewhere — the same galaxy loads.
5. Try a direct link: `/?theme=aurora&arms=5&rpm=9&stars=400`.

See `docs/features/galaxy-presets.md` for the full doc.

## Constellation Mode — Living Star Links

- **Date added:** 2026-08-22
- **Status:** Shipped (0.2.0 — built, locally verified, deployed to Vercel production)

### What + why
An optional toggle that draws faint connecting lines between nearby stars,
turning the starfield into a **living constellation web**. Links form between any
two stars closer than a threshold and brighten where the stars are moving
fastest, so the web ripples in response to the gravity well and to click
shockwaves.

It exists to give the isolated points structure and narrative — evoking the
"Galaxy" in the product name — as a small, self-contained, purely additive layer
on the existing gravity-well renderer.

### How it works (high-level)
- Implemented as an extra draw pass in `components/StarField.tsx` before stars
  are painted.
- For each star pair inside `CONSTELLATION_MAX_DIST` (96 px), a `proximity`
  term sets line alpha/width and a `motion` term (from the stars' speed)
  brightens links where the well or a pulse is dragging stars.
- A squared-distance cull skips far pairs; the pass is `O(n²)` over the
  320 stars — trivial for the canvas and only runs when the mode is on.

### Key files / components
- `components/StarField.tsx` — new `constellation` prop + link draw pass.
- `app/page.tsx` — the **Constellations: On/Off** toggle in the hero control bar.

### User-facing behavior
- Toggle "Constellations: On/Off" (next to the gravity-well toggle) to enable
  the linking web.
- Nearby stars connect with faint cyan lines forming shifting patterns.
- Move the cursor: links near the well stretch and brighten.
- Click: a ring of links flashes as the shockwave passes.
- Works independently of the gravity-well toggle.

### How to test / try it
1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle "Constellations: On" — lines appear between nearby stars.
4. Move the cursor — nearby links stretch and brighten.
5. Click — a ring of links flashes.
6. Toggle Off — the web disappears, stars remain.

### Known limitations / follow-ups
- `O(n²)` linking; a spatial grid would help if `STAR_COUNT` grows large.
- Straight segments, not curved nebula ribbons (possible follow-up: glow bloom).
- Toggle state not persisted across reloads.

---

## Warp Drive — Hyperspace Motion Streaks

- **Date added:** 2026-08-22
- **Version:** 0.3.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Crank the galaxy's spin fast enough and the stars begin to stretch into
hyperspace motion streaks — the classic "warp speed" look. This gives the
**Spin** knob a real, visible payoff: the `rpm` slider used to only change how
fast the galaxy rotated, with little visual drama. Warp Drive turns that dial
into a throttle — slow spins stay calm and star-like, and as the rotation speeds
up the whole galaxy elongates into streaks of light.

It is purely additive and emergent: there is no toggle. The streaks are a
function of how fast the galaxy is already spinning, so they always stay in sync
with the galaxy the visitor is controlling. They also ripple with the gravity
well and to click shockwaves, because a streak's length follows each star's
instantaneous speed, not just the global spin.

### How it works (high-level)

- Implemented as an extra draw pass in `components/StarField.tsx`, painted just
  before the stars themselves.
- `warpFactor` is derived from the current `rpm`: `0` at or below
  `WARP_RPM_THRESHOLD` (10 rpm), rising linearly to `1` at the max rpm (20).
- For every star moving faster than a small floor, a linear-gradient line is
  drawn along the star's velocity direction and faded to transparent at both
  ends, so each star becomes a soft streak.
- Streak length = `min(70, speed * 0.45 + warpFactor * 26)`; alpha grows with
  both the star's speed and `warpFactor`. Each streak uses the star's own `hue`
  so it matches the active theme.

### Key files / components

- `components/StarField.tsx` — the Warp Drive draw pass, `warpFactor`, and the
  `WARP_RPM_THRESHOLD` / `WARP_RPM_RANGE` constants.

### User-facing behavior

- At the default spin (6 rpm) nothing changes — the galaxy looks unchanged.
- Push the **Spin** stepper past ~10 and faint streaks appear behind the fastest
  stars.
- Push it to 20 and the galaxy blurs into a tight hyperspace swirl; move the
  cursor or click and the streaks stretch and brighten where the well or
  shockwave drags the stars.
- Works with every theme and independently of Constellation Mode and the Gravity
  Well toggle.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site and the glass **Galaxy controls** dock.
3. Bump **Spin** past 10 — streaks fade in behind the stars.
4. Bump it to 20 — the galaxy becomes a warp swirl.
5. Move the cursor / click — streaks near the well and shockwave brighten.
6. Return Spin to 6 — the streaks vanish and the calm galaxy returns.

Try a direct link with a fast spin: `?theme=ember&arms=5&rpm=18&stars=400`.

### Known limitations / follow-ups

- The threshold is fixed at 10 rpm; a softer ramp would feel more gradual.
- Streaks are single segments, not a glowing bloom (possible follow-up: a
  second additive-blurred pass for a softer warp halo).
- Streak length is capped at 70 px so it never overwhelms the star field.

---

## Gravity Well — Interactive Starfield

- **Date added:** 2026-08-22
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

> The earlier "production deploy blocked" note is resolved: the Vercel token was
> refreshed with project-create rights and the site is now live (see CHANGELOG
> 0.2.0 and the Galaxy Presets entry above).

### What + why
A full-screen canvas background in which stars are arranged into a slowly
rotating spiral (pinwheel) galaxy — matching the product's identity. Moving the
cursor creates a **gravitational well** that pulls nearby stars toward it, and
clicking fires a radial **pulse** that flings stars outward. Stars spring back to
their orbital rest position when left alone, so the galaxy always settles back
into its spiral shape.

It exists to make the landing page feel alive and to demonstrate the
"ever-evolving, delightful" direction of the product, while being fully
additive and non-breaking.

### How it works (high-level)
- Stars are seeded on spiral arms with a per-star orbit radius and angle.
- Each frame the whole galaxy spins at a calm ~6 RPM.
- Every star springs toward its computed orbital position (Hooke's-law spring +
  damping), so perturbations decay back to the spiral.
- A cursor within `ATTRACT_RADIUS` applies an attractive force to nearby stars.
- A click records a `Pulse` that expands at `PULSE_SPEED`; stars the ring
  crosses receive a radial velocity kick.
- Star brightness grows with speed, so fast-moving stars glow — a cheap "warp"
  read.
- Everything runs on a single `requestAnimationFrame` loop; the device pixel
  ratio is capped at 2 and the canvas resizes on viewport change.

### Key files / components
- `components/StarField.tsx` — the entire feature (canvas + physics + controls).
- `app/page.tsx` — hero section and the **Gravity Well: On/Off** toggle.
- `app/globals.css` — cosmic theme, glass surfaces, gradient text.
- `tailwind.config.ts` — theme colors + `fade-up` / `animation-delay` utilities.

### User-facing behavior
- Move the cursor over the hero: stars lean into the gravity well.
- Click / tap: a shockwave ring expands and flings stars outward.
- Stop moving: the galaxy gently settles back into its spiral.
- Toggle "Gravity Well: On/Off" in the bottom control to freeze interactivity
  (the galaxy still spins).
- On devices with `prefers-reduced-motion: reduce`, gravitational
  interactivity is disabled automatically — stars only drift with the spin.

### How to test / try it
1. `npm install` then `npm run build` and `npm start` (or `npm run dev`).
2. Open the site and scroll to the hero.
3. Move the cursor across the starfield — watch stars follow the cursor.
4. Click once — watch the pulse fling the stars.
5. Toggle "Gravity Well" Off — interactivity stops, the spin continues.
6. Toggle your OS accessibility setting to `prefers-reduced-motion` and reload —
   the well should no longer pull stars.

### Known limitations / follow-ups
- The canvas covers only the hero section (full viewport height); the feature
  section below it has a plain background.
- No persistence of the On/Off toggle yet — it resets to On on reload.
- Star count (`STAR_COUNT = 320`) is fixed; could scale with viewport size.
- **Production deploy is blocked:** the supplied `VERCEL_API` token can read
  projects but cannot create projects or list teams (read-only role). The build
  is complete and verified locally; deploy as soon as a token with Vercel
  project-create rights is available.
