# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

## [0.3.0] — 2026-08-22

### Added

- **Warp Drive** — hyperspace motion streaks. Crank the galaxy's spin past
  ~10 rpm and the stars begin to stretch into hyperspace streaks; at the max
  spin (20 rpm) the whole galaxy blurs into a tight swirl. The streaks are an
  emergent function of the spin knob (no toggle), so they always stay in sync
  with the galaxy the visitor is controlling, and they ripple with the gravity
  well and click shockwaves because their length follows each star's speed.
  Implemented as an additive draw pass in `components/StarField.tsx`.

### Notes

- Additive and non-breaking; the default 6 rpm galaxy is visually unchanged.

## [0.2.0] — 2026-08-22

### Added

- **Galaxy Presets** — shareable, deep-linkable galaxy configurations.
  - Config (theme, spiral arms, spin rpm, star count) is expressed as URL search
    params, so any galaxy is shareable by copying the URL.
  - `lib/galaxyPresets.ts` (config model, theme palettes, validation, shuffle).
  - `lib/useGalaxyParams.ts` (binds config to the URL; Back/Forward sync).
  - `components/GalaxyDock.tsx` — glass dock with theme swatches, steppers, the
    preserved Gravity toggle, and a **Shuffle** (🎲) button.
  - `components/StarField.tsx` gained an additive `config` prop; defaults are
    unchanged when no params are present.
- **Constellation Mode** — an optional toggle that connects nearby stars with a
  living web of faint cyan links. Links form between stars within a threshold
  distance and brighten where the stars are moving fastest, so the web ripples
  with the gravity well and to click shockwaves. Implemented as an additive draw
  pass in `components/StarField.tsx`; controlled by a new "Constellations: On/Off"
  toggle in the hero control bar.

### Fixed

- **Vercel production deploy unblocked.** The `VERCEL_API` token was refreshed
  with project-create rights. Created the `pinwheel-galaxy` project and shipped
  production at https://pinwheel-galaxy.vercel.app.

### Notes

- All changes are additive and non-breaking; the original gravity well and its
  default look are preserved. Constellation Mode is orthogonal to the Gravity
  Well toggle.
- Both features were built, locally verified (HTTP 200), and deployed to Vercel
  production.

## [0.1.0] — 2026-08-22

### Added
- Next.js 15 + TypeScript + Tailwind CSS project scaffold.
- Responsive landing page: glass nav bar, animated hero, feature cards, footer.
- **"Gravity Well" interactive starfield** — a canvas background with a
  cursor-driven gravitational well and click shockwaves, spring-back orbital
  physics, speed-based star glow, and a `prefers-reduced-motion` fallback.
- A "Gravity Well: On/Off" toggle in the hero.
- `FEATURES.md` (feature catalog) and this changelog.

### Notes
- Production deploy to Vercel is pending: the current `VERCEL_API` token has a
  read-only role and cannot create projects. Local build verified (HTTP 200).

[0.1.0]: https://github.com/pefman/pinwheel-galaxy/releases/tag/v0.1.0
