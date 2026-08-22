import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPERNOVA_SEED,
  SUPERNOVA_RISE_MS,
  SUPERNOVA_PEAK_MS,
  SUPERNOVA_FADE_MS,
  SUPERNOVA_REMNANT_MS,
  SUPERNOVA_MIN_INTERMISSION_MS,
  SUPERNOVA_MAX_INTERMISSION_MS,
  SUPERNOVA_EXPLOSION_MS,
  computeSupernova,
  intermissionFor,
  explosionStartAt,
  describeSupernovaPhase,
  isSupernovaActive,
  type SupernovaPhase,
} from "./supernova";

const WIDTH = 1200;
const HEIGHT = 900;

test("computeSupernova is deterministic for a given time/size/seed", () => {
  const a = computeSupernova({ time: 12345, width: WIDTH, height: HEIGHT, seed: SUPERNOVA_SEED });
  const b = computeSupernova({ time: 12345, width: WIDTH, height: HEIGHT, seed: SUPERNOVA_SEED });
  assert.deepEqual(a, b);
});

test("a long intermission yields at least one explosion over a fixed window", () => {
  // Over 200s there must be at least one full explosion (max intermission is
  // 70s, so three intermissions already fit).
  let activeSeen = 0;
  for (let t = 0; t < 200_000; t += 5_000) {
    if (isSupernovaActive(computeSupernova({ time: t, width: WIDTH, height: HEIGHT }).phase)) {
      activeSeen++;
    }
  }
  assert.ok(activeSeen > 0, "expected at least one active explosion in the window");
});

test("the star always stays inside the sky and clear of the centre galaxy", () => {
  const edge = 60;
  const guard = Math.min(WIDTH, HEIGHT) * 0.18;
  for (let t = 0; t < 400_000; t += 7_000) {
    const s = computeSupernova({ time: t, width: WIDTH, height: HEIGHT });
    if (!isSupernovaActive(s.phase)) continue;
    assert.ok(s.x >= edge - 1, `x ${s.x} inside left edge`);
    assert.ok(s.x <= WIDTH - edge + 1, `x ${s.x} inside right edge`);
    assert.ok(s.y >= edge - 1, `y ${s.y} inside top edge`);
    assert.ok(s.y <= HEIGHT - edge + 1, `y ${s.y} inside bottom edge`);
    assert.ok(
      Math.hypot(s.x - WIDTH / 2, s.y - HEIGHT / 2) >= guard - 1,
      `position ${s.x},${s.y} clear of centre`,
    );
  }
});

test("an explosion walks through rise → peak → fade → remnant in order", () => {
  const start = explosionStartAt(0, SUPERNOVA_SEED);
  const phases: SupernovaPhase[] = [];
  const step = 500;
  for (let c = 0; c < SUPERNOVA_RISE_MS + SUPERNOVA_PEAK_MS + SUPERNOVA_FADE_MS + SUPERNOVA_REMNANT_MS; c += step) {
    const s = computeSupernova({ time: start + c, width: WIDTH, height: HEIGHT });
    phases.push(s.phase);
  }
  assert.equal(phases[0], "rising");
  assert.ok(phases.includes("peak"));
  assert.ok(phases.includes("fading"));
  // The remnant phase appears only after the fade phase has started.
  assert.ok(phases.indexOf("remnant") > phases.indexOf("fading"));
});

test("intensity rises to 1, holds near 1 at peak, then falls back to 0", () => {
  const start = explosionStartAt(0, SUPERNOVA_SEED);
  const rise = computeSupernova({ time: start + SUPERNOVA_RISE_MS * 0.5, width: WIDTH, height: HEIGHT });
  assert.ok(rise.intensity > 0.4 && rise.intensity <= 1, `rise intensity ${rise.intensity}`);
  const peak = computeSupernova({ time: start + SUPERNOVA_RISE_MS + SUPERNOVA_PEAK_MS * 0.5, width: WIDTH, height: HEIGHT });
  assert.ok(peak.intensity > 0.85, `peak intensity ${peak.intensity}`);
  const end = computeSupernova({
    time: start + SUPERNOVA_EXPLOSION_MS - 1,
    width: WIDTH,
    height: HEIGHT,
  });
  assert.ok(end.intensity < 0.15, `end intensity ${end.intensity}`);
});

test("the shockwave shell only exists during the fade phase and expands", () => {
  const start = explosionStartAt(0, SUPERNOVA_SEED);
  const duringRise = computeSupernova({ time: start + SUPERNOVA_RISE_MS * 0.5, width: WIDTH, height: HEIGHT });
  assert.equal(duringRise.shellRadius, 0, "no shell during rise");
  const earlyFade = computeSupernova({ time: start + SUPERNOVA_RISE_MS + SUPERNOVA_PEAK_MS + 500, width: WIDTH, height: HEIGHT });
  const lateFade = computeSupernova({ time: start + SUPERNOVA_EXPLOSION_MS - 500, width: WIDTH, height: HEIGHT });
  assert.ok(earlyFade.shellAlpha > 0, "shell visible early fade");
  assert.ok(lateFade.shellRadius > earlyFade.shellRadius, `shell expands (${earlyFade.shellRadius} → ${lateFade.shellRadius})`);
  assert.ok(lateFade.shellAlpha < earlyFade.shellAlpha, "shell fades as it expands");
});

test("the remnant glows faintly after the flash and then goes quiet", () => {
  const start = explosionStartAt(0, SUPERNOVA_SEED);
  const remnant = computeSupernova({ time: start + SUPERNOVA_EXPLOSION_MS + 500, width: WIDTH, height: HEIGHT });
  assert.equal(remnant.phase, "remnant");
  assert.ok(remnant.remnantAlpha > 0, "remnant visible");
  const quiet = computeSupernova({ time: start + SUPERNOVA_MIN_INTERMISSION_MS, width: WIDTH, height: HEIGHT });
  assert.equal(quiet.phase, "quiet");
  assert.equal(quiet.intensity, 0);
});

test("intermissions stay within the configured floor and ceiling", () => {
  for (let i = 0; i < 50; i++) {
    const m = intermissionFor(i, SUPERNOVA_SEED);
    assert.ok(m >= SUPERNOVA_MIN_INTERMISSION_MS - 1e-6, `intermission ${m} >= floor`);
    assert.ok(m <= SUPERNOVA_MAX_INTERMISSION_MS + 1e-6, `intermission ${m} <= ceiling`);
  }
});

test("explosions are spaced by an explosion, a remnant and an intermission", () => {
  const s0 = explosionStartAt(0, SUPERNOVA_SEED);
  const s1 = explosionStartAt(1, SUPERNOVA_SEED);
  const gap = s1 - s0;
  assert.equal(gap, SUPERNOVA_EXPLOSION_MS + SUPERNOVA_REMNANT_MS + intermissionFor(1, SUPERNOVA_SEED));
});

test("a different seed places the star elsewhere (not all identical)", () => {
  const at = (t: number, seed: number) =>
    computeSupernova({ time: t, width: WIDTH, height: HEIGHT, seed }).phase;
  // Two seeds should not agree on the active phase at every sampled instant.
  let disagree = 0;
  for (let t = 0; t < 300_000; t += 6_000) {
    if (at(t, SUPERNOVA_SEED) !== at(t, SUPERNOVA_SEED ^ 0x1234)) disagree++;
  }
  assert.ok(disagree > 0, "a different seed changes the schedule");
});

test("describeSupernovaPhase maps each phase to a label", () => {
  assert.equal(describeSupernovaPhase("rising"), "Supernova: Rising");
  assert.equal(describeSupernovaPhase("peak"), "Supernova: Flash");
  assert.equal(describeSupernovaPhase("fading"), "Supernova: Fading");
  assert.equal(describeSupernovaPhase("remnant"), "Supernova: Remnant");
  assert.equal(describeSupernovaPhase("quiet"), "Quiet sky");
});
