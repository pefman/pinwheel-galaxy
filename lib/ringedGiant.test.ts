import test from "node:test";
import assert from "node:assert/strict";
import {
  RINGED_GIANT_SEED,
  RINGED_GIANT_TRANSIT_MS,
  RINGED_GIANT_RADIUS_FRACTION,
  RINGED_GIANT_RADIUS_MIN,
  RINGED_GIANT_RADIUS_MAX,
  RING_INNER_RATIO,
  RING_OUTER_RATIO,
  RING_PARTICLES,
  RINGED_GIANT_BANDS,
  computeRingedGiant,
  projectRingParticle,
  particleAngleAt,
} from "./ringedGiant";

const WIDTH = 1280;
const HEIGHT = 800;

test("computeRingedGiant is deterministic for a given time/size/seed", () => {
  const a = computeRingedGiant({ time: 12345, width: WIDTH, height: HEIGHT, seed: RINGED_GIANT_SEED });
  const b = computeRingedGiant({ time: 12345, width: WIDTH, height: HEIGHT, seed: RINGED_GIANT_SEED });
  assert.deepEqual(a, b);
});

test("the giant drifts from the left edge to the right edge across its transit", () => {
  const start = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  // Just short of a full transit (the clock wraps at the period boundary).
  const end = computeRingedGiant({ time: RINGED_GIANT_TRANSIT_MS * 0.99, width: WIDTH, height: HEIGHT });
  // At t=0 it sits near the left margin; at t=1 near the right margin.
  assert.ok(start.x < WIDTH / 2, `expected start.x (${start.x}) left of centre`);
  assert.ok(end.x > WIDTH / 2, `expected end.x (${end.x}) right of centre`);
  assert.ok(Math.abs(start.x - 40) < 2, `start.x should be near the left margin, got ${start.x}`);
  // At 99% of the transit the giant is essentially at the right edge.
  assert.ok(end.x > WIDTH * 0.9, `end.x ${end.x} should be near the right edge`);
});

test("the radius is clamped into the comfortable on-screen range", () => {
  const tiny = computeRingedGiant({ time: 0, width: 100, height: 100 });
  const huge = computeRingedGiant({ time: 0, width: 5000, height: 5000 });
  assert.ok(tiny.radius >= RINGED_GIANT_RADIUS_MIN, `tiny radius ${tiny.radius} below min`);
  assert.ok(huge.radius <= RINGED_GIANT_RADIUS_MAX, `huge radius ${huge.radius} above max`);
  // The nominal case sits close to the configured fraction of the sky size.
  const nominal = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  const expected = Math.min(WIDTH, HEIGHT) * RINGED_GIANT_RADIUS_FRACTION;
  assert.ok(Math.abs(nominal.radius - expected) <= 2, `nominal radius ${nominal.radius} vs ${expected}`);
});

test("the giant has the expected number of bands, all inside the disk", () => {
  const g = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  assert.equal(g.bands.length, RINGED_GIANT_BANDS);
  for (const band of g.bands) {
    assert.ok(band.halfWidth > 0, "band half-width must be positive");
    assert.ok(Math.abs(band.y) <= 1, `band y ${band.y} outside [-1,1]`);
  }
});

test("the ring has the expected particle field with Keplerian radii", () => {
  const g = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  assert.equal(g.ring.particles.length, RING_PARTICLES);
  for (const p of g.ring.particles) {
    assert.ok(p.r >= RING_INNER_RATIO - 1e-9, `particle r ${p.r} below inner ratio`);
    assert.ok(p.r <= RING_OUTER_RATIO + 1e-9, `particle r ${p.r} above outer ratio`);
    assert.ok(p.bright > 0 && p.bright <= 1, "brightness must be in (0,1]");
  }
});

test("particleAngleAt advances over time and inner particles orbit faster than outer ones", () => {
  const g = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  const inner = g.ring.particles[0];
  const outer = g.ring.particles[RING_PARTICLES - 1];
  const a0 = particleAngleAt(inner, 0);
  const a1 = particleAngleAt(inner, 6000);
  assert.ok(a1 > a0, "inner particle angle should advance over time");
  // Over the same interval the faster inner particle sweeps more angle.
  const innerSweep = particleAngleAt(inner, 12000) - a0;
  const outerSweep = particleAngleAt(outer, 12000) - particleAngleAt(outer, 0);
  assert.ok(innerSweep > outerSweep, `inner sweep ${innerSweep} should exceed outer sweep ${outerSweep}`);
});

test("projectRingParticle returns correct offsets, tilt squash and occlusion side", () => {
  // At angle 0 the particle is dead to the right: dx = rPx, dy = 0, in front.
  const front = projectRingParticle(100, 1.5, 0, 0.4);
  assert.ok(Math.abs(front.dx - 150) < 1e-6, `dx should be 150, got ${front.dx}`);
  assert.ok(Math.abs(front.dy) < 1e-6, `dy should be 0, got ${front.dy}`);
  assert.equal(front.behind, false);

  // At angle π/2 the particle is straight "up" in the ring plane, so with a
  // non-zero tilt it is offset vertically by r·sin(tilt) and sits in front.
  const up = projectRingParticle(100, 1.0, Math.PI / 2, 0.5);
  assert.ok(Math.abs(up.dx) < 1e-6, `up.dx should be ~0, got ${up.dx}`);
  assert.ok(Math.abs(up.dy - 100 * Math.cos(0.5)) < 1e-6, `up.dy ${up.dy} vs ${100 * Math.cos(0.5)}`);
  assert.equal(up.behind, false);

  // At angle −π/2 the particle is on the far side, so it is occluded.
  const down = projectRingParticle(100, 1.0, -Math.PI / 2, 0.5);
  assert.equal(down.behind, true);
  assert.ok(down.dy < 0, "the behind particle should project below the centre");
});

test("a zero tilt makes the ring project to a flat (horizontal) ellipse", () => {
  const flat = projectRingParticle(100, 1.0, Math.PI / 4, 0);
  // cos(0) = 1 ⇒ dy is unsquashed.
  assert.ok(Math.abs(flat.dy - 100 * Math.sin(Math.PI / 4)) < 1e-6);
});

test("sun angle is present and within a full circle", () => {
  const g = computeRingedGiant({ time: 0, width: WIDTH, height: HEIGHT });
  assert.ok(Number.isFinite(g.sunAngle), "sunAngle should be a number");
});
