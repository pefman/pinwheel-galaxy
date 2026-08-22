# Galaxy Presets — Shareable, Deep-Linkable Galaxy Configs

- **Date added:** 2026-08-22
- **Version:** 0.2.0
- **Type:** New feature (additive, client-only, no server/data)
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## Short description

Visitors can now **tune the live gravity-well galaxy** — colour theme, number of
spiral arms, rotation speed, and star count — and **share the exact result by
copying the URL**. Every configuration is expressible as a URL, so a link like

```
https://pinwheel-galaxy.vercel.app/?theme=aurora&arms=5&rpm=9&stars=400
```

opens to that exact galaxy for anyone. A **Shuffle** button (🎲) generates a
random galaxy and rewrites the URL in one click.

## Why

The product is an ever-evolving, delightful website. Shareable, deep-linkable
configurations are a small but memorable way to make the galaxy feel *yours*, and
they double as a living demo of the "additive, non-breaking" evolution principle:
the original gravity well is untouched, and everything is additive on top.

## How it works (high-level)

1. **Config model** (`lib/galaxyPresets.ts`): a `GalaxyConfig` of `{ theme, arms, rpm, stars }`.
   - `THEMES` maps a key to a hue palette + gradient swatch.
   - `parseConfigFromParams` / `configToParams` round-trip config <-> URL params,
     silently falling back to defaults for missing or out-of-range values.
   - `shuffleConfig()` returns a random valid config.
2. **URL binding** (`lib/useGalaxyParams.ts`, a React hook):
   - On mount it reads `?theme=&arms=&rpm=&stars=` (and `?gravity=`) so freshly
     opened shareable links render the intended galaxy.
   - Mutations write the new state back via `history.replaceState`, keeping the
     address bar as the source of truth.
   - A `popstate` listener re-renders on Back/Forward navigation.
3. **StarField** (`components/StarField.tsx`) gained an additive `config` prop:
   it maps the theme's hues across stars, and uses `arms` / `rpm` / `stars` for
   the physics seed. **Defaults are unchanged**, so no-URL visits look identical
   to before.
4. **GalaxyDock** (`components/GalaxyDock.tsx`): a glass control bar with theme
   swatches, stepper knobs for arms/spin/stars, the preserved **Gravity** toggle,
   and **Shuffle**.

## Key files / components

| File | Purpose |
| --- | --- |
| `lib/galaxyPresets.ts` | Config model, theme palettes, URL (de)serialization, shuffle, validation. |
| `lib/useGalaxyParams.ts` | Client hook binding config <-> URL (deep links, Back/Forward). |
| `components/GalaxyDock.tsx` | Glass dock: theme swatches, steppers, gravity toggle, Shuffle. |
| `components/StarField.tsx` | Additive `config` prop (hues, arms, rpm, starCount). Defaults unchanged. |
| `app/page.tsx` | Wires the hook + dock into the hero. |
| `app/layout.tsx` | Updated page description. |

## User-facing behavior

- **Theme swatches** — click a colour swatch to re-skin the whole galaxy.
- **Arms / Spin / Stars** — use the −/+ steppers to reshape the galaxy live.
- **🎲 Shuffle** — randomise everything; the URL updates so it is instantly shareable.
- **Gravity toggle** — the original On/Off well, preserved.
- **Shareable URL** — the address bar always reflects the current galaxy; copy it
  and send it. Opening that URL reproduces the same galaxy.
- **Back / Forward** — browser navigation re-renders the galaxy from the URL.
- **Defaults** — visiting without params shows the original 3-arm violet spiral.

## How to test / try it

1. `npm install` then `npm run build` and `npm start` (or `npm run dev`).
2. Open the site; scroll to the hero. The glass **Galaxy controls** dock sits
   below the hero.
3. Click theme swatches — the galaxy re-skines.
4. Stepper the **Arms**, **Spin**, **Stars** — the galaxy reshapes live.
5. Hit **🎲 Shuffle** — a random galaxy appears and the URL changes.
6. Copy the URL from the address bar, open it in a new tab — the same galaxy loads.
7. Press the browser **Back/Forward** buttons — the galaxy re-renders from the URL.
8. Visit `/?theme=monochrome&arms=2&rpm=12&stars=200` directly — a specific galaxy loads.

### Direct test links

- Aurora, 5 arms, 9 rpm, 400 stars:
  `https://pinwheel-galaxy.vercel.app/?theme=aurora&arms=5&rpm=9&stars=400`
- Default galaxy (no params): `https://pinwheel-galaxy.vercel.app/`

## Configuration reference

Read from URL search params (all optional; invalid values fall back to defaults):

| Param | Default | Range | Meaning |
| --- | --- | --- | --- |
| `theme` | `violet` | violet · aurora · ember · azure · monochrome | Colour palette. |
| `arms` | `3` | 1–8 | Number of spiral arms. |
| `rpm` | `6` | 1–20 | Rotation speed (rotations per minute). |
| `stars` | `320` | 120–640 | Number of stars. |
| `gravity` | `1` | 0/1 | Gravity-well On/Off (preserved from v1). |

Themes (`THEMES` in `lib/galaxyPresets.ts`): each maps a key to a `hues` array
(degrees) and a Tailwind gradient class used for the dock swatch.

## Known limitations / follow-ups

- **No persistence** beyond the URL: a manual reset to defaults requires
  clearing the params (a "Reset" button is a natural follow-up).
- **No saved presets / gallery** — a library of community presets would build
  naturally on this.
- **Star count is capped** at 640 for performance; higher counts could be
  throttled by DPR or viewport.
- Config is client-side only — no server-side personalisation or A/B yet.

## Success criteria (this cycle)

- ✅ One real, focused, additive feature implemented.
- ✅ Non-breaking; the original gravity well and defaults are untouched.
- ✅ Matches stack (Next.js 15 / TS / Tailwind) and cosmic visual style.
- ✅ Documented here + in `FEATURES.md` + `CHANGELOG.md`.
- ✅ Built, locally verified (HTTP 200), and **deployed to Vercel production**.
