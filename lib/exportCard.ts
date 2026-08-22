/**
 * Export Card — the pure geometry & copy for "Shareable Galaxy Prints".
 *
 * Turning the live galaxy into a framed, shareable image is a two-part job:
 *   1. the *drawing* (canvas 2D composition) lives in the client component and
 *      can't be unit-tested in Node, and
 *   2. the *decisions* behind that drawing — how a captured frame is fitted
 *      into the card, how the caption text wraps, and what the deep link looks
 *      like — are pure and fully testable here.
 *
 * This module owns (2). The component owns (1) and calls straight into it, so
 * the visual result is always driven by tested logic. Zero dependencies.
 */

/**
 * The share card is a 1080×1350 portrait (4:5) — the ratio social feeds
 * (Instagram, X, Facebook share previews) give the most vertical space, so the
 * galaxy reads large in a thumbnail.
 */
export const CARD = {
  w: 1080,
  h: 1350,
  margin: 60, // inner padding around the card content
  radius: 32, // corner radius of the image frame
} as const;

/** Fraction of the card's height the captured galaxy occupies (top band). */
export const IMAGE_HEIGHT_RATIO = 0.62;

/** Fraction of the card below the image reserved for the branded footer. */
export const FOOTER_HEIGHT_RATIO = 1 - IMAGE_HEIGHT_RATIO;

/** Deep-cosmos base used for the card background when the capture is blank. */
export const CARD_BG = "#05010f";

/** A soft violet→cyan radial that sits behind the captured galaxy. */
export const CARD_GLOW_TOP = "rgba(124,58,237,0.35)";
export const CARD_GLOW_BOTTOM = "rgba(20,6,48,0.9)";

/** The brand mark + product name shown in the footer. */
export const BRAND_NAME = "Pinwheel Galaxy";

/** The caption line shown under the brand mark (e.g. "Aurora · 5 arms"). */
export const CAPTION_LABEL = "Shareable print";

/** The placeholder a blank galaxy is described as. */
export const DEFAULT_GALAXY_LABEL = "Your galaxy";

/** A rectangle produced by a fit computation. */
export interface FitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fit `sourceW×sourceH` into `areaW×areaH` using *cover* (fill the area,
 * cropping the overflow). Returns the destination rectangle in area space.
 *
 * This is exactly how a captured, arbitrary-aspect galaxy frame is placed into
 * the card's fixed image window — always full-bleed, never letterboxed.
 */
export function computeCover(
  sourceW: number,
  sourceH: number,
  areaW: number,
  areaH: number,
): FitRect {
  if (sourceW <= 0 || sourceH <= 0 || areaW <= 0 || areaH <= 0) {
    return { x: 0, y: 0, w: areaW, h: areaH };
  }
  const sourceRatio = sourceW / sourceH;
  const areaRatio = areaW / areaH;
  let w: number;
  let h: number;
  if (sourceRatio > areaRatio) {
    // Source is relatively wider → match height, crop the sides.
    h = areaH;
    w = areaH * sourceRatio;
  } else {
    // Source is relatively taller → match width, crop the top/bottom.
    w = areaW;
    h = areaW / sourceRatio;
  }
  return { x: (areaW - w) / 2, y: (areaH - h) / 2, w, h };
}

/**
 * Word-wrap `text` to fit `maxWidth` given a `measure(text) => pixels` function.
 * Splits on spaces, keeps any single over-long token on its own line, and
 * never throws on empty input. Kept free of canvas deps so it is testable.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = measure(candidate);
    if (current && width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * The image window (in card pixels): an inset, rounded rectangle whose height
 * is `IMAGE_HEIGHT_RATIO` of the card. Everything the component draws —
 * background glow, the captured galaxy, the frame border — is laid out from
 * this, so the geometry is single-sourced and tested.
 */
export function imageWindow(): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const margin = CARD.margin;
  return {
    x: margin,
    y: margin,
    w: CARD.w - margin * 2,
    h: Math.floor(CARD.h * IMAGE_HEIGHT_RATIO) - margin * 2,
  };
}

/**
 * Build the shareable deep link for a galaxy from its URL search params. Only
 * the config + active layer toggles are needed — a plain galaxy yields the
 * bare origin, so the link stays tidy.
 */
export function deepLink(origin: string, pathname: string, search: string): string {
  const base = `${origin}${pathname}`;
  return search ? `${base}?${search}` : base;
}

/**
 * A short, human-readable label for the galaxy on the print, e.g.
 * "Aurora · 5 arms · Nebula, Comet". Empty layers/config fall back cleanly.
 */
export function describePrint(
  configLabel: string,
  recipeLabel: string,
): string {
  const parts = [configLabel, recipeLabel].filter(
    (s) => s && s !== DEFAULT_GALAXY_LABEL && s !== "Default galaxy",
  );
  return parts.length ? parts.join(" · ") : DEFAULT_GALAXY_LABEL;
}
