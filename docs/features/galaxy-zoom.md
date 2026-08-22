# Galaxy Zoom — Dolly Into the Starfield

- **Date added:** 2026-08-22
- **Version:** 0.6.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

Until now the hero starfield was fixed: you could spin and poke the galaxy, but
never get closer to it. **Galaxy Zoom** lets a visitor **scroll into the
galaxy** — a wheel / trackpad two-finger scroll (or a two-finger pinch on
touch) eases the camera in and out, and a double-click (or double-tap) snaps
back to the default view.

This adds a whole new axis of interaction on top of the gravity well and spin
knobs: you can now zoom up and poke individual stars. It is a small, delightful,
purely additive touch, **off by default**, so the default galaxy looks exactly
as it did before. It answers the 2026 anti-homogenization trend — a site where
 the whole hero is interactive and explorable, not just a fixed backdrop.

It is **purely additive and non-breaking**:

- It adds a new gesture layer and a `zoom`-scaled draw transform; it never
  changes the galaxy's own configuration or any existing draw pass.
- It is **off by default**, so the default galaxy is visually unchanged.
- When off, the wheel scrolls the page as usual — nothing about the existing
  interaction changes.

## How it works (high-level)

- `lib/zoom.ts` (new) holds the **pure** logic, given as unit tests: clamping
  to the 0.6×–2.5× range, easing the visible zoom toward an animated target each
  frame, turning a wheel delta into a multiplier, the `1 / zoom` screen-size
  scale that keeps stars crisp, and the `?z=` URL binding.
- `components/StarField.tsx` owns the live zoom state. When `zoomEnabled` it
  listens to `wheel` and two-finger `touch` gestures to set a `targetZoom`, and
  eases the visible `zoom` toward it with a smooth per-frame factor. Every frame
  it renders the galaxy — the constellation web, the warp streaks and the
  stars — inside a `ctx` transform scaled by `zoom` around the galaxy centre,
  while drawing that geometry at `1 / zoom` so it holds a **constant on-screen
  size** (a dolly, not a blow-up). Nebula, meteors and click pulses are drawn
  *outside* the transform box at screen scale, so the atmosphere reads as a
  fixed backdrop the galaxy moves through.
- `lib/useGalaxyParams.ts` now carries `?z=` alongside theme / arms / rpm /
  stars and gravity, so a zoomed galaxy is deep-linkable and survives
  Back/Forward navigation.

### The dolly, not a blow-up

The key visual trick is that the scene is scaled by `zoom` but every star is
drawn at `size / zoom`. The two cancel for star size, so stars stay crisp and
point-like no matter how far in you zoom — the galaxy *approaches you* instead
of turning into blurry blobs. `lib/zoom.ts::screenSizeScale` is the pure form
of this: `screenSizeScale(zoom) === 1 / zoom`.

### Constants (`lib/zoom.ts`)

| Constant | Value | Meaning |
|-------|:-----:|------|
| `ZOOM_MIN` / `ZOOM_MAX` | `0.6` / `2.5` | Inclusive zoom range |
| `ZOOM_DEFAULT` | `1` | Calm, default zoom |
| `ZOOM_EASE` | `0.18` | Per-frame fraction the visible zoom chases the target |
| `WHEEL_K` | `0.0016` | Exponential wheel-delta → multiplier factor |

## Key files / components

- `lib/zoom.ts` (new) — `clampZoom`, `easeZoom`, `screenSizeScale`,
  `wheelDeltaToMultiplier`, `applyZoomMultiplier`, `paramsToZoom`, `zoomToParams`.
- `lib/zoom.test.ts` (new) — 10 unit tests for the pure logic.
- `components/StarField.tsx` — new `zoomEnabled` prop + `onZoom` callback, wheel
  and two-finger-pinch gesture handlers, animated zoom state, and the `zoom`
  -scaled galaxy draw transform.
- `lib/useGalaxyParams.ts` — `?z=` param read/write.
- `app/page.tsx` — the **Zoom: On/Off** toggle in the hero control row.

## User-facing behavior

- Click **Zoom: On** (rightmost toggle in the bottom control row), then scroll
  with the wheel / trackpad — the galaxy eases in and out, clamped between 0.6×
  and 2.5×.
- Pinch with two fingers on touch to zoom; double-tap resets.
- Double-click (or double-tap) resets to the default 1× view.
- The current zoom level is written into the URL (`?z=1.30`), so a zoomed
  galaxy is shareable and restores on reload / Back+Forward.
- When Zoom is Off, the wheel scrolls the page as normal.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **Zoom: On** and scroll with the wheel — the galaxy dollys in.
4. Double-click — it snaps back to 1×.
5. Watch the URL gain a `?z=` param; reload to confirm it restores.
6. Toggle Off — the wheel scrolls the page again.

Direct link with zoom baked in:
`?theme=violet&arms=3&rpm=6&stars=320&z=1.6`.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 24/24 unit tests pass, including 10 in `lib/zoom.test.ts`:
  clamping to range, NaN/Infinity handling, wheel direction (up = in, down =
  out), multiplier clamping, easing convergence to the target, constant-on-screen
  sizing, `?z=` parse/clamp, and URL round-trip.

## Known limitations / follow-ups

- Toggle state is not persisted across reloads (same as Constellation Mode and
  Nebula Drift); only the zoom *level* (`?z=`) is shareable.
- Zoom is a global dolly around the galaxy centre; there is no per-axis pan — a
  natural follow-up is drag-to-pan once zoomed in.
- The `?z=` param is clamped to two decimals; sub-centimetre precision is lost
  in the URL (intentional, keeps links tidy).
