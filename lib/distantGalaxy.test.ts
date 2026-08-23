import test from "node:test";
import assert from "node:assert/strict";
import {
  DISTANT_GALAXY_SEED,
  TURNS,
  ARM_INNER,
  ARM_SAMPLES,
  BULGE_STARS,
  computeDistantGalaxy,
  buildDistantGalaxyField,
  armPoint,
  distantGalaxyStarCount,
  describeDistantGalaxy,
} from "./distantGalaxy";

const WIDTH = 1200;
const HEIGHT = 900;

test("computeDistantGalaxy is deterministic for a given size/seed", () => {
  const a = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed: DISTANT_GALAXY_SEED });
  const b = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed: DISTANT_GALAXY_SEED });
  assert.deepEqual(a, b);
});

test("a different seed yields a different galaxy (arm count, tilt or placement)", () => {
  const a = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed: DISTANT_GALAXY_SEED });
  const b = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed: DISTANT_GALAXY_SEED ^ 0x99 });
  const differs =
    a.arms !== b.arms ||
    Math.abs(a.tilt - b.tilt) > 1e-6 ||
    Math.abs(a.angle - b.angle) > 1e-6 ||
    a.stars.length !== b.stars.length ||
    a.stars.some((s, i) => s.dx !== b.stars[i].dx || s.dy !== b.stars[i].dy);
  assert.ok(differs, "a different seed should produce a different galaxy");
});

test("the galaxy stays inside the sky and clear of the centre galaxy", () => {
  const edge = 46;
  const guard = Math.min(WIDTH, HEIGHT) * 0.17;
  for (let seed = 1; seed <= 40; seed++) {
    const g = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed });
    assert.ok(g.x >= edge - 1 && g.x <= WIDTH - edge + 1, `x ${g.x} inside edges`);
    assert.ok(g.y >= edge - 1 && g.y <= HEIGHT - edge + 1, `y ${g.y} inside edges`);
    assert.ok(
      Math.hypot(g.x - WIDTH / 2, g.y - HEIGHT / 2) >= guard - 1,
      `center ${g.x},${g.y} clear of the interactive galaxy`,
    );
  }
});

test("the radius is a small, distant fraction of the sky", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed });
    const diag = Math.hypot(WIDTH, HEIGHT);
    assert.ok(g.radius >= diag * 0.10, `radius ${g.radius} not too small`);
    assert.ok(g.radius <= diag * 0.20, `radius ${g.radius} not too large`);
  }
});

test("arm count and tilt stay in their valid ranges", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = computeDistantGalaxy({ width: WIDTH, height: HEIGHT, seed });
    assert.ok(g.arms >= 2 && g.arms <= 5, `arms ${g.arms} in 2…5`);
    assert.ok(g.tilt >= 0 && g.tilt <= 0.75 + 1e-6, `tilt ${g.tilt} in 0…0.75`);
  }
});

test("the field has exactly arms·samples + bulge stars", () => {
  for (let arms = 2; arms <= 5; arms++) {
    const field = buildDistantGalaxyField({ arms, radius: 200, seed: arms });
    assert.equal(field.length, arms * ARM_SAMPLES + BULGE_STARS);
    assert.equal(distantGalaxyStarCount(arms), arms * ARM_SAMPLES + BULGE_STARS);
  }
});

test("arm stars reach the outer edge and start near the bulge core", () => {
  const radius = 200;
  const field = buildDistantGalaxyField({ arms: 4, radius, seed: 1 });
  // A representative arm star near u=1 should sit close to the outer radius;
  // the nearest star to the edge defines how far the arms reach.
  let nearestToEdge = Infinity;
  for (const s of field) {
    const d = Math.hypot(s.dx, s.dy);
    nearestToEdge = Math.min(nearestToEdge, Math.abs(d - radius));
  }
  assert.ok(nearestToEdge < radius * 0.25, `arms reach near the edge (closest ${nearestToEdge})`);
  // And some stars sit deep in the bulge core.
  const deepest = Math.max(...field.map((s) => Math.hypot(s.dx, s.dy)));
  assert.ok(deepest > radius * ARM_INNER * 1.5, "some stars reach the bulge region");
});

test("armPoint follows the ideal logarithmic spiral line when un-jittered", () => {
  const radius = 300;
  const width = 1200;
  const height = 900;
  const armOffset = 1.0;
  // u = 0 ⇒ near the inner bulge; u = 1 ⇒ at (turns) full wind and outer radius.
  const inner = 0.12;
  const u0 = armPoint({ armOffset, u: 0, radius, turns: TURNS, inner, width: 0 });
  const r0 = radius * inner;
  assert.ok(Math.hypot(u0.x, u0.y) <= inner * radius * 1.01, `u=0 sits near the bulge core`);
  const u1 = armPoint({ armOffset, u: 1, radius, turns: TURNS, inner, width: 0 });
  const expectedR = radius * (inner + (1 - inner) * 1);
  assert.ok(Math.abs(Math.hypot(u1.x, u1.y) - expectedR) < 1e-6, `u=1 sits at the outer radius`);
  // Normalise both angles to [0, 2π) and compare — robust to full-turn winding.
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const expectedAngle = norm(armOffset + TURNS * Math.PI * 2);
  const actualAngle = norm(Math.atan2(u1.y, u1.x));
  const diff = Math.abs(expectedAngle - actualAngle);
  assert.ok(diff < 1e-6, `u=1 angle matches the winding (${expectedAngle} vs ${actualAngle})`);
});

test("armPoint scatter stays within the configured width band", () => {
  const radius = 300;
  const width = 0.3;
  const rng = () => 1; // worst-case corner of the scatter box
  const p = armPoint({ armOffset: 0, u: 0.5, radius, turns: TURNS, inner: ARM_INNER, width, rng });
  // At u=0.5 the ideal radius is r; the scatter can add up to ~width·radius
  // along each axis, so the point must stay inside a bounded box around it.
  const rIdeal = radius * (ARM_INNER + (1 - ARM_INNER) * 0.5);
  const idealAngle = 0.5 * TURNS * Math.PI * 2;
  const cx = rIdeal * Math.cos(idealAngle);
  const cy = rIdeal * Math.sin(idealAngle);
  const band = width * radius;
  assert.ok(Math.abs(p.x - cx) <= band * 1.5 + 1e-6, "scatter along the arm is bounded");
  assert.ok(Math.abs(p.y - cy) <= band * 1.5 + 1e-6, "scatter across the arm is bounded");
});

test("describeDistantGalaxy returns a stable label", () => {
  assert.equal(describeDistantGalaxy(), "Distant Galaxy");
});
