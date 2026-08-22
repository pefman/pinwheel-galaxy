# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

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

### Fixed

- **Vercel production deploy unblocked.** The `VERCEL_API` token was refreshed
  with project-create rights. Created the `pinwheel-galaxy` project and shipped
  production at https://pinwheel-galaxy.vercel.app.

### Notes

- All changes are additive and non-breaking; the original gravity well and its
  default look are preserved.

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
