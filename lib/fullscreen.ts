/**
 * Fullscreen mode — the tiny bit of pure, side-effect-free logic behind the
 * interactive-galaxy fullscreen feature.
 *
 * The UI (a Fullscreen button in the Galaxy Dock, the browser Fullscreen API
 * contract, the Escape handler and the `?fullscreen=on` deep link) lives in
 * `app/page.tsx`. This module owns only the *data* part of the feature:
 * parsing the query flag back out of a URL and (de)serialising it, so that
 * behaviour can be unit-tested without a DOM, a canvas or a browser.
 *
 * Design intent:
 * - Off by default. The flag is only ever present while fullscreen is on, so
 *   an empty/absent value means "not fullscreen".
 * - Strictly validated. Anything that is not exactly the expected value is
 *   treated as "not fullscreen" rather than guessed at — a typo in the URL must
 *   never drop the visitor into an unexpected layout.
 * - Orthogonal. This is a view/layout transform, not part of the galaxy's own
 *   configuration: it changes how you look at the galaxy, not the galaxy.
 */

/** The URL query key that, when "on", puts the galaxy in fullscreen mode. */
export const FULLSCREEN_QUERY = "fullscreen";

/** The only value of `FULLSCREEN_QUERY` that means "fullscreen is on". */
export const FULLSCREEN_VALUE = "on";

/**
 * The keyboard shortcut for toggling fullscreen: the single letter `f`.
 * Guarded in the UI so it does not fire while typing into a field.
 */
export const FULLSCREEN_SHORTCUT = "f";

/**
 * Parse the raw value of the `?fullscreen=` query param.
 *
 * Returns `true` only when the value is exactly `FULLSCREEN_VALUE` ("on").
 * `null` (param absent), `undefined`, or any other string all mean "not
 * fullscreen" — the feature is off unless explicitly asked for.
 */
export function parseFullscreen(raw: string | null | undefined): boolean {
  return raw === FULLSCREEN_VALUE;
}

/**
 * Build a `URLSearchParams` carrying the fullscreen flag for the given state.
 *
 * When fullscreen is on, sets `?fullscreen=on`. When off, deletes the flag so
 * the URL stays clean (an empty query string rather than `?fullscreen=off`).
 */
export function fullscreenToParams(fullscreen: boolean): URLSearchParams {
  const params = new URLSearchParams();
  if (fullscreen) {
    params.set(FULLSCREEN_QUERY, FULLSCREEN_VALUE);
  }
  return params;
}

/**
 * Given the current path and search string, return the path + search for the
 * desired fullscreen state. Used to `replaceState` the URL when toggling.
 *
 * - `fullscreen=true`  → appends `?fullscreen=on` (keeping any other params).
 * - `fullscreen=false` → drops the flag, leaving any other params intact and
 *   no dangling `?` when nothing else remains.
 */
export function fullscreenUrl(
  pathname: string,
  search: string,
  fullscreen: boolean,
): string {
  // `window.location.search` includes the leading "?"; strip it so the query
  // parser sees a clean key=value string rather than a stray "?" key.
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (fullscreen) {
    params.set(FULLSCREEN_QUERY, FULLSCREEN_VALUE);
  } else {
    params.delete(FULLSCREEN_QUERY);
  }
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}
