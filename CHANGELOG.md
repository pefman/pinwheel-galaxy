# Changelog

All notable changes to **Pinwheel Galaxy** are documented here. This project
follows [Keep a Changelog](https://keepachangelog.com) conventions, plus a
"Shipped" section for ongoing autonomous evolution.

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
