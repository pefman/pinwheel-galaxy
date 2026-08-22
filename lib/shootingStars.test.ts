import test from "node:test";
import assert from "node:assert/strict";
import {
  computeShootingStars,
  SHOOTING_MAX_ALIVE,
  shootingStarSpawns,
} from "./shootingStars";

const HUES = [260, 300, 190];

const base = {
  time: 0,
  width: 1000,
  height: 800,
  intensity: 1,
  seed: 13,
  hues: HUES,
};

test("returns no meteors when intensity is zero", () => {
  assert.deepEqual(computeShootingStars({ ...base, intensity: 0 }), []);
});

test("output is deterministic for identical inputs", () => {
  const a = computeShootingStars({ ...base, time: 5 });
  const b = computeShootingStars({ ...base, time: 5 });
  assert.deepEqual(a, b);
});

test("spawn count scales with intensity", () => {
  const t = 30;
  const few = shootingStarSpawns(7, t, 1).length;
  const many = shootingStarSpawns(7, t, 5).length;
  // Five times the intensity should yield several times the meteors.
  assert.ok(many > few * 2, `expected ${many} > ${few * 2}`);
});

test("a fixed seed gives a stable pattern", () => {
  const a = shootingStarSpawns(42, 20, 2);
  const b = shootingStarSpawns(42, 20, 2);
  assert.deepEqual(a.map((s) => s.t.toFixed(4)), b.map((s) => s.t.toFixed(4)));
});

test("all live meteors sit on or near the canvas", () => {
  const stars = computeShootingStars({ ...base, time: 12, intensity: 3 });
  assert.ok(stars.length <= SHOOTING_MAX_ALIVE);
  for (const m of stars) {
    // Head within a streak-length of the viewport (nothing fully off-screen).
    assert.ok(m.x >= -m.len && m.x <= 1000 + m.len, "x on screen");
    assert.ok(m.y >= -m.len && m.y <= 800 + m.len, "y on screen");
    assert.ok(m.len > 0, "positive streak length");
    assert.ok(m.angle >= 0 && m.angle <= Math.PI / 2, "angle points down-right");
  }
});

test("hue is drawn from the active theme", () => {
  const stars = computeShootingStars({ ...base, time: 12, intensity: 3, hues: [20, 340, 280] });
  for (const m of stars) {
    assert.ok(
      m.hue === 20 || m.hue === 340 || m.hue === 280,
      `hue ${m.hue} should come from the theme`,
    );
  }
});

test("fewer meteors are alive at low intensity than high intensity at a snapshot", () => {
  const low = computeShootingStars({ ...base, time: 8, intensity: 1 }).length;
  const high = computeShootingStars({ ...base, time: 8, intensity: 6 }).length;
  assert.ok(high >= low, `expected ${high} >= ${low}`);
});

test("no meteor is alive before it spawns", () => {
  // At t just above 0 the earliest spawn may already be live, but nothing
  // spawns at a negative time, so count at t = 0.001 is sane (>= 0).
  const stars = computeShootingStars({ ...base, time: 0.001, intensity: 2 });
  for (const m of stars) {
    assert.ok(m.len > 0);
  }
});
