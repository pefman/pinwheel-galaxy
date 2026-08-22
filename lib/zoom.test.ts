import test from "node:test";
import assert from "node:assert/strict";
import {
  ZOOM_DEFAULT,
  ZOOM_MIN,
  ZOOM_MAX,
  clampZoom,
  easeZoom,
  screenSizeScale,
  wheelDeltaToMultiplier,
  applyZoomMultiplier,
  paramsToZoom,
  zoomToParams,
} from "./zoom";

test("clampZoom keeps values inside the supported range", () => {
  assert.equal(clampZoom(0.1), ZOOM_MIN);
  assert.equal(clampZoom(9), ZOOM_MAX);
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(1.375), 1.375);
});

test("clampZoom rejects NaN and folds ±Infinity onto the bounds", () => {
  assert.equal(clampZoom(Number.NaN), ZOOM_DEFAULT);
  assert.equal(clampZoom(Number.POSITIVE_INFINITY), ZOOM_MAX);
  assert.equal(clampZoom(Number.NEGATIVE_INFINITY), ZOOM_MIN);
});

test("wheel up (negative delta) zooms in, wheel down zooms out", () => {
  const up = wheelDeltaToMultiplier(-100);
  const down = wheelDeltaToMultiplier(100);
  assert.ok(up > 1, `expected zoom-in multiplier, got ${up}`);
  assert.ok(down < 1, `expected zoom-out multiplier, got ${down}`);
  // Symmetric magnitudes are inverse of one another.
  assert.ok(Math.abs(up * down - 1) < 1e-9);
});

test("applyZoomMultiplier clamps its result", () => {
  assert.equal(applyZoomMultiplier(2.5, 2), ZOOM_MAX);
  assert.equal(applyZoomMultiplier(0.6, 0.1), ZOOM_MIN);
  assert.ok(applyZoomMultiplier(1, 1.5) > 1 && applyZoomMultiplier(1, 1.5) <= ZOOM_MAX);
});

test("easeZoom converges toward the target and never leaves range", () => {
  let z = ZOOM_MIN;
  for (let i = 0; i < 120; i++) {
    z = easeZoom(z, ZOOM_MAX, 0.18);
    assert.ok(z >= ZOOM_MIN - 1e-9 && z <= ZOOM_MAX + 1e-9);
  }
  assert.ok(Math.abs(z - ZOOM_MAX) < 1e-6, `expected ~${ZOOM_MAX}, got ${z}`);
});

test("easeZoom snaps when already near the target", () => {
  const z = easeZoom(1.00001, 1, 0.18);
  assert.equal(z, 1);
});

test("screenSizeScale is the inverse of zoom (constant on-screen size)", () => {
  assert.equal(screenSizeScale(1), 1);
  assert.equal(screenSizeScale(2), 0.5);
  assert.equal(screenSizeScale(0.5), 2);
  assert.ok(screenSizeScale(2) * 2 === 1);
});

test("paramsToZoom rejects junk and clamps valid values", () => {
  assert.equal(paramsToZoom(null), null);
  assert.equal(paramsToZoom("abc"), null);
  assert.equal(paramsToZoom("0"), ZOOM_MIN);
  assert.equal(paramsToZoom("9"), ZOOM_MAX);
  assert.equal(paramsToZoom("1.5"), 1.5);
});

test("zoomToParams serialises to two decimals", () => {
  const s = zoomToParams(1.23456).get("z");
  assert.equal(s, "1.23");
});

test("zoom round-trips through the URL (to its 2-decimal form)", () => {
  for (const z of [0.6, 1, 1.375, 2.5, 9]) {
    const s = zoomToParams(z).get("z");
    // Serialising loses sub-centimetre precision, so the parsed value must
    // come back exactly as the string we wrote.
    assert.equal(paramsToZoom(s), Number(s), `failed for ${z}`);
  }
});
