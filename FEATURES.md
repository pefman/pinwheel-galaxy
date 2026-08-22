# Features

Living catalog of everything shipped to **Pinwheel Galaxy**. Each entry is
additive and dated. New features are added here every evolution cycle.

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
