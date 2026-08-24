import test from "node:test";
import assert from "node:assert/strict";
import {
  VOYAGER_SEED,
  VOYAGER_CYCLE_MS,
  VOYAGER_TAIL_POINTS,
  VOYAGER_MAX_DEFLECTION,
  VOYAGER_FIRST_CYCLE_DELAY_MAX_MS,
  computeVoyager,
} from "./cometVoyager";

const WIDTH = 1280;
const HEIGHT = 800;
/** The head always stays inside the viewport expanded by this margin. */
const BOUND = Math.max(WIDTH, HEIGHT) * 0.3;

/** Scan for the first in-flight window (ms resolution; flights are seconds). */
function firstFlightWindow(): { start: number; end: number } {
  let t = 0;
  while (t < VOYAGER_CYCLE_MS * 2) {
    if (computeVoyager({ time: t, width: WIDTH, height: HEIGHT }).inFlight) {
      const start = t;
      while (
        t < VOYAGER_CYCLE_MS * 2 &&
        computeVoyager({ time: t, width: WIDTH, height: HEIGHT }).inFlight
      ) {
        t += 25;
      }
      return { start, end: t - 25 };
    }
    t += 25;
  }
  throw new Error("no flight found within two cycles");
}

function withinBound(x: number, y: number): boolean {
  return (
    x >= -BOUND &&
    x <= WIDTH + BOUND &&
    y >= -BOUND &&
    y <= HEIGHT + BOUND
  );
}

test("computeVoyager is deterministic for a given time/size/seed", () => {
  const a = computeVoyager({ time: 3000, width: WIDTH, height: HEIGHT });
  const b = computeVoyager({ time: 3000, width: WIDTH, height: HEIGHT });
  assert.deepEqual(a, b);
});

test("different seeds give different voyagers", () => {
  const { start, end } = firstFlightWindow();
  const mid = (start + end) / 2;
  const a = computeVoyager({ time: mid, width: WIDTH, height: HEIGHT, seed: 5 });
  const b = computeVoyager({ time: mid, width: WIDTH, height: HEIGHT, seed: 6 });
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(dist > 1, `seeds 5 and 6 should diverge, heads ${dist}px apart`);
});

test("the first flight arrives within the first-cycle grace window", () => {
  const { start } = firstFlightWindow();
  assert.ok(
    start < VOYAGER_FIRST_CYCLE_DELAY_MAX_MS,
    `first flight starts at ${start}ms, expected within ${VOYAGER_FIRST_CYCLE_DELAY_MAX_MS}ms`,
  );
});

test("the comet is a visitor, not a resident: most of the sky is empty", () => {
  let visible = 0;
  const step = 25;
  let total = 0;
  for (let t = 0; t < VOYAGER_CYCLE_MS * 2; t += step) {
    total++;
    if (computeVoyager({ time: t, width: WIDTH, height: HEIGHT }).inFlight) visible++;
  }
  // Two flights of at most 7.8 s each in 24 s → under a third of the sky time.
  assert.ok(
    visible / total < 0.5,
    `comet visible ${visible}/${total} of samples, expected well under half`,
  );
  assert.ok(visible > 0, "expected at least one flight within two cycles");
});

test("the head stays inside the extended viewport while in flight", () => {
  const { start, end } = firstFlightWindow();
  for (let t = start; t <= end; t += 100) {
    const v = computeVoyager({ time: t, width: WIDTH, height: HEIGHT });
    if (!v.inFlight) continue;
    assert.ok(
      withinBound(v.x, v.y),
      `head (${v.x.toFixed(0)}, ${v.y.toFixed(0)}) at t=${t} left the extended bounds`,
    );
  }
});

test("progress runs 0…1 along the flight", () => {
  const { start, end } = firstFlightWindow();
  const early = computeVoyager({ time: start + 1, width: WIDTH, height: HEIGHT });
  const late = computeVoyager({ time: end, width: WIDTH, height: HEIGHT });
  assert.ok(early.inFlight && late.inFlight);
  assert.ok(early.progress < 0.15, `early progress ${early.progress} should be < 0.15`);
  assert.ok(late.progress > 0.9, `late progress ${late.progress} should be > 0.9`);
});

test("the tail is a bounded trail anchored at the head", () => {
  const { start, end } = firstFlightWindow();
  const mid = Math.floor((start + end) / 2);
  const v = computeVoyager({ time: mid, width: WIDTH, height: HEIGHT });
  assert.ok(v.inFlight);
  assert.ok(v.tail.length >= 2, `tail length ${v.tail.length}`);
  assert.ok(
    v.tail.length <= VOYAGER_TAIL_POINTS,
    `tail length ${v.tail.length} exceeds max`,
  );
  assert.equal(v.tail[0].x, v.x, "tail[0] should be the head");
  assert.equal(v.tail[0].y, v.y, "tail[0] should be the head");
  for (const p of v.tail) {
    assert.ok(withinBound(p.x, p.y), `tail point (${p.x}, ${p.y}) out of bounds`);
  }
});

test("the tail is shortest right after launch and full mid-flight", () => {
  const { start, end } = firstFlightWindow();
  const early = computeVoyager({ time: start + 60, width: WIDTH, height: HEIGHT });
  const mid = computeVoyager({ time: (start + end) / 2, width: WIDTH, height: HEIGHT });
  assert.ok(
    mid.tail.length > early.tail.length,
    `mid-flight tail (${mid.tail.length}) should be longer than launch tail (${early.tail.length})`,
  );
});

test("the comet speeds up: speed is positive mid-flight and zero otherwise", () => {
  const { start, end } = firstFlightWindow();
  const mid = computeVoyager({ time: (start + end) / 2, width: WIDTH, height: HEIGHT });
  assert.ok(mid.speed > 50, `mid-flight speed ${mid.speed} px/s should be brisk`);
  const idle = computeVoyager({ time: VOYAGER_CYCLE_MS * 1.98, width: WIDTH, height: HEIGHT });
  if (!idle.inFlight) {
    assert.equal(idle.speed, 0, "speed should be 0 when not in flight");
    assert.deepEqual(idle.tail, [], "tail should be empty when not in flight");
  }
});

test("the gravity well bends the path toward the cursor, within the cap", () => {
  const { start, end } = firstFlightWindow();
  const mid = Math.floor((start + end) / 2);
  const plain = computeVoyager({ time: mid, width: WIDTH, height: HEIGHT, well: null });
  assert.ok(plain.inFlight);
  const well = { x: plain.x + 300, y: plain.y + 300 };
  const bent = computeVoyager({ time: mid, width: WIDTH, height: HEIGHT, well });
  const before = Math.hypot(plain.x - well.x, plain.y - well.y);
  const after = Math.hypot(bent.x - well.x, bent.y - well.y);
  assert.ok(
    after < before,
    `head should move toward the well (${after} >= ${before})`,
  );
  const displacement = Math.hypot(bent.x - plain.x, bent.y - plain.y);
  assert.ok(
    displacement <= VOYAGER_MAX_DEFLECTION + 1e-6,
    `displacement ${displacement}px exceeds the cap`,
  );
});

test("a null well and an absent well give identical state", () => {
  const a = computeVoyager({ time: 2500, width: WIDTH, height: HEIGHT });
  const b = computeVoyager({ time: 2500, width: WIDTH, height: HEIGHT, well: null });
  assert.deepEqual(a, b);
});

test("the default seed is used when no seed is given", () => {
  const a = computeVoyager({ time: 2500, width: WIDTH, height: HEIGHT });
  const b = computeVoyager({ time: 2500, width: WIDTH, height: HEIGHT, seed: VOYAGER_SEED });
  assert.deepEqual(a, b);
});
