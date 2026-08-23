import test from "node:test";
import assert from "node:assert/strict";
import {
  BLACK_HOLE_SEED,
  BLACK_HOLE_RADIUS_FRACTION,
  BLACK_HOLE_RADIUS_MIN,
  BLACK_HOLE_RADIUS_MAX,
  ACCRETION_PARTICLES,
  DISK_INNER_FRACTION,
  DISK_OUTER_FRACTION,
  computeBlackHole,
  accretionPoint,
  dopplerFactor,
  deflectionMagnification,
  einsteinRadius,
  isInsideEventHorizon,
  dopplerHue,
  type BlackHoleState,
} from "./blackHole";

const WIDTH = 1200;
const HEIGHT = 900;

test("computeBlackHole is deterministic for a given size/seed", () => {
  const a = computeBlackHole({ width: WIDTH, height: HEIGHT, seed: BLACK_HOLE_SEED });
  const b = computeBlackHole({ width: WIDTH, height: HEIGHT, seed: BLACK_HOLE_SEED });
  assert.deepEqual(a, b);
});

test("the hole keeps its shape across a resize of the same size", () => {
  const a = computeBlackHole({ width: WIDTH, height: HEIGHT });
  const b = computeBlackHole({ width: WIDTH, height: HEIGHT });
  assert.equal(a.x, b.x);
  assert.equal(a.y, b.y);
  assert.equal(a.radius, b.radius);
});

test("produces the requested particle count with valid radii", () => {
  const hole: BlackHoleState = computeBlackHole({ width: WIDTH, height: HEIGHT });
  assert.equal(hole.particles.length, ACCRETION_PARTICLES);
  for (const p of hole.particles) {
    assert.ok(p.radiusFrac >= DISK_INNER_FRACTION - 1e-6, `inner ${p.radiusFrac}`);
    assert.ok(p.radiusFrac <= DISK_OUTER_FRACTION + 1e-6, `outer ${p.radiusFrac}`);
    assert.ok(p.brightness >= 0.01 && p.brightness <= 1.005, `brightness ${p.brightness}`);
    assert.ok(p.speed > 0, `speed ${p.speed}`);
  }
});

test("inner particles orbit faster than outer ones (Keplerian)", () => {
  const hole = computeBlackHole({ width: WIDTH, height: HEIGHT });
  const inner = hole.particles.find((p) => p.radiusFrac < DISK_INNER_FRACTION + 0.2)!;
  const outer = hole.particles.find((p) => p.radiusFrac > DISK_OUTER_FRACTION - 0.3)!;
  assert.ok(inner.speed > outer.speed, `${inner.speed} > ${outer.speed}`);
});

test("the radius is a stable fraction of the sky and clamps at the bounds", () => {
  const small = computeBlackHole({ width: 200, height: 200 });
  const big = computeBlackHole({ width: 4000, height: 4000 });
  assert.equal(small.radius, BLACK_HOLE_RADIUS_MIN);
  assert.equal(big.radius, BLACK_HOLE_RADIUS_MAX);
  const mid = computeBlackHole({ width: WIDTH, height: HEIGHT });
  assert.ok(Math.abs(mid.radius - Math.min(WIDTH, HEIGHT) * BLACK_HOLE_RADIUS_FRACTION) < 1, `radius ${mid.radius}`);
});

test("the hole is placed off-centre and padded from the edges", () => {
  for (let i = 0; i < 40; i++) {
    const hole = computeBlackHole({ width: WIDTH, height: HEIGHT, seed: i });
    const margin = 40;
    // Never near the centre (the interactive galaxy owns it).
    const dx = (hole.x - WIDTH / 2) / WIDTH;
    const dy = (hole.y - HEIGHT / 2) / HEIGHT;
    assert.ok(Math.hypot(dx, dy) > 0.18, `off-centre for seed ${i}`);
    assert.ok(hole.x >= margin + hole.radius, `x padded left seed ${i}`);
    assert.ok(hole.x <= WIDTH - margin - hole.radius, `x padded right seed ${i}`);
    assert.ok(hole.y >= margin + hole.radius, `y padded top seed ${i}`);
    assert.ok(hole.y <= HEIGHT - margin - hole.radius, `y padded bottom seed ${i}`);
  }
});

test("accretionPoint projects onto the tilted disk at the right radius", () => {
  const hole = computeBlackHole({ width: WIDTH, height: HEIGHT });
  const p = hole.particles[0];
  const base = accretionPoint(p, 0, 0, 0, hole.tilt, hole.radius);
  // At zero spin the projected radius is the orbit radius compressed by cos(tilt).
  const orbitR = p.radiusFrac * hole.radius;
  const projR = Math.hypot(base.x, base.y);
  assert.ok(projR >= orbitR * Math.cos(hole.tilt) - 1 && projR <= orbitR + 1, `projR ${projR}`);
});

test("the disk spins: a particle sweeps around the centre as spin grows", () => {
  const hole = computeBlackHole({ width: WIDTH, height: HEIGHT });
  const p = hole.particles[0];
  const a0 = accretionPoint(p, 0, 0, 0, hole.tilt, hole.radius);
  const a1 = accretionPoint(p, 0, 0, Math.PI, hole.tilt, hole.radius);
  // A half-turn flips the sign of the in-plane position.
  assert.ok(Math.abs(a0.x + a1.x) < 20 && Math.abs(a0.y + a1.y) < 20, `spin flips ${a0} ${a1}`);
});

test("dopplerFactor ranges −1..1 and peaks on the approaching side", () => {
  const dir = 0; // viewer along +x
  let min = 1;
  let max = -1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 64) {
    const f = dopplerFactor(angle, 0, dir);
    min = Math.min(min, f);
    max = Math.max(max, f);
  }
  assert.ok(min > -1.001 && max < 1.001, `range ${min}..${max}`);
  // A particle is blueshifted (+1) when its tangential velocity points at the
  // viewer (angle = dir − π/2) and redshifted (−1) when it recedes.
  assert.ok(dopplerFactor(-Math.PI / 2, 0, dir) > 0.9, `approaching blueshift`);
  assert.ok(dopplerFactor(Math.PI / 2, 0, dir) < -0.9, `receding redshift`);
});

test("deflectionMagnification is zero inside the horizon and ≥1 outside", () => {
  const R = 50;
  assert.equal(deflectionMagnification(R * 0.5, R), 0); // behind the horizon
  assert.ok(deflectionMagnification(R * 1.0001, R) >= 1); // just outside
  const far = deflectionMagnification(R * 8, R);
  assert.ok(far >= 1 && far < 1.2, `far-field near-1, got ${far}`);
  // There is a brightening bump above 1 somewhere near the Einstein ring.
  let bumped = false;
  for (let u = 1.01; u < 4; u += 0.01) {
    if (deflectionMagnification(R * u, R) > 1.05) bumped = true;
  }
  assert.ok(bumped, "a lensing brightening bump exists near the Einstein ring");
});

test("einsteinRadius scales linearly with the event horizon", () => {
  assert.equal(einsteinRadius(50), 50 * 1.9);
  assert.equal(einsteinRadius(0), 0);
});

test("isInsideEventHorizon matches the disc test", () => {
  const R = 40;
  assert.equal(isInsideEventHorizon(0, 0, 0, 0, R), true);
  assert.equal(isInsideEventHorizon(R * 0.9, 0, 0, 0, R), true);
  assert.equal(isInsideEventHorizon(R * 1.1, 0, 0, 0, R), false);
});

test("dopplerHue shifts hue opposite signs in the right direction", () => {
  const base = 40;
  // Blueshift (factor +1) cools toward cyan (lower hue); redshift warms up.
  assert.ok(dopplerHue(base, 1) < base, `blueshift cools: ${dopplerHue(base, 1)}`);
  assert.ok(dopplerHue(base, -1) > base, `redshift warms: ${dopplerHue(base, -1)}`);
});
