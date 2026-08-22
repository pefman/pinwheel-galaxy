import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCover,
  wrapText,
  deepLink,
  describePrint,
  imageWindow,
  CARD,
  IMAGE_HEIGHT_RATIO,
} from "./exportCard";

test("computeCover fills the area, cropping the wider source", () => {
  // Source 2000×1000 (2:1) into a 100×100 square area → height-matched, sides
  // cropped.
  const fit = computeCover(2000, 1000, 100, 100);
  assert.equal(fit.h, 100);
  assert.equal(fit.w, 200);
  assert.equal(fit.x, -50, "centred so the overflow is cropped on both sides");
  assert.equal(fit.y, 0);
});

test("computeCover fills the area, cropping the taller source", () => {
  // Source 1000×2000 (1:2) into a 100×100 square → width-matched, cropped top.
  const fit = computeCover(1000, 2000, 100, 100);
  assert.equal(fit.w, 100);
  assert.equal(fit.h, 200);
  assert.equal(fit.y, -50);
  assert.equal(fit.x, 0);
});

test("computeCover keeps a matching-aspect source unchanged", () => {
  const fit = computeCover(1600, 900, 640, 360);
  assert.equal(fit.w, 640);
  assert.equal(fit.h, 360);
  assert.equal(fit.x, 0);
  assert.equal(fit.y, 0);
});

test("computeCover is safe on non-positive inputs", () => {
  const fit = computeCover(0, 0, 100, 100);
  assert.deepEqual(fit, { x: 0, y: 0, w: 100, h: 100 });
});

test("wrapText splits on spaces and respects the width", () => {
  // A fake measurer that assumes ~7px per character.
  const measure = (s: string) => s.length * 7;
  const lines = wrapText("the quick brown fox jumps", 100, measure);
  // 105px > 100px, so it breaks on a space boundary as it grows.
  assert.deepEqual(lines, ["the quick", "brown fox", "jumps"]);
});

test("wrapText handles a single over-long token without wrapping mid-word", () => {
  const measure = (s: string) => s.length * 7;
  const lines = wrapText("supercalifragilistic", 50, measure);
  assert.deepEqual(lines, ["supercalifragilistic"]);
});

test("wrapText returns nothing for empty input", () => {
  const measure = () => 0;
  assert.deepEqual(wrapText("   ", 100, measure), []);
  assert.deepEqual(wrapText("", 100, measure), []);
});

test("deepLink appends the query only when present", () => {
  assert.equal(
    deepLink("https://pinwheel-galaxy.vercel.app", "/", ""),
    "https://pinwheel-galaxy.vercel.app/",
  );
  assert.equal(
    deepLink("https://example.com", "/play", "theme=aurora&arms=5"),
    "https://example.com/play?theme=aurora&arms=5",
  );
});

test("describePrint joins config + recipe and drops empty labels", () => {
  assert.equal(
    describePrint("Aurora", "Nebula, Comet"),
    "Aurora · Nebula, Comet",
  );
  assert.equal(describePrint("Default galaxy", ""), "Your galaxy");
  assert.equal(describePrint("", "Default galaxy"), "Your galaxy");
});

test("imageWindow is inset and matches the configured ratio", () => {
  const win = imageWindow();
  assert.equal(win.x, CARD.margin);
  assert.equal(win.y, CARD.margin);
  assert.equal(win.w, CARD.w - CARD.margin * 2);
  const expectedH = Math.floor(CARD.h * IMAGE_HEIGHT_RATIO) - CARD.margin * 2;
  assert.equal(win.h, expectedH);
});
