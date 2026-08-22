# Shareable Galaxy Recipes

- **Date added:** 2026-08-22
- **Version:** 0.10.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

## What + why

The base **Galaxy Presets** (v0.2.0) made the spiral *config* shareable:
`?theme=aurora&arms=5&rpm=9&stars=400` re-creates a galaxy's colour, arms, spin
and star count. But the site also has seven interactive **layers** — Nebula,
Constellations, Shooting Stars, Zoom, Depth, Variable Stars and Comet — and
until now those toggles lived only in page state. Copy the URL and everyone else
got your galaxy **without** the layers you had turned on.

**Shareable Galaxy Recipes** closes that gap: the URL now encodes the state of
*every* layer, so a shared link re-hydrates the exact galaxy a visitor was
looking at. It is the natural completion of the presets system — the config is
the *recipe's ingredients*; the recipe is the *whole dish*.

## How it works (high-level)

- `lib/recipe.ts` (new) holds the **pure** recipe model, mirroring the side
  effect-free style of `galaxyPresets`:
  - `parseRecipe(usp)` reads the layer toggles; a missing or non-`=on` value is
    `false` (never throws).
  - `recipeToParams(recipe)` writes **only** the layers that are `on`, so a
    plain galaxy still produces an empty query string and tidy URLs.
  - `resolveRecipe`, `toggleLayer` and `describeRecipe` round out the API.
- `lib/useGalaxyParams.ts` now **owns** the recipe state alongside config,
  gravity and zoom. It persists every layer toggle into the URL via
  `history.pushState` and re-reads it on `popstate` (Back/Forward) — the recipe
  is part of the URL's source of truth, not a parallel state that drifts.
- `app/page.tsx` drives all seven dock toggles from `recipe` + a single
  `toggle()` setter instead of seven local `useState`s.

The layer params sit alongside the existing `?theme=&arms=&rpm=&stars=&gravity=&z=`
params, e.g.:

```
?theme=aurora&arms=5&rpm=9&nebula=on&constellation=on&comet=on
```

## Key files / components

- `lib/recipe.ts` (new) and `lib/recipe.test.ts` (new, 9 tests).
- `lib/useGalaxyParams.ts` — recipe state, URL persistence, `popstate` re-read.
- `app/page.tsx` — dock toggles driven by `recipe` + `toggle()`.

## User-facing behavior

- Toggle any layer **On**, then copy the URL — opening it anywhere re-creates the
  galaxy *with that layer on*.
- Turn layers on, share, and a friend who opens the link sees the same nebula,
  constellations, comet, etc.
- Back/Forward navigation re-hydrates the recipe from the URL, exactly like the
  base config.
- With no layers on, the URL is unchanged from before — no `?nebula=off` noise.

## How to test / try it

1. `npm install` → `npm run build` → `npm start`.
2. Open the site, toggle **Nebula: On** and **Comet: On**, then copy the address
   bar.
3. Open the copied URL in a fresh tab / another browser — the nebula and comet
   are on, and the base config (theme/arms/spin/stars) matches too.
4. Toggle a layer off — confirm its param drops out of the URL (tidy, no `off`
   params).
5. `npm test` — 9 new tests cover parse/build, the off-is-default rule,
   tidy-URL behaviour, round-tripping, and the toggle.

## Known limitations / follow-ups

- The recipe captures **toggle state** (on/off), not per-layer *tuning* — e.g.
  the nebula has no intensity knob yet, so there is nothing to persist for it.
  As layers gain knobs, those can be added to the recipe.
- Toggle state is still not persisted across plain reloads within a session
  beyond the URL (it *is* in the URL now, so a reload restores it — but a
  "remember my last session" cookie is a possible follow-up).
