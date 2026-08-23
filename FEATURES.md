# Features

Living catalog of everything shipped to **Pinwheel Galaxy**. Each entry is
additive and dated. New features are added here every evolution cycle.

---

## Black Hole — a Placeable Gravitational Singularity

- **Date added:** 2026-08-23
- **Version:** 0.18.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Every sky layer is either a field of stars or a soft atmospheric glow — and a
single, extreme body. The **Black Hole** adds that body: a placeable singular
gravity well with a pure-black event horizon, a photon ring and a swirling
accretion disk of infalling matter. It complements the interactive spiral
galaxy the way the moon, aurora and distant galaxy do — a recognisable, dramatic
focal point — but with a new interaction: you can **drag it anywhere** by its
glow. The disk's Doppler shift (approaching side brighter/bluer, receding side
dimmer/redder) gives it the look of a real black hole, and its opaque horizon
hides the stars behind it.

### How it works (high-level)

- `lib/blackHole.ts` (new) holds the **pure** logic, unit-tested
  (`lib/blackHole.test.ts`, 13 tests). A deterministic `mulberry32` PRNG drives
  `computeBlackHole`, which picks a seeded, off-centre, edge-padded placement
  and precomputes a field of Keplerian accretion particles (inner particles
  orbit faster by `r^-1.5`, brightness falls off toward the edge). `accretionPoint`
  projects a particle onto the tilted, spinning disk; `dopplerFactor` /
  `dopplerHue` give the blueshift/redshift; `deflectionMagnification` /
  `einsteinRadius` model the gravitational lensing; `isInsideEventHorizon` tests
  the horizon. Everything is plain numbers, so it is unit-tested without a canvas.
- `components/StarField.tsx` gained a `blackHoleMode` prop. It builds the hole
  once in `resize()` (so it keeps its shape across resizes) and advances a
  disk-spin clock on a running timer. A mouse/touch drag repositions it. At the
  end of each frame it paints the outer halo, photon ring, event horizon and the
  near half of the accretion disk — on top of the stars, so the horizon hides
  whatever sits behind it. Pure atmosphere; never touches the spring physics.
- `lib/recipe.ts` gained a shareable `?blackHole=` layer toggle and it is
  surfaced in `describeRecipe`.
- `app/page.tsx` wires `blackHoleMode={recipe.blackHole}` and adds a **Black
  Hole** chip to the Galaxy Dock.

### User-facing behavior

1. `npm install` then `npm run build` and `npm start` (or `npm run dev`).
2. Open the site. In the hero dock, click **Black Hole: Off** → **On**.
3. A black hole with a swirling, Doppler-brightened accretion disk appears in
   the upper sky. Drag it by its glow to move it anywhere.
4. Open `?blackHole=on` to pre-enable it; the URL re-hydrates the exact layer.
5. Turn on `prefers-reduced-motion` — the disk keeps spinning (a slow, gentle
   swirl); the hole is otherwise a striking static silhouette.

### Known limitations / follow-ups

- The accretion disk is drawn only as its near half (the far half is hidden
  behind the opaque event horizon); a future cycle could render the full
  wrapped disk with per-particle depth sorting.
- The event horizon hides stars but does not yet gravitationally bend their
  light (the `deflectionMagnification` model is exposed and tested but not
  yet applied as a real lensing distortion in the star field).

---

## Distant Galaxy — a Far-Away Spiral in the Deep Background

- **Date added:** 2026-08-23
- **Version:** 0.17.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Every other sky layer is either a field of stars, a soft continuous glow/motion
(nebula, aurora, meteors) or a single body/event (the moon, a supernova). A
**distant galaxy** is something different: a whole *other* galaxy, seen at a
tilted inclination in the deep background, made of a dense field of faint stars
wound into spiral arms around a warm central bulge. It reads as looking out
into deep space *past* the interactive galaxy you are making — distant scenery
rather than the thing you are making — so it sits behind everything and rotates
only a hair over a session. It is off by default, purely additive, and distinct
from the interactive foreground galaxy.

### How it works (high-level)

- `lib/distantGalaxy.ts` (new) holds the **pure** logic, unit-tested
  (`lib/distantGalaxy.test.ts`, 10 tests). `armPoint` walks a logarithmic
  spiral arm — the radius grows linearly with the normalised radius `u` while
  the angle winds by `turns` full rotations — and `buildDistantGalaxyField`
  fans stars along `arms` such arms (with perpendicular scatter for arm
  thickness) and clusters warm bulge stars near the core. `computeDistantGalaxy`
  picks a seeded placement (off-centre, kept clear of the interactive galaxy and
  padded from the edges), a small distant radius, an arm count (2–5), an
  inclination `tilt` and a base rotation, returning a ready-to-draw
  `DistantGalaxy` with its pre-computed star field.
- `components/StarField.tsx` gained an opt-in `distantMode` prop: the galaxy is
  built once in `resize()` (so it keeps its shape across resizes) and only its
  global rotation advances on a slow clock (one turn per ~260 s). Each frame it
  paints a warm central bulge glow plus the field of faint stars, rotated and
  Y-compressed (`cos(tilt)`) into an oblique view, at screen scale and outside
  the galaxy's zoom transform so it stays far away while you zoom.
- `lib/recipe.ts` gained a shareable `?distant=` layer toggle (off by default)
  and it is surfaced in `describeRecipe`.
- `app/page.tsx` wires `distantMode={recipe.distant}` and adds a **Distant
  Galaxy** chip to the Galaxy Dock's environment row.

### Key files / components

- `lib/distantGalaxy.ts` (new) and `lib/distantGalaxy.test.ts` (new, 10 tests).
- `components/StarField.tsx` — new `distantMode` prop, the built-once field, the
  slow rotation clock, the bulge glow and the rotated + tilted star field.
- `lib/recipe.ts` — the shareable `?distant=` layer toggle.
- `app/page.tsx` — the **Distant Galaxy** toggle chip.

### User-facing behavior

1. `npm install` then `npm run build` and `npm start` (or `npm run dev`).
2. Open the site. In the hero dock, click **Distant Galaxy: Off** → **On**.
3. A tilted spiral galaxy appears in the deep background (top-left region),
   slowly turning. Toggle it Off to return to a calm sky.
4. Open `?distant=on` to pre-enable it; the URL re-hydrates the exact galaxy.
5. Turn on `prefers-reduced-motion` — the galaxy is essentially static, so it
   degrades to a calm tilted spiral with no motion.

### Known limitations / follow-ups

- The field is a fixed star count (`ARM_SAMPLES` per arm + `BULGE_STARS`),
  so enabling it roughly doubles the per-frame star draw while on. Fine for a
  background layer; could scale with viewport or cap at large sizes.
- Placement is a single galaxy per session; a future cycle could seed a few
  fainter smudges (distant galaxies) across the sky.

---

## Supernova — a Star That Quietly Lives, Then Explodes

- **Date added:** 2026-08-22
- **Version:** 0.16.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Every other sky layer is either a field of stars or a soft, *continuous*
glow/motion — nebula drifting, aurora swaying, meteors streaking, the moon's steady
drift. Supernova is deliberately different: a single, rare, **discrete event**.
A background star lives quietly for a long intermission (40–70 s), then over
~17 s brightens to a brilliant blue-white flash — diffraction spikes, an
expanding shockwave shell — fades to a faint remnant, and goes quiet again. It
reads as a supernova happening *inside the distant spiral we are looking at*,
giving a calm sky an occasional moment of wonder rather than constant noise.

### How it works (high-level)

- `lib/supernova.ts` (new) holds the **pure** logic, unit-tested (`lib/supernova.test.ts`,
  11 tests). A deterministic explosion schedule is built from a mulberry32 PRNG:
  `intermissionFor(index, seed)` returns the gap between explosions (clamped to
  a 40–70 s floor/ceiling and gently seed-varied), and `explosionStartAt(index,
  seed)` is the cumulative wall-clock start of each explosion. `computeSupernova`
  walks the schedule from a monotonic `time` (ms) and returns the active
  `SupernovaState` — `{ phase, x, y, intensity, shellRadius, shellAlpha,
  remnantAlpha, spikeLength }` — advancing rise → peak → fade → remnant → quiet.
  The star is placed once, deterministically, off-centre (never overlapping the
  interactive galaxy) and padded from the edges.
- The phase geometry is exposed so it is testable without a canvas: `intensity`
  ramps 0→1 over the 2.5 s rise, holds near 1 (with a subtle double-pulse) over
  the 1.5 s peak, then falls 1→0 over the 12 s fade while the shell expands and
  dims; a 3 s remnant leaves a faint lingering point.
- `components/StarField.tsx` gained an opt-in `supernovaMode` prop that advances
  a supernova clock each frame and paints, **behind the stars** (like the moon):
  a thin expanding shockwave ring with a soft glow, a four-way diffraction cross
  whose length tracks intensity, and a core glow/bloom whose size and brightness
  track the flash, plus the faint remnant. Pure atmosphere — never touches the
  stars, orthogonal to every other layer.
- `lib/recipe.ts` gained a shareable `?supernova=` layer toggle (off by default,
  so a calm galaxy keeps a tidy URL) and it is surfaced in `describeRecipe`.
- `app/page.tsx` wires `supernovaMode={recipe.supernova}` and adds a **Supernovae**
  chip to the Galaxy Dock's environment row.

### Key files / components

- `lib/supernova.ts` (new) and `lib/supernova.test.ts` (new, 11 tests).
- `components/StarField.tsx` — new `supernovaMode` prop, supernova clock, and the
  behind-the-stars flash/shell/spikes/core draw.
- `lib/recipe.ts` — the shareable `?supernova=` layer toggle.
- `app/page.tsx` — the **Supernovae** toggle chip.

### User-facing behavior

- Toggle **Supernovae: On** and wait — the sky looks calm, then, every so often,
  a distant star flares up in a bright flash with spikes and a growing ring, then
  fades to a faint point before going quiet again for another 40–70 s. It is a
  rare punctuation mark, not a constant effect. Every other toggle, knob and the
  gravity well keep working exactly as before.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Supernovae: On** and
  wait for a flash (or set a short intermission via the seed). Add `?supernova=on`
  to the URL to share.
2. Toggle it off — the sky goes back to the star-only field; nothing else
   changes.
3. `npm test` — 11 new tests cover determinism, schedule coverage, on-screen /
   off-centre placement, the rise→peak→fade→remnant ordering, the intensity
   curve, the shell's expand-and-fade behaviour, the intermission floor/ceiling,
   explosion spacing, seed sensitivity, and phase labels.

### Known limitations / follow-ups

- The schedule is one sparse event with a fixed blue-white colour. A follow-up
  could vary progenitor colour (M-type red vs O-type blue-white), add a second
  simultaneous supernova occasionally, or let the flash briefly light nearby
  nebula.
- Intermissions (40–70 s) are tuned for a "rare punctuation mark"; a visitor who
  wants to see it immediately can toggle it on and wait, or a future version
  could expose an event rate.


## Lunar Transit — a Drifting, Waxing/Waning Moon

- **Date added:** 2026-08-22
- **Version:** 0.15.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

The night sky in Pinwheel Galaxy has always been full of *movement* — comets,
meteors, drifting nebula, a swaying aurora — but it was missing a single,
recognisable **body**. A real night sky has a moon that drifts across it and
waxes and wanes through a full cycle, and that absence was the clearest gap in
the atmosphere. Lunar Transit adds a slow-drifting moon with a real terminator
(phase), faint craters, and a soft sun-lit glow. It is purely cosmetic,
additive, and **off by default**, so the default galaxy looks exactly as
before — and it is distinct from every other layer: it is one static-in-shape
body on its own clock, not a field of points or a sky-wide ribbon.

### How it works (high-level)

- `lib/moon.ts` (new) holds the **pure** logic, unit-tested (`lib/moon.test.ts`,
  10 tests):
  - `computeMoon({ time, width, height })` returns a fully specified
    `MoonState` — `{ x, y, radius, craters, litFraction, litSide, phaseLabel }`.
    The moon's position drifts linearly across the sky on a 4-minute (240 s)
    `TRANSIT_PERIOD`, so it rises from the left edge and sets on the right over
    the course of a session; craters are placed by a fixed `mulberry32` seed so
    the same moon always has the same face.
  - The **phase** comes from a `monthT` clock (`monthT = (time % MONTH) /
    MONTH`, a 4-minute cycle) via `litFraction = 0.5 + 0.5·cos(2π·monthT)`,
    which sweeps 0→1→0 (new → full → new). The lit side flips at each full moon
    (`litSide = monthT < 0.5 ? -1 : 1`), so waxing lights the right limb and
    waning lights the left — astronomically correct.
  - The terminator is a **true half-ellipse**, not a circle: its signed
    semi-minor axis is `terminatorXRadius(radius, litFraction) = radius·(1−2·
    litFraction)`. This is the exact relationship that makes the drawn lit area
    equal `litFraction` of the disk (verified numerically: area matches
    `litFraction·π·r²` to 4 decimals at every phase). `describeMoonPhase`
    maps the fraction to a human label (new → waxing crescent → first quarter →
    waxing gibbous → full → waning gibbous → last quarter → waning crescent).
- `components/StarField.tsx` gained an opt-in `moonMode` prop. A `moonTime`
  clock advances each frame, the moon's geometry is recomputed from that clock
  every frame (cheap arithmetic) so it drifts and wanes smoothly, and the draw
  pass paints, **behind the stars** (like nebula, meteors and the aurora):
  a soft outer glow halo, the full disk base (what the dark side shows faintly
  as earthshine), the seeded craters clipped to the disk, and the lit region —
  a semicircle on the lit limb closed by the terminator half-ellipse, mirrored
  on x for waxing vs waning. It touches the draw pass only, so it is fully
  orthogonal to gravity, warp, nebula, constellations, meteors, variable stars,
  Stellar Depth, zoom, the comet and the aurora.
- `lib/recipe.ts` gained a shareable `?moon=` layer toggle (off by default, so a
  calm galaxy keeps a tidy URL) and it is surfaced in `describeRecipe`.
- `app/page.tsx` wires `moonMode={recipe.moon}` and adds a **Moon** chip to the
  Galaxy Dock's environment row.

### Key files / components

- `lib/moon.ts` (new) and `lib/moon.test.ts` (new, 10 tests).
- `components/StarField.tsx` — new `moonMode` prop, moon clock, and the
  behind-the-stars moon draw (glow, disk, craters, lit region).
- `lib/recipe.ts` — the shareable `?moon=` layer toggle.
- `app/page.tsx` — the **Moon** toggle chip.

### User-facing behavior

- Toggle **Moon: On** and watch — a single moon rises from the left edge of the
  sky, drifts slowly across, and waxes and wanes through a full cycle: waxing
  crescent → first quarter → gibbous → full → gibbous → last quarter → waning
  crescent → new, lighting the right limb while waxing and the left while
  waning. It sits behind the galaxy and stars. Every other toggle, knob and the
  gravity well keep working exactly as before.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Moon: On** and watch
  the moon rise, drift and wane over a few minutes. Add `?moon=on` to the URL to
  share.
2. Toggle it off — the sky goes back to the star-only field; nothing else
  changes.
3. `npm test` — 10 new tests cover determinism, the new→full→new sweep, the
  lit-side flip, the terminator's half-ellipse extent, lit-area matching the
  fraction, label correctness, and the 240 s transit period.

### Known limitations / follow-ups

- The moon is one fixed face (one crater seed); a follow-up could rotate the
  face slowly or show two moons.
- The phase cycle is 4 minutes (matching the drift transit) rather than a real
  ~29.5-day month — intentional, so a visitor sees a full cycle in a single
  session.

## Aurora — a Northern-Lights Sky Layer

- **Date added:** 2026-08-22
- **Version:** 0.14.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

A real night sky holds more than stars: a faint, drifting atmospheric glow near
the horizon. Aurora borrows the look of the earth's northern lights and paints a
handful of soft, wavy ribbons across the upper sky of the galaxy. It gives the
sky a second, slower layer of motion — live “weather” that drifts and sways —
complementing the fast, cursor-driven starfield. It is purely cosmetic, additive
and **off by default**, so the default galaxy looks exactly as before.

### How it works (high-level)

- `lib/aurora.ts` (new) holds the **pure** logic: a deterministic `mulberry32`
  PRNG, `computeAuroraBands({ height, hues })` which returns a stable set of
  ribbon geometry `{ baseY, amplitude, wavelength, phase, hue, saturation,
  lightness, alpha }` (hues drawn from the active theme), `auroraEdgeY` (the wavy
  top edge — two layered sines plus a gravity-well sway), and `auroraEdgePoints`
  (rasterises an edge into draw points). Because the geometry is a pure function
  of a fixed seed, the same galaxy always shows the same aurora across frames
  and reloads.
- `components/StarField.tsx` gained an opt-in `auroraMode` prop. It builds the
  band geometry once in `resize()` (so it tracks the current sky size but never
  re-randomises mid-flight), then each frame advances an aurora clock, eases a
  horizontal sway toward the cursor's offset from the centre, and draws each
  ribbon as a filled path with a vertical gradient — **behind** the stars (like
  nebula and meteors). It touches the draw pass only, so it is fully orthogonal
  to gravity, warp, nebula, constellations, meteors, variable stars, Stellar
  Depth, zoom and the comet.
- `lib/recipe.ts` gained a shareable `?aurora=` layer toggle (off by default, so
  a calm galaxy keeps a tidy URL) and it is surfaced in `describeRecipe`.
- `app/page.tsx` wires `auroraMode={recipe.aurora}` and adds an **Aurora** chip
  to the Galaxy Dock's environment row.

### Key files / components

- `lib/aurora.ts` (new) and `lib/aurora.test.ts` (new, 10 tests).
- `components/StarField.tsx` — new `auroraMode` prop, band build in `resize()`,
  and the behind-the-stars ribbon draw.
- `lib/recipe.ts` — the shareable `?aurora=` layer toggle.
- `app/page.tsx` — the **Aurora** toggle chip.

### User-facing behavior

- Toggle **Aurora: On** and watch — a handful of soft green/cyan ribbons appear
  drifting across the upper sky, gently swaying with the gravity well. The
  stars, gravity well, spin, and every other toggle keep working exactly as
  before.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Aurora: On** and
   watch the ribbons drift. Add `?aurora=on` to the URL to share.
2. Combine with Nebula or Constellations — the ribbons sit behind both cleanly.
3. `npm test` — 10 new tests cover determinism, band count, range invariants,
   theme-hue selection, seed sensitivity, edge math, time drift, sway, and
   rasterisation.

### Known limitations / follow-ups

- The ribbon palette is drawn from the active theme hues; future cycles could
  add a dedicated aurora hue (e.g. a faint red aurora band) and per-ribbon
  intensity controls.
- Aurora state is shareable via `?aurora=` but not persisted in the dock beyond
  the recipe; a follow-up could add a saved “Aurora” preset.

## Shareable Galaxy Prints — export your galaxy as a branded image

- **Date added:** 2026-08-22
- **Version:** 0.13.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Every other layer in Pinwheel Galaxy is something you *watch* — the galaxy is a
visual, generative instrument. The one gap was that a beautiful galaxy you
spent time tuning lived and died in the browser: the Shareable Galaxy Recipes
(v0.10.0) let you share the *link*, but not the *image*. People share things
they can see. Shareable Galaxy Prints closes that gap — it lets you export the
galaxy you are looking at as a polished, branded PNG you can drop into a social
post, a message, or a mood board. It is the natural sibling of the deep-link
recipes: the link says “come make your own”; the print says “here it is”.

### How it works (high-level)

- `lib/exportCard.ts` holds the **pure**, deterministic composition model. When
  asked to export, the current galaxy is fitted into a framed image window via
  `computeCover` (a cover-fit: it fills the frame and crops the excess, so the
  galaxy never distorts), wrapped text is measured font-aware with `wrapText`,
  and the whole card is assembled as a plain data URL. The deep link is
  canonicalised with `deepLink` and the galaxy is labelled with `describePrint`
  (default labels stripped so a custom galaxy reads cleanly). Nothing here touches
  the DOM, canvas, or network — it is a pure function of (galaxy, URL).
- `components/GalaxyShareCard.tsx` is the client runtime. It takes a
  `getCanvas` callback (to read the live starfield canvas), the `deepLinkUrl`,
  and a human-readable `description`, and renders a small **Share** popover with
  three exits: **Download PNG** (saves the 1080×1350 card), **Web Share**
  (the native OS share sheet, when the browser supports it), and **Copy link**
  (copies the deep link to the clipboard). The component owns only its own
  preview state; it is otherwise a pure function of its props.
- `components/StarField.tsx` gained an optional `canvasRef` callback so the
  parent can forward the live canvas element. The internal canvas ref was renamed
  to `canvasElementRef` to avoid a clash with the new prop.
- `components/GalaxyDock.tsx` gained an optional `share` slot; the **Share**
  button appears next to Shuffle / Gravity only when a control is passed, so the
  dock stays lean by default.
- `app/page.tsx` forwards the live canvas to StarField, builds the current deep
  link from the page URL, and renders `GalaxyShareCard` in the dock with a
  description derived from `describeConfig` + `describeRecipe`.

### Key files / components

- `lib/exportCard.ts` (new) — pure composition model, unit-tested.
- `lib/exportCard.test.ts` (new, 10 tests) — cover geometry, wrapping, window
  math, deep-link composition, and description.
- `components/GalaxyShareCard.tsx` (new) — client runtime.
- `components/StarField.tsx` — optional `canvasRef` callback.
- `components/GalaxyDock.tsx` — optional `share` slot.
- `app/page.tsx` — wiring.

### User-facing behavior

- A **Share** button (⛶) sits at the right end of the Galaxy Dock, next to
  Shuffle and the Gravity toggle. Clicking it opens a compact popover showing a
  live preview of the print with three buttons: Download PNG, Web Share (hidden
  automatically when unsupported), and Copy link (with a brief “Copied!”
  confirmation).

### How to test / try it

1. Open the site, tune a galaxy (change theme, arms, spin, toggle nebula,
   etc.).
2. Click **Share** in the dock. The preview should reflect the current galaxy.
3. Click **Download PNG** — a 1080×1350 branded image downloads.
4. Click **Copy link** — the current deep link is copied; paste it in a new tab
   to re-hydrate the exact galaxy.

### Known limitations / follow-ups

- The export is a single fixed portrait aspect (1080×1350); landscape and
  story formats are a natural follow-up.
- Web Share is only available in secure contexts with user-gesture support; on
  unsupported browsers the button is hidden and the flow falls back to Copy link.

---

## Cosmic Soundscape — a generative, reactive ambient soundscape

- **Date added:** 2026-08-22
- **Version:** 0.12.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Pinwheel Galaxy is a *visual* generative instrument — every other layer is
something you watch. The Cosmic Soundscape gives the galaxy a second sense: a
generative ambient soundscape that plays the galaxy the way the starfield
renders it. Category generative tools (scaffolding instruments like Aeon,
EventField Web, and the wave of Web-Audio art sites) show that live,
sample-free synthesis is the natural audio for a live-generated visual — it
stays in tune with whatever is being generated, exactly as this feature stays
in tune with the visible galaxy. It turns a glance into an experience and is a
fresh, on-brand dimension of the engine with zero backend cost.

### How it works (high-level)

- `lib/soundscape.ts` holds the **pure**, deterministic model. Every theme
  maps to a distinct modal scale (violet → minor pentatonic, aurora → lydian,
  ember → mixolydian, azure → dorian, monochrome → whole-tone) with its own
  tonic, so the sound is always consonant. `composeVoice` derives the tempo
  (BPM) from the spin speed and the sparkle density from the star count, and
  maps the sky-layer toggles to voice triggers: nebula → a sustained pad,
  constellations → a slow arpeggio walking the scale, variable stars → bright
  high-octave twinkle, comet → periodic upward sweeps. The same galaxy always
  yields the same voice, which is what makes the sound a faithful reflection of
  the visible galaxy rather than decoration.
- `lib/useSoundscape.ts` is the client runtime: a tiny `SoundscapeEngine` that
  owns a few oscillators and gain nodes, synthesising every tone at runtime
  (Web Audio API, no samples, no dependencies). It rebuilds the pad and
  re-arms a per-beat scheduler whenever the voice changes, scheduling shimmer /
  twinkle / comet events on tempo.
- **Muted by default and gated behind the first user gesture** — both polite
  and required by browser autoplay policies. A `?sound=on` deep link
  pre-arms the toggle; audio still waits for a click/keypress before it starts.
  Degrades gracefully: if `AudioContext` is unavailable or
  `prefers-reduced-motion` is on, the galaxy works perfectly well in silence.

### Key files / components

- `lib/soundscape.ts` (new) and `lib/soundscape.test.ts` (new, 8 tests).
- `lib/useSoundscape.ts` (new) — the `useSoundscape` hook + `SoundscapeEngine`.
- `lib/useGalaxyParams.ts` gained the shareable `?sound=` toggle +
  `toggleSound`.
- `app/page.tsx` drives the hook and adds a **Sound** chip to the Galaxy Dock.

---

## Galaxy of the Day — a fresh, seeded galaxy every day

- **Date added:** 2026-08-22
- **Version:** 0.11.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Generative tools lose people after a few generations because there is no
reason to come back. The antidote used by the category (NightCafe's Promptle,
Prompt Royale, constraint engines) is a single fresh, **shared** challenge that
refreshes once per calendar day: everyone sees the same thing today, a new one
tomorrow, and it costs nothing to run. For Pinwheel Galaxy this is a natural
fit — the engine is already time-based and generative, and the shipped Galaxy
Recipes (v0.10.0) already made every galaxy a deep link.

### How it works (high-level)

- `lib/galaxyOfDay.ts` (new) holds the **pure**, deterministic logic: a day key
  (`YYYY-MM-DD` in local time), a 32-bit FNV-1a `hashSeed`, a `mulberry32`
  PRNG seeded by the day, `dailyConfig` (snapped to real preset knobs),
  `pickLayers` (a low-bias subset of the sky layers), `dailyPrompt` (a short
  creative constraint), `galaxyOfDay`, and `dailyDeepLink` (the shareable
  `/?theme=&arms=&rpm=&stars=&<layers>=on` URL). `lib/galaxyOfDay.test.ts`
  (new, 12 tests) covers determinism, range, per-day stability, subset budget,
  and deep-link round-tripping.
- The card is fully **client-side and backend-free**. It computes today's
  galaxy from the local date, shows the daily prompt + a one-line summary, and
  links to a deep link that re-hydrates the exact galaxy via the existing
  recipe system. A `setTimeout`/`setInterval` flips the card to the new galaxy
  at local midnight.
- Additive and non-breaking: the starfield, dock, presets and recipe system are
  untouched, and the default galaxy looks exactly as before.

### Key files / components

- `lib/galaxyOfDay.ts` (new) and `lib/galaxyOfDay.test.ts` (new, 12 tests).
- `app/page.tsx` gained a `GalaxyOfTheDay` section (prompt, summary, "Open
  today's galaxy" deep link, and a "Copy shareable link" button).

---

## Shareable Galaxy Recipes — Full-State Deep Links

- **Date added:** 2026-08-22
- **Version:** 0.10.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

The base **Galaxy Presets** (v0.2.0) made the spiral *config* shareable
(`?theme=&arms=&rpm=&stars=`), but the seven interactive **layers** — Nebula,
Constellations, Shooting Stars, Zoom, Depth, Variable Stars, Comet — lived only
in page state. Copy the URL and everyone else got your galaxy *without* the
layers you had turned on. Recipes close that gap: the URL now encodes the state
of every layer, so a shared link re-hydrates the exact galaxy you were looking
at. It is the natural completion of the presets system.

### How it works (high-level)

- `lib/recipe.ts` (new) holds the **pure** recipe model: `parseRecipe` (reads
  layer toggles, missing → off, never throws), `recipeToParams` (writes only the
  on-layers, so a plain galaxy keeps a tidy empty query), plus `resolveRecipe`,
  `toggleLayer` and `describeRecipe`.
- `lib/useGalaxyParams.ts` now **owns** the recipe state, persists every layer
  toggle into the URL via `history.pushState`, and re-reads it on `popstate`
  (Back/Forward) — the recipe is part of the URL's source of truth.
- `app/page.tsx` drives all seven dock toggles from `recipe` + a single
  `toggle()` setter instead of seven local `useState`s.
- Layer params sit alongside the existing config/gravity/zoom params, e.g.
  `?theme=aurora&arms=5&nebula=on&constellation=on&comet=on`.

### Key files / components

- `lib/recipe.ts` (new) and `lib/recipe.test.ts` (new, 9 tests).
- `lib/useGalaxyParams.ts` — recipe state, URL persistence, `popstate` re-read.
- `app/page.tsx` — dock toggles driven by `recipe` + `toggle()`.

### User-facing behavior

- Toggle any layer **On**, copy the URL, open it elsewhere — the galaxy re-creates
  with that layer on.
- Back/Forward re-hydrates the recipe from the URL, like the base config.
- With no layers on, the URL is unchanged — no `?nebula=off` noise.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Nebula: On** and
   **Comet: On**, then copy the address bar.
2. Open the copied URL in a fresh tab — the nebula and comet are on, and the base
   config matches too.
3. Toggle a layer off — its param drops out of the URL.
4. `npm test` — 9 new tests cover parse/build, off-is-default, tidy-URL,
   round-trip, and toggle.

### Known limitations / follow-ups

- The recipe captures toggle state (on/off), not per-layer *tuning* — as layers
  gain intensity knobs, those can be added to the recipe. Toggle state lives in
  the URL now, so a reload restores it; a "remember my last session" cookie is a
  possible follow-up.

---

## Comet Trail — a Cursor-Following Comet

- **Date added:** 2026-08-22
- **Version:** 0.9.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

A comet trails your cursor across the hero: a bright core with a tapering,
fading tail that grows longer the faster you sweep the pointer and re-colours to
match the active galaxy theme. It is a small, delightful, pointer-reactive
touch that marks a site that was designed, not generated. Purely additive and
**off by default**, so the default galaxy looks exactly as before. It is
distinct from Shooting Stars — those are sky meteors on a fixed timeline; the
Comet Trail lives and dies with your pointer.

### How it works (high-level)

- `lib/comet.ts` (new) holds the **pure** logic: a `mulberry32` PRNG,
  `cursorSpeed` (px/s from recent pointer samples), `polylineLength` /
  `resampleTail` (evenly resampling the pointer path into tail points), and
  `tailLengthFromSpeed` (mapping speed onto a capped tail length). All unit-tested.
- `components/StarField.tsx` owns the live layer: a bounded ring buffer of
  pointer samples, a 500 ms age prune, an eased comet head, and a draw pass that
  paints a soft halo, a tapered gradient tail and a bright core — all drawn
  *after* the galaxy-zoom transform so the comet stays pinned to the on-screen
  cursor. Pure atmosphere; it never touches the gravity-well physics or any
  other layer.
- `app/page.tsx` gained a **Comet: On/Off** chip in the dock.

### Key files / components

- `lib/comet.ts` (new) and `lib/comet.test.ts` (new, 16 tests).
- `components/StarField.tsx` — new `cometMode` prop + tapered-tail draw pass.
- `app/page.tsx` — the **Comet** toggle chip.

### User-facing behavior

- Toggle **Comet: On** and move the cursor — a glowing comet follows the
  pointer, its tail stretching on a fast swipe and shrinking when you go still.
- Switch theme — the comet re-colours to match.
- Works alongside every other toggle and the galaxy presets.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Comet: On** and move
   the cursor over the hero.
2. Move slowly then swipe fast — the tail grows with speed.
3. Switch theme — the comet re-colours.
4. `npm test` — 16 new tests cover the PRNG, speed, polyline length,
   resampling, and tail-length mapping.

### Known limitations / follow-ups

- Toggle state is not persisted across reloads (a follow-up could add a
  `?comet=` param like `?z=`). The tail is tapered single-pass segments, not a
  bloom halo (a possible follow-up: a second blurred pass for a softer glow).

## Variable Stars — a Living-Sky Layer

- **Date added:** 2026-08-22
- **Version:** 0.8.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

A real night sky is never perfectly still: a fraction of stars brighten and dim
on their own slow light curves, and a handful are giants — larger and softer.
Variable Stars borrows that idea and layers it over the interactive starfield so
the galaxy *breathes* even when you leave it alone. It is purely cosmetic,
additive and **off by default**, so the default galaxy looks exactly as before.

### How it works (high-level)

- `lib/variableStars.ts` (new) holds the **pure** logic: a deterministic
  `mulberry32` PRNG, `assignVariableStars(count, seed)` which gives every star a
  stable profile `{ period, phase, amplitude, isGiant, isVariable }`, and
  `variableBrightness` — a bounded sinusoid returning a multiplier in
  `[1 - amplitude, 1 + amplitude]` so a star never goes black or blows out.
  Because the assignment is a pure function of the index and a fixed seed, the
  same star is always the same variable star across frames and reloads.
- `components/StarField.tsx` gained a `variableMode` prop. It builds the
  per-star profiles once in `resize()` (so they track the current star count but
  never re-randomise mid-flight), then in the star draw pass multiplies each
  star's alpha by its light curve and draws giants at `variableSize` (2.4×) —
  all only when the layer is on. It touches the draw pass only, never the spring
  physics, so it is fully orthogonal to gravity, warp, nebula, constellations,
  meteors, zoom and Stellar Depth.
- `app/page.tsx` gained a **Variable Stars: On/Off** chip in the dock.

### Key files / components

- `lib/variableStars.ts` (new) and `lib/variableStars.test.ts` (new, 12 tests).
- `components/StarField.tsx` — new `variableMode` prop, profile build in
  `resize()`, and draw-time light-curve + giant-size modulation.
- `app/page.tsx` — the **Variable Stars** toggle chip.

### User-facing behavior

- Toggle **Variable Stars: On** and watch — over a few seconds a scattered
  subset of stars gently brighten and dim at their own rates, while a few rare
  giants glow noticeably larger and breathe more dramatically. The gravity well,
  spin, and every other toggle keep working exactly as before.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Variable Stars: On**
   and watch the sky settle into a gentle twinkle of its own.
2. Turn on Constellation or Stellar Depth together — the light curves compose
   cleanly with those layers.
3. `npm test` — 12 new tests cover determinism, range, giant/variable fractions,
   light-curve bounds/periodicity/phase, and seed sensitivity.

### Known limitations / follow-ups

- Toggle state is not persisted across reloads (a follow-up could add a
  `?variable=` param like `?z=` for zoom). All variable stars share one fixed
  seed; future cycles could seed it from the galaxy config so a saved galaxy
  keeps its own variable pattern.

## Stellar Depth — a 3D Parallax Layer for the Starfield

- **Date added:** 2026-08-22
- **Version:** 0.7.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

The hero starfield read as a flat, rotating disc. Stellar Depth adds a subtle
3D parallax + twinkle layer so the galaxy reads as a volume of stars at
different distances. When enabled, moving the cursor shifts near stars more than
far ones (parallax), stars gently twinkle (nearer stars harder), and far stars
are dimmed and softened (atmospheric perspective). **Off by default**, purely
additive, and orthogonal to every other feature, so the default galaxy is
unchanged.

### How it works (high-level)

- `lib/starDepth.ts` (new) holds the pure logic (unit-tested): `depthForIndex`
  assigns each star a stable distance in `[0.15, 1]` (seeded, so it never
  re-randomises), `twinklePhase` staggers twinkle, and `twinkleAlpha` /
  `depthScale` drive the draw-time twinkle and atmospheric-perspective scaling.
- `components/StarField.tsx` owns the layer: it builds the depth map + twinkle
  phases in `resize()` (fixed between frames), eases a cursor-parallax vector
  each frame, applies a draw-time `parallax × depth` offset to every star, and
  modulates the star draw pass. The parallax is applied *after* the spring
  physics, so it is fully orthogonal to the gravity well.
- `app/page.tsx` gained a **Depth: On/Off** toggle in the hero control row.

### Key files / components

- `lib/starDepth.ts` (new) and `lib/starDepth.test.ts` (new, 9 tests).
- `components/StarField.tsx` — new `depthMode` prop, depth-map build, eased
  parallax vector, twinkle + atmospheric-perspective draw pass.
- `app/page.tsx` — the **Depth: On/Off** toggle.

### User-facing behavior

- Click **Depth: On** (new rightmost toggle), then move the cursor — the stars
  separate into depth layers and twinkle. Move away and the field settles.
- Works alongside gravity, warp, constellations, nebula, meteors, and zoom.

### How to test / try it

1. `npm install` → `npm run build` → `npm start`; toggle **Depth: On** and move
   the cursor — near stars shift more than far ones.
2. Turn on Constellation Mode with Depth on — the link web bends with the layer.

### Known limitations / follow-ups

- Toggle state is not persisted across reloads; a follow-up could add a
  `?depth=` param. Depth is a single parallax axis; multiple independent depth
  layers would deepen the sense of scale.

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
