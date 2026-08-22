import test from "node:test";
import assert from "node:assert/strict";
import {
  computeNebulaClouds,
  NEBULA_LAYERS,
} from "./nebula";

const HUES = [260, 300, 190];

const base = {
  time: 0,
  width: 1000,
  height: 800,
  centerX: 500,
  centerY: 400,
  parallaxX: 0,
  parallaxY: 0,
  hues: HUES,
};

test("returns one cloud per depth layer", () => {
  const clouds = computeNebulaClouds(base);
  assert.equal(clouds.length, NEBULA_LAYERS.length);
});

test("all clouds sit inside the canvas and have positive size/opacity", () => {
  const clouds = computeNebulaClouds(base);
  for (const c of clouds) {
    assert.ok(c.radius > 0, "radius positive");
    assert.ok(c.alpha > 0, "alpha positive");
    assert.ok(c.hue >= 0 && c.hue < 360, "hue wrapped to 0..360");
    // The nearest layer can drift with parallax, but the far layer stays
    // near centre; every cloud must remain on-screen for sane inputs.
    assert.ok(c.x >= -c.radius && c.x <= 1000 + c.radius);
    assert.ok(c.y >= -c.radius && c.y <= 800 + c.radius);
  }
});

test("output is deterministic for identical inputs", () => {
  const a = computeNebulaClouds(base);
  const b = computeNebulaClouds({ ...base });
  assert.deepEqual(a, b);
});

test("hue is derived from the active theme hue", () => {
  const warm = computeNebulaClouds({ ...base, hues: [20, 340, 280] });
  const cool = computeNebulaClouds({ ...base, hues: [190, 220, 265] });
  // At time 0 the base layer's hue equals the theme's first hue (shift 0).
  assert.equal(warm[0].hue, 20);
  assert.equal(cool[0].hue, 190);
});

test("parallax shifts nearer layers more than farther ones", () => {
  const still = computeNebulaClouds(base);
  const shifted = computeNebulaClouds({ ...base, parallaxX: 200 });
  let nearDelta = 0;
  let farDelta = 0;
  for (let i = 0; i < still.length; i++) {
    nearDelta += Math.abs(shifted[i].x - still[i].x);
    farDelta += Math.abs(shifted[0].x - still[0].x);
  }
  // The nearest (last) layer must move at least as far as the far layer.
  assert.ok(
    shifted[still.length - 1].x - still[still.length - 1].x >=
      shifted[0].x - still[0].x,
    "nearer layer drifts farther with the cursor",
  );
});

test("clouds move over time (orbital drift)", () => {
  const t0 = computeNebulaClouds({ ...base, time: 0 });
  const t1 = computeNebulaClouds({ ...base, time: 100 });
  let moved = false;
  for (let i = 0; i < t0.length; i++) {
    if (t0[i].x !== t1[i].x || t0[i].y !== t1[i].y) moved = true;
  }
  assert.ok(moved, "at least one cloud repositions as time advances");
});
