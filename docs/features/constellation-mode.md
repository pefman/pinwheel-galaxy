# Constellation Mode — Living Star Links

- **Date added:** 2026-08-22
- **Version:** 0.2.0
- **Type:** New feature (additive, client-only)
- **Status:** Built, locally verified (HTTP 200), deployed to Vercel production.

## Short description

An optional toggle that draws faint connecting lines between nearby stars,
turning the starfield into a **living constellation web**. Links appear between
any two stars closer than a threshold, and they brighten where the stars are
moving fastest — so the web ripples and shimmers in response to the gravity
well and to click shockwaves.

## Why

The gravity-well starfield makes the hero feel alive, but on its own the stars
read as isolated points. Constellation mode adds structure and narrative — it
evokes the "Galaxy" in the product name and gives the eye patterns to follow.
It is a small, self-contained layer on the existing renderer, so it is purely
additive and can be turned on or off without affecting anything else.

## How it works (high-level)

Constellation mode is implemented entirely inside `components/StarField.tsx` and
runs as an extra draw pass before the stars are painted:

1. For every pair of stars `(a, b)` with `a` before `b` in the list, compute the
   squared distance and skip pairs farther than `CONSTELLATION_MAX_DIST` (a
   cheap squared-distance test avoids a `sqrt` for the common case).
2. For pairs inside the threshold, derive a `proximity` value of `1` (touching)
   fading to `0` at the threshold distance.
3. Add a `motion` term from the average speed of the two stars, so links glow
   brighter wherever stars are being dragged by the gravity well or kicked by a
   pulse — this is what makes the web feel alive rather than static.
4. Stroke each link with a cyan `hsla` whose alpha and width are driven by
   `proximity` + `motion`, clamped to a readable range.

The pairwise pass is `O(n²)` over `STAR_COUNT` (320) stars ≈ 51k comparisons per
frame — trivial for the GPU-bound canvas, and it only runs when the mode is on.

## Key files / components

| File | Purpose |
| --- | --- |
| `components/StarField.tsx` | New constellation draw pass + `constellation` prop. |
| `app/page.tsx` | Added a **Constellations: On/Off** toggle in the hero control bar. |

## User-facing behavior

- Toggle **"Constellations: On/Off"** (bottom-center control, next to the
  gravity-well toggle) to enable or disable the linking web.
- When on, nearby stars connect with faint cyan lines forming shifting patterns.
- Move the cursor: the links near the gravity well stretch and brighten as the
  stars are pulled.
- Click: the shockwave kicks stars and the links along the expanding ring flash.
- Idle: the web gently settles back into a quiet spiral lattice.
- Works independently of the gravity-well toggle — both toggles are orthogonal.

## How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site, scroll to the hero.
3. Toggle **"Constellations: On"** — watch lines appear between nearby stars.
4. Move the cursor — the nearby links stretch and brighten.
5. Click — a ring of links flashes as the shockwave passes.
6. Toggle it **Off** — the web disappears, the stars remain.
7. Both toggles together: the well moves the stars and the web follows.

## Configuration (tuning constants)

All live at the top of `components/StarField.tsx`:

| Constant | Default | Meaning |
| --- | --- | --- |
| `CONSTELLATION_MAX_DIST` | 96 px | Two stars link when closer than this. |
| `CONSTELLATION_MIN_ALPHA` | 0.06 | Baseline link alpha (idle web). |
| `CONSTELLATION_MAX_ALPHA` | 0.32 | Link alpha at close proximity. |

## Known limitations / follow-ups

- Linking is `O(n²)`; fine at the default 320 stars, but a spatial grid/hash
  would help if `STAR_COUNT` grows large.
- Links are drawn as straight segments between pairs, not curved "nebula"
  ribbons — a follow-up could add a subtle glow bloom behind dense clusters.
- Toggle state is not persisted across reloads (same as the gravity-well toggle).

## Success criteria (this cycle)

- ✅ One real, focused, additive feature implemented.
- ✅ Non-breaking; existing starfield and page structure intact.
- ✅ Matches stack (Next.js 15 / TS / Tailwind) and cosmic visual style.
- ✅ Documented here + in `FEATURES.md` + `CHANGELOG.md`.
- ✅ Built, locally verified (HTTP 200), and deployed to Vercel production.
