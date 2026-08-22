# Gravity Well — Interactive Starfield

- **Date added:** 2026-08-22
- **Version:** 0.1.0
- **Type:** New feature (additive, client-only)
- **Status:** Built & locally verified, and **live on Vercel** — https://pinwheel-galaxy.vercel.app (deploy unblocked in 0.2.0).

## Short description

A full-screen interactive starfield background. Stars are arranged into a
slowly rotating spiral (pinwheel) galaxy. Moving the cursor creates a
gravitational well that pulls nearby stars toward it; clicking fires a radial
shockwave that flings stars outward. Stars always spring back to their orbital
rest position, so the galaxy settles back into its spiral shape when idle.

## Why

The product is "Pinwheel Galaxy" — an ever-evolving, delightful website. This
feature makes the landing page feel alive, reinforces the brand identity, and
demonstrates the additive, non-breaking evolution loop. It requires no server
support and no data, so it is safe to ship at any time.

## How it works (high-level)

1. **Seeding** (`createStars`): `STAR_COUNT` stars are distributed along
   `ARM_COUNT` spiral arms. Each star gets an orbit radius, a base angle, a
   spiral offset, a size, a base alpha, and a violet→cyan hue.
2. **Spin**: the whole galaxy rotates at `GALAXY_RPM` (~6 RPM) via `galaxyAngle`,
   updated per frame with delta-time so spin speed is frame-rate independent.
3. **Orbital spring**: each star computes its desired orbital position on screen
   and applies a Hooke's-law spring toward it with damping. This is what makes
   stars return to the spiral after being pushed.
4. **Gravitational well**: when the toggle is on and the user is not on a
   reduced-motion device, stars within `ATTRACT_RADIUS` of the cursor feel an
   attractive force proportional to how deep they are in the well.
5. **Click pulse**: a click records a `Pulse` that expands at `PULSE_SPEED`. When
   its ring crosses a star (within `PULSE_WIDTH`), the star gets a radial kick of
   `PULSE_STRENGTH` scaled by the pulse's remaining life.
6. **Glow**: star radius and alpha increase with speed, giving fast stars a
   warm "warp" glow.
7. **Rendering**: a single `2d` context, radial gradients per star/pulse,
   `clearRect` each frame. DPR capped at 2; canvas resizes on viewport change.

## Key files / components

| File | Purpose |
| --- | --- |
| `components/StarField.tsx` | The entire feature: canvas, physics loop, input handling, reduced-motion handling. |
| `app/page.tsx` | Hero section + the **Gravity Well: On/Off** toggle (`active` prop). |
| `app/globals.css` | Cosmic theme, glass surfaces, gradient text utilities. |
| `tailwind.config.ts` | `cosmos` colors, `fade-up` animation, `animation-delay` utilities. |

## User-facing behavior

- **Move cursor** over the hero → stars lean into the gravity well.
- **Click / tap** → a shockwave ring expands and flings stars outward.
- **Stop** → the galaxy gently settles back into its spiral.
- **Toggle "Gravity Well: On/Off"** (bottom-center control) → freezes
  interactivity; the galaxy still spins.
- **`prefers-reduced-motion: reduce`** → gravitational interactivity is disabled;
  stars only drift with the spin (accessibility-first).

## How to test / try it

1. `npm install`
2. `npm run build`
3. `npm start` (defaults to http://localhost:3000; pass `-- -p 3111` for another port)
4. Open the site, scroll to the hero.
5. Move the cursor — stars follow.
6. Click — pulse flings stars.
7. Toggle "Gravity Well" Off — interactivity stops, spin continues.
8. Set OS `prefers-reduced-motion` to "reduce" and reload — the well no longer pulls.

## Configuration (tuning constants)

All live at the top of `components/StarField.tsx`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `STAR_COUNT` | 320 | Number of stars. |
| `ARM_COUNT` | 3 | Spiral arms. |
| `GALAXY_RPM` | 6 | Galaxy rotation speed. |
| `SPRING_K` | 0.02 | Spring stiffness to orbit. |
| `DAMPING` | 0.86 | Velocity damping per frame. |
| `ATTRACT_RADIUS` | 220 px | Cursor well radius. |
| `ATTRACT_STRENGTH` | 0.9 | Well pull strength. |
| `PULSE_SPEED` | 520 px/s | Shockwave expansion speed. |
| `PULSE_WIDTH` | 120 px | Shockwave ring thickness. |
| `PULSE_STRENGTH` | 260 px/s | Radial kick when a pulse crosses a star. |
| `DPR_CAP` | 2 | Max device pixel ratio (performance). |

## Known limitations / follow-ups

- Canvas covers only the hero (one viewport tall), not the whole page.
- On/Off toggle state is not persisted across reloads.
- Star count is fixed; could scale with viewport area.
- **Production deploy: RESOLVED (0.2.0).** The `VERCEL_API` token was
  refreshed with project-create rights; the site is live at
  https://pinwheel-galaxy.vercel.app.

## Success criteria (this cycle)

- ✅ One real, focused, additive feature implemented.
- ✅ Non-breaking; existing page structure intact.
- ✅ Matches stack (Next.js 15 / TS / Tailwind) and cosmic visual style.
- ✅ Documented here + in `FEATURES.md` + `CHANGELOG.md`.
- ✅ Production deploy live on Vercel (0.2.0).
- ✅ Autopilot loop kept alive for the next evolution cycle.
