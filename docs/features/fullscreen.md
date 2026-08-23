# Fullscreen Galaxy — Immerse the Hero in the Whole Viewport

- **Date added:** 2026-08-24
- **Version:** 0.19.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

The hero is the whole point of Pinwheel Galaxy, but on a crowded or small
window the interactive galaxy shares the screen with the title, the feature
cards and the footer. **Fullscreen mode** lets a visitor expand the starfield to
fill the entire viewport — chrome gone, galaxy everywhere — and return to the
normal hero layout with one click.

It is a small, delightful, purely additive touch, **off by default**, so the
default experience is unchanged until someone chooses to enter. It answers a
simple trend: make the hero *immersive and explorable*, not just a fixed panel
inside a page.

It is **purely additive and non-breaking**:

- It adds a new control (the Fullscreen button) and a chrome-less expanded
  layout; it never changes the galaxy's own configuration or any existing draw
  pass.
- It is **off by default**, so the default galaxy looks exactly as it did
  before.
- It works everywhere: the browser Fullscreen API where supported, and a
  fallback chrome-less expanded layout where it is not.

## How it works (high-level)

- `lib/fullscreen.ts` (new) holds the **pure** logic, given as unit tests:
  parsing the `?fullscreen=` flag, building the `?fullscreen=` URL, and the
  `fullscreenUrl()` helper that preserves the rest of the galaxy params.
- `components/GalaxyDock.tsx` gained a **Fullscreen** button (⛶ / ✕) and a
  collapsible environment row. When fullscreen, the environment chips collapse
  to a single "Show galaxy features" toggle so the galaxy reads as a clean
  backdrop.
- `app/page.tsx` owns the fullscreen state. It calls the browser Fullscreen API
  (`document.documentElement.requestFullscreen`) on enter and `exitFullscreen()`
  on exit, with a **fallback** that swaps the hero for a `bg-black/80 h-screen`
  chrome-less expanded layout when the API is unavailable. The hero's text
  overlay is hidden while fullscreen so nothing competes with the galaxy.

### Fullscreen API vs. fallback

`requestFullscreen` can be blocked (e.g. not triggered by a user gesture) or
unsupported (older browsers, some iframes). Rather than hide the button, the
feature degrades gracefully: if the API is unavailable or the request is
blocked, entering fullscreen still hides the title overlay and expands the
starfield to a full-height, near-black canvas — the galaxy fills the viewport
visually even without the browser's native fullscreen chrome.

### The `f` keyboard shortcut and Escape

Press **`f`** (while not typing into a field) to toggle fullscreen; **Escape**
exits. In the fallback layout the browser does not handle Escape for us, so it
is handled manually.

### No hydration mismatch

The browser Fullscreen API is only available client-side. The availability is
checked **lazily — inside event handlers and effects, never during render** — so
the server render and the first client render produce identical output and
hydration is clean. (Reading `typeof document` during render would make the
server `undefined` and the client `"object"`, diverging the trees.)

### Deep-linkable

Entering fullscreen writes `?fullscreen=on` into the URL (preserving the rest of
the galaxy params). Reloading — or sharing a link with `?fullscreen=on` —
starts the site already in fullscreen mode.

## Key files / components

- `lib/fullscreen.ts` (new) — `parseFullscreen`, `fullscreenToParams`,
  `fullscreenUrl`, plus the `FULLSCREEN_QUERY` / `FULLSCREEN_VALUE` /
  `FULLSCREEN_SHORTCUT` constants.
- `lib/fullscreen.test.ts` (new) — unit tests for the pure logic.
- `components/GalaxyDock.tsx` — the Fullscreen button and the collapsible
  environment row.
- `app/page.tsx` — fullscreen state, enter/exit handlers (API + fallback), the
  `f` shortcut, Escape handling, the `?fullscreen=on` deep-link seeding, and the
  chrome-less expanded hero layout.

## User-facing behavior

- Click **Fullscreen** (⛶) in the bottom control row: the galaxy expands to
  fill the whole viewport, the title overlay disappears, and the environment
  chips collapse to a single "Show galaxy features" toggle. The button now reads
  **Exit fullscreen** (✕).
- Click **Exit fullscreen** (✕), press **Esc**, or press **`f`** again to
  return to the normal hero layout.
- The environment chips are visible by default in the normal layout and collapse
  automatically while fullscreen.
- The current mode is written into the URL (`?fullscreen=on`); a link with
  `?fullscreen=on` starts the site already in fullscreen.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Click **Fullscreen** — the galaxy fills the viewport and the title fades
   away.
4. Press **Esc** or click **Exit fullscreen** — the normal hero returns and the
   chips reappear.
5. Press **`f`** to toggle.
6. Open `/?fullscreen=on` — the site starts already in fullscreen.

Direct link with fullscreen baked in:
`?fullscreen=on`.

## Code-based verification

- `npm run build` passes (static prerender).
- `npm test` — 161/161 unit tests pass, including 7 in `lib/fullscreen.test.ts`:
  the `?fullscreen=` flag parse, the value round-trip, `fullscreenToParams`
  preserving other params, `fullscreenUrl` output, the `f` shortcut constant, and
  the leading-`?` URLSearchParams fix.
- Client-side Playwright verification (chromium) against the production build:
  the Fullscreen button renders, toggling enters/exits fullscreen, the hero
  heading hides in fullscreen, the environment chips collapse/expand correctly,
  the URL gains `?fullscreen=on`, and `?fullscreen=on` starts in fullscreen. All
  9 checks pass; the only console errors are pre-existing (a bug-report SVG path
  and a pre-existing `deepLinkUrl` hydration mismatch on `main`, unchanged by
  this feature).

## Known limitations / follow-ups

- Fullscreen toggle state is not persisted across reloads; only the mode is
  shareable via `?fullscreen=` (same pattern as other toggles).
- The fallback layout is a near-black expanded canvas, not the browser's true
  native fullscreen chrome (which is unavailable on that platform).
- The `?fullscreen=` param is a single on/off flag; a future cycle could layer it
  behind the galaxy params like the other toggles.
