import test from "node:test";
import assert from "node:assert/strict";
import {
  MOON_SEED,
  MOON_TRANSIT_MS,
  MOON_MONTH_MS,
  MOON_RADIUS_FRACTION,
  MOON_RADIUS_MIN,
  MOON_RADIUS_MAX,
  MOON_CRATERS,
  computeMoon,
  describeMoonPhase,
  terminatorXRadius,
  type MoonState,
} from "./moon";

const WIDTH = 1200;
const HEIGHT = 900;

test("computeMoon is deterministic for a given time/size/seed", () => {
  const a = computeMoon({ time: 12345, width: WIDTH, height: HEIGHT, seed: MOON_SEED });
  const b = computeMoon({ time: 12345, width: WIDTH, height: HEIGHT, seed: MOON_SEED });
  assert.deepEqual(a, b);
});

test("computeMoon produces the requested crater count", () => {
  const moon = computeMoon({ time: 0, width: WIDTH, height: HEIGHT });
  assert.equal(moon.craters.length, MOON_CRATERS);
});

test("the moon stays inside the sky as it drifts across the arc", () => {
  const margin = 32;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const moon = computeMoon({ time: t * MOON_TRANSIT_MS, width: WIDTH, height: HEIGHT });
    assert.ok(moon.x >= margin - 2, `x ${moon.x} inside left margin`);
    assert.ok(moon.x <= WIDTH - margin + 2, `x ${moon.x} inside right margin`);
    assert.ok(moon.y >= -moon.radius, `y ${moon.y} above sky`);
    assert.ok(moon.y <= HEIGHT + moon.radius, `y ${moon.y} below sky`);
  }
});

test("the radius is a stable fraction of the sky and clamps at the bounds", () => {
  const small = computeMoon({ time: 0, width: 200, height: 200 });
  const big = computeMoon({ time: 0, width: 4000, height: 4000 });
  assert.equal(small.radius, MOON_RADIUS_MIN);
  assert.equal(big.radius, MOON_RADIUS_MAX);
  const mid = computeMoon({ time: 0, width: WIDTH, height: HEIGHT });
  assert.ok(Math.abs(mid.radius - HEIGHT * MOON_RADIUS_FRACTION) < 1, `radius ${mid.radius}`);
});

test("litFraction sweeps the full 0..1 range over a month and is in range always", () => {
  let min = 1;
  let max = 0;
  for (let t = 0; t < MOON_MONTH_MS; t += MOON_MONTH_MS / 200) {
    const f = computeMoon({ time: t, width: WIDTH, height: HEIGHT }).litFraction;
    min = Math.min(min, f);
    max = Math.max(max, f);
  }
  assert.ok(min < 0.1, `reaches new moon (min ${min})`);
  assert.ok(max > 0.9, `reaches full moon (max ${max})`);
});

test("litSide flips between waxing (right) and waning (left) across the month", () => {
  const early = computeMoon({ time: MOON_MONTH_MS * 0.25, width: WIDTH, height: HEIGHT }).litSide;
  const late = computeMoon({ time: MOON_MONTH_MS * 0.75, width: WIDTH, height: HEIGHT }).litSide;
  assert.equal(early, -1, "first half wanes (left-lit)");
  assert.equal(late, 1, "second half waxes (right-lit)");
});

test("craters never sit past the moon's limb", () => {
  const moon = computeMoon({ time: 0, width: WIDTH, height: HEIGHT });
  for (const c of moon.craters) {
    assert.ok(Math.hypot(c.dx, c.dy) <= 1, `crater ${c.dx},${c.dy} inside disc`);
    assert.ok(c.r > 0 && c.r < 0.3, `crater radius ${c.r} sane`);
    assert.ok(c.a >= 0 && c.a < 0.2, `crater alpha ${c.a} subtle`);
  }
});

test("terminatorXRadius is a true half-ellipse: 0 at quarter, ±radius at full/new", () => {
  const r = 50;
  assert.ok(Math.abs(terminatorXRadius(r, 0.5)) < 1e-9, "quarter → straight terminator");
  assert.ok(Math.abs(terminatorXRadius(r, 1) + r) < 1e-9, "full → terminator at -r");
  assert.ok(Math.abs(terminatorXRadius(r, 0) - r) < 1e-9, "new → terminator at +r");
  // Monotone between new and quarter.
  const a = terminatorXRadius(r, 0.25);
  const b = terminatorXRadius(r, 0.4);
  assert.ok(a > b && a > 0, "crescent terminator bulges toward +x");
});

test("describeMoonPhase labels the canonical phases", () => {
  assert.equal(describeMoonPhase(1), "Full");
  assert.equal(describeMoonPhase(0), "New");
  assert.equal(describeMoonPhase(0.85), "Waxing Gibbous");
  assert.equal(describeMoonPhase(0.6), "Quarter");
  assert.equal(describeMoonPhase(0.3), "Waxing Crescent");
  // Clamps out-of-range input.
  assert.equal(describeMoonPhase(-5), "New");
  assert.equal(describeMoonPhase(9), "Full");
});

test("a moon state can be produced across a full transit sweep without throwing", () => {
  const moon: MoonState = computeMoon({ time: 0, width: WIDTH, height: HEIGHT });
  for (let t = 0; t < 30; t += 0.5) {
    const m = computeMoon({ time: t * 1000, width: WIDTH, height: HEIGHT });
    assert.equal(m.craters.length, moon.craters.length);
    // The terminator radius stays within the disk.
    assert.ok(Math.abs(terminatorXRadius(m.radius, m.litFraction)) <= m.radius + 1e-6);
  }
});
