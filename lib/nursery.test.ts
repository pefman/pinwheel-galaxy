import test from "node:test";
import assert from "node:assert/strict";
import {
  NURSERY_SEED,
  NURSERY_REGION_COUNT,
  NURSERY_CYCLE_MS,
  NURSERY_FLASH_AT,
  NURSERY_GLOW_QUIET,
  NURSERY_NEWBORN_REMNANT,
  NURSERY_SHELL_END,
  computeNursery,
  regionCycleU,
  nurseryPhaseAt,
  glowAlphaAt,
  birthFlashAt,
  shellAt,
  newbornAlphaAt,
  radiusScaleAt,
  describeNurseryPhase,
  type NurseryRegion,
} from "./nursery";

const W = 1280;
const H = 800;
const MAX_R = Math.min(W, H) * 0.46;

/** A synthetic region forced to a known cycle position u for unit checks. */
function regionAtU(u: number): NurseryRegion {
  return {
    index: 0,
    arm: 0,
    t: 0.5,
    jitter: 0,
    radiusFraction: 0.03,
    hue: 340,
    cycleOffset: u * NURSERY_CYCLE_MS,
    pulsePhase: 0,
    newborns: [{ ux: 0, uy: 0, size: 1 }],
  };
}

test("is deterministic: same inputs give identical regions", () => {
  const a = computeNursery({ time: 12345, width: W, height: H, arms: 2, galaxyAngle: 0.7 });
  const b = computeNursery({ time: 12345, width: W, height: H, arms: 2, galaxyAngle: 0.7 });
  assert.deepEqual(a, b);
});

test("returns exactly NURSERY_REGION_COUNT regions, all finite", () => {
  const regions = computeNursery({ time: 42, width: W, height: H, arms: 3, galaxyAngle: 1.1 });
  assert.equal(regions.length, NURSERY_REGION_COUNT);
  for (const r of regions) {
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
    assert.ok(r.radius > 0 && r.radius < Math.min(W, H));
    assert.ok(r.glowAlpha >= 0 && r.glowAlpha <= 1);
    assert.ok(r.birthFlash >= 0 && r.birthFlash <= 1);
    assert.ok(r.shellAlpha >= 0 && r.shellAlpha <= 1);
    assert.ok(r.newbornAlpha >= 0 && r.newbornAlpha <= 1);
    assert.ok(r.hue >= 328 && r.hue <= 354, "rosy hue band");
  }
});

test("knots ride the spiral arms: orbit radius matches the starfield arm math", () => {
  const cx = W / 2;
  const cy = H / 2;
  const regions = computeNursery({ time: 0, width: W, height: H, arms: 2, galaxyAngle: 0 });
  for (const r of regions) {
    const orbitR = Math.hypot(r.x - cx, r.y - cy);
    // t is clamped to [0.15, 0.95]; the arm radius formula gives ~0.29..0.92 of
    // maxR there (with the small angular jitter shifting distance slightly).
    assert.ok(orbitR > 0.2 * MAX_R, `knot ${r.index} too close to the core`);
    assert.ok(orbitR < 1.0 * MAX_R, `knot ${r.index} outside the disk`);
    // The angle must equal the arm math at this instant (galaxyAngle = 0).
    const armOffset = (r.arm / 2) * Math.PI * 2;
    const expected = Math.atan2(
      Math.sin(r.t * Math.PI * 2.2 + armOffset + r.jitter),
      Math.cos(r.t * Math.PI * 2.2 + armOffset + r.jitter),
    );
    const actual = Math.atan2(r.y - cy, r.x - cx);
    assert.ok(Math.abs(expected - actual) < 1e-9, "on the arm spiral");
  }
});

test("knots rotate with the galaxy angle", () => {
  const r0 = computeNursery({ time: 999, width: W, height: H, arms: 4, galaxyAngle: 0 })[0];
  const r1 = computeNursery({ time: 999, width: W, height: H, arms: 4, galaxyAngle: Math.PI })[0];
  const cx = W / 2;
  const cy = H / 2;
  assert.ok(Math.abs(r1.x - (2 * cx - r0.x)) < 1e-6, "x mirrored through centre");
  assert.ok(Math.abs(r1.y - (2 * cy - r0.y)) < 1e-6, "y mirrored through centre");
});

test("regions are desynchronised: not all in the same phase at once", () => {
  const regions = computeNursery({ time: 0, width: W, height: H, arms: 2, galaxyAngle: 0 });
  const phases = new Set(regions.map((r) => r.phase));
  assert.ok(phases.size >= 2, `expected several phases, got ${[...phases]}`);
});

test("a region visits every phase in order over one cycle", () => {
  const region = computeNursery({ time: 0, width: W, height: H, arms: 2, galaxyAngle: 0 })[0];
  const u0 = regionCycleU(region, 0);
  const order = ["forming", "birth", "active", "settling"];
  const seen: string[] = [];
  for (let i = 0; i < 200; i++) {
    const u = (i / 200 + u0) % 1;
    const phase = nurseryPhaseAt(u);
    if (seen[seen.length - 1] !== phase) seen.push(phase);
  }
  // The walk is a cyclic rotation of the canonical order covering all four
  // phases; a full-cycle walk ends back in the phase it started in.
  if (seen.length > 1 && seen[seen.length - 1] === seen[0]) seen.pop();
  assert.equal(seen.length, 4, `expected all four phases, got ${seen.join(" -> ")}`);
  const start = order.indexOf(seen[0]);
  for (let k = 0; k < 4; k++) {
    assert.equal(seen[k], order[(start + k) % 4], `phase order broken at step ${k}: ${seen.join(" -> ")}`);
  }
});

test("phase boundaries are exactly at the documented points", () => {
  assert.equal(nurseryPhaseAt(0), "forming");
  assert.equal(nurseryPhaseAt(0.16), "birth");
  assert.equal(nurseryPhaseAt(0.3), "active");
  assert.equal(nurseryPhaseAt(0.82), "settling");
  assert.equal(nurseryPhaseAt(0.999), "settling");
});

test("birth flash peaks at the flash instant and is ~0 far from it", () => {
  assert.ok(birthFlashAt(NURSERY_FLASH_AT) > 0.99, "peak is ~1");
  assert.ok(birthFlashAt(0) < 1e-6, "negligible at cycle start");
  assert.ok(birthFlashAt(0.5) < 1e-6, "negligible mid-cycle");
  assert.ok(birthFlashAt(0.99) < 1e-6, "negligible near the wrap");
  // Monotonic toward the peak.
  assert.ok(birthFlashAt(0.2) < birthFlashAt(NURSERY_FLASH_AT));
  assert.ok(birthFlashAt(0.24) < birthFlashAt(NURSERY_FLASH_AT));
});

test("glow alpha stays in [0,1], continuous at the wrap, and quiet at rest", () => {
  for (let i = 0; i < 1000; i++) {
    const u = i / 1000;
    const a = glowAlphaAt(u, 0.9);
    assert.ok(a >= 0 && a <= 1, `glow in range at u=${u}`);
  }
  assert.ok(glowAlphaAt(0, 0) === NURSERY_GLOW_QUIET, "starts quiet");
  const end = glowAlphaAt(0.999999, 0.9);
  assert.ok(Math.abs(end - NURSERY_GLOW_QUIET) < 0.01, "wraps back to quiet");
});

test("newborns appear only after the flash, hold, then fade to a remnant", () => {
  assert.equal(newbornAlphaAt(0), 0);
  assert.equal(newbornAlphaAt(NURSERY_FLASH_AT - 0.05), 0, "dark before ignition");
  assert.ok(newbornAlphaAt(NURSERY_FLASH_AT) > 0, "light is on as the flash peaks");
  assert.equal(newbornAlphaAt(0.5), 1, "fully visible while active");
  assert.ok(newbornAlphaAt(0.99) >= NURSERY_NEWBORN_REMNANT - 1e-9, "remnant lingers");
});

test("shock ring expands while fading and is absent outside its window", () => {
  const none = shellAt(0, 40);
  assert.equal(none.shellAlpha, 0);
  assert.equal(none.shellRadius, 0);
  const early = shellAt(NURSERY_FLASH_AT + 0.05, 40);
  const late = shellAt(NURSERY_FLASH_AT + 0.25, 40);
  assert.ok(early.shellRadius < late.shellRadius, "expands");
  assert.ok(early.shellAlpha > late.shellAlpha, "fades");
  assert.equal(shellAt(NURSERY_SHELL_END, 40).shellAlpha, 0, "gone by the window end");
});

test("knot radius swells through birth and is always positive and sane", () => {
  for (let i = 0; i < 100; i++) {
    const s = radiusScaleAt(i / 100);
    assert.ok(s > 0.4 && s < 1.2, `sane scale at u=${i / 100}`);
  }
  assert.ok(radiusScaleAt(0.22) > radiusScaleAt(0.02), "swells as it gathers");
});

test("regionCycleU is periodic, offsets desynchronise regions, and is in [0,1)", () => {
  const r = regionAtU(0.1);
  assert.ok(Math.abs(regionCycleU(r, 0) - 0.1) < 1e-9, "offset maps to u");
  assert.ok(Math.abs(regionCycleU(r, NURSERY_CYCLE_MS) - 0.1) < 1e-9, "periodic");
  for (let i = 0; i < 500; i++) {
    const u = regionCycleU(r, i * 137 + 5);
    assert.ok(u >= 0 && u < 1, `u in range at t=${i * 137 + 5}`);
  }
});

test("frozen clock (reduced motion) gives a stable, fully-populated state", () => {
  const a = computeNursery({ time: 7777, width: W, height: H, arms: 2, galaxyAngle: 0.3 });
  const b = computeNursery({ time: 7777, width: W, height: H, arms: 2, galaxyAngle: 0.3 });
  assert.deepEqual(a, b, "same frozen clock → same state");
  for (const r of a) {
    assert.ok(r.newborns.length >= 3 && r.newborns.length <= 6, "3..6 newborns");
    for (const nb of r.newborns) {
      assert.ok(Math.hypot(nb.ux, nb.uy) <= 0.9, "newborns sit inside the knot");
      assert.ok(nb.size > 0 && nb.size < 4, "sane newborn size");
    }
  }
});

test("degrades gracefully on tiny screens and arm counts of 1..5", () => {
  for (const arms of [1, 2, 3, 4, 5]) {
    const regions = computeNursery({ time: 5, width: 120, height: 80, arms, galaxyAngle: 2.4 });
    assert.equal(regions.length, NURSERY_REGION_COUNT);
    for (const r of regions) {
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
      assert.ok(r.radius > 0);
      assert.equal(r.arm % arms, r.arm, "arm index within the arm count");
    }
  }
});

test("describing phases produces stable a11y labels", () => {
  assert.equal(describeNurseryPhase("forming"), "Star Nursery: Gathering");
  assert.equal(describeNurseryPhase("birth"), "Star Nursery: Birth");
  assert.equal(describeNurseryPhase("active"), "Star Nursery: New Stars");
  assert.equal(describeNurseryPhase("settling"), "Star Nursery: Dispersing");
});
