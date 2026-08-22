import test from "node:test";
import assert from "node:assert/strict";
import {
  DEPTH_MIN,
  DEPTH_MAX,
  depthForIndex,
  parallaxFor,
  twinkleAlpha,
  depthScale,
  twinklePhase,
} from "./starDepth";

test("depthForIndex stays inside the supported range", () => {
  for (let i = 0; i < 64; i++) {
    const d = depthForIndex(i, 320, 7);
    assert.ok(d >= DEPTH_MIN - 1e-9 && d <= DEPTH_MAX + 1e-9, `depth ${d} out of range`);
  }
});

test("depthForIndex is deterministic for a given index/seed", () => {
  assert.equal(depthForIndex(3, 320, 7), depthForIndex(3, 320, 7));
});

test("depthForIndex spreads stars across the range (not all equal)", () => {
  const values = new Set(Array.from({ length: 32 }, (_, i) => depthForIndex(i, 320, 7)));
  // A real spread yields many distinct values, not a single constant.
  assert.ok(values.size > 16, `expected a spread, got ${values.size} distinct`);
});

test("parallaxFor scales with depth and follows the base offset direction", () => {
  const near = parallaxFor(1, 10, -20);
  const far = parallaxFor(0.2, 10, -20);
  // The offset is the base cursor offset scaled by depth.
  assert.equal(near.x, 10);
  assert.equal(near.y, -20);
  assert.equal(far.x, 2);
  assert.ok(near.x > far.x, "nearer star must shift more");
});

test("parallaxFor is zero when the cursor is centred", () => {
  assert.deepEqual(parallaxFor(0.5, 0, 0), { x: 0, y: 0 });
});

test("twinkleAlpha oscillates and stays bounded", () => {
  let min = Infinity;
  let max = -Infinity;
  for (let t = 0; t < 100; t++) {
    const a = twinkleAlpha(0.3, t / 10, 1);
    min = Math.min(min, a);
    max = Math.max(max, a);
  }
  assert.ok(min > 0.05, `min ${min} too low`);
  assert.ok(max <= 1.1 + 1e-9, `max ${max} too high`);
});

test("twinkleAlpha oscillates harder for nearer stars", () => {
  // The *average* brightness is the same for every depth; what differs is the
  // swing. Near stars twinkle with a larger peak-to-trough amplitude.
  const swing = (depth: number) => {
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < 200; t++) {
      const a = twinkleAlpha(0.37, t / 20, depth);
      min = Math.min(min, a);
      max = Math.max(max, a);
    }
    return max - min;
  };
  assert.ok(swing(1) > swing(0.2), `near swing ${swing(1)} should exceed far swing ${swing(0.2)}`);
});

test("twinklePhase staggers stars", () => {
  const phases = new Set(Array.from({ length: 32 }, (_, i) => twinklePhase(i, 320, 7)));
  assert.ok(phases.size > 16, `expected staggered phases, got ${phases.size}`);
});

test("depthScale maps depth into a sensible size/alpha multiplier", () => {
  assert.equal(depthScale(1), 1);
  assert.equal(depthScale(0), 0.6);
  assert.ok(depthScale(1) > depthScale(0), "nearer stars should be larger");
});
