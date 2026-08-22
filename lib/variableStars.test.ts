import test from "node:test";
import assert from "node:assert/strict";
import {
  VARIABLE_SEED,
  assignVariableStars,
  variableBrightness,
  variableAlpha,
  variableSize,
  GIANT_SIZE,
  MIN_AMPLITUDE,
  MAX_AMPLITUDE,
  MIN_PERIOD,
  MAX_PERIOD,
  type VariableStar,
} from "./variableStars";

test("assignVariableStars is deterministic for a given count/seed", () => {
  const a = assignVariableStars(320, VARIABLE_SEED);
  const b = assignVariableStars(320, VARIABLE_SEED);
  assert.deepEqual(a, b);
});

test("assignVariableStars produces one profile per star", () => {
  assert.equal(assignVariableStars(320, VARIABLE_SEED).length, 320);
  assert.equal(assignVariableStars(1, 1).length, 1);
});

test("periods stay inside [MIN_PERIOD, MAX_PERIOD]", () => {
  const stars = assignVariableStars(200, 7);
  for (const s of stars) {
    assert.ok(
      s.period >= MIN_PERIOD - 1e-9 && s.period <= MAX_PERIOD + 1e-9,
      `period ${s.period} out of range`,
    );
  }
});

test("amplitudes stay inside [MIN_AMPLITUDE, MAX_AMPLITUDE]", () => {
  const stars = assignVariableStars(200, 7);
  for (const s of stars) {
    assert.ok(
      s.amplitude >= MIN_AMPLITUDE - 1e-9 &&
        s.amplitude <= MAX_AMPLITUDE + 1e-9,
      `amplitude ${s.amplitude} out of range`,
    );
  }
});

test("a spread of stars are variable and a small fraction are giants", () => {
  const stars = assignVariableStars(1000, 3);
  const nVariable = stars.filter((s) => s.isVariable).length;
  const nGiant = stars.filter((s) => s.isGiant).length;
  // ~30% should be variable.
  assert.ok(nVariable > 220 && nVariable < 380, `variable ${nVariable}`);
  // Giants are rarer (~7%).
  assert.ok(nGiant > 20 && nGiant < 160, `giant ${nGiant}`);
});

test("giants always breathe and are bigger than regular stars", () => {
  const stars = assignVariableStars(500, 3);
  const giants = stars.filter((s) => s.isGiant);
  assert.ok(giants.length > 0);
  for (const g of giants) {
    assert.equal(g.isVariable, true);
    assert.equal(variableSize(g), GIANT_SIZE);
  }
  const regular = stars.filter((s) => !s.isGiant && !s.isVariable);
  for (const r of regular) {
    assert.equal(variableSize(r), 1);
  }
});

test("variableBrightness stays within [1 - amplitude, 1 + amplitude]", () => {
  const amplitude = 0.3;
  for (let t = 0; t < 1000; t += 1) {
    const b = variableBrightness(0.37, t / 10, 5, amplitude);
    assert.ok(b >= 1 - amplitude - 1e-9 && b <= 1 + amplitude + 1e-9, `b=${b}`);
  }
});

test("variableBrightness is a smooth sinusoid that reaches both extremes", () => {
  const amplitude = 0.4;
  // At phase 0.25 the sine is at its peak.
  const peak = variableBrightness(0.25, 0, 4, amplitude);
  assert.ok(Math.abs(peak - (1 + amplitude)) < 1e-6, `peak=${peak}`);
  // At phase 0.75 the sine is at its trough.
  const trough = variableBrightness(0.75, 0, 4, amplitude);
  assert.ok(Math.abs(trough - (1 - amplitude)) < 1e-6, `trough=${trough}`);
});

test("variableBrightness is periodic in (t / period)", () => {
  const b1 = variableBrightness(0.1, 2, 6, 0.2);
  const b2 = variableBrightness(0.1, 2 + 6, 6, 0.2);
  assert.equal(b1, b2);
});

test("phase offsets the light curve", () => {
  // Quarter-period out the sinusoid is at its peak; three-quarters out it is
  // at its trough, so the two are ~2×amplitude apart.
  const peak = variableBrightness(0.25, 0, 5, 0.3);
  const trough = variableBrightness(0.75, 0, 5, 0.3);
  assert.ok(Math.abs(peak - trough) > 0.5, `phase delta ${peak - trough}`);
});

test("variableAlpha is steady for non-variable stars and oscillates for variable ones", () => {
  const stars = assignVariableStars(100, 9);
  for (const s of stars) {
    if (!s.isVariable) {
      assert.equal(variableAlpha(s, 0), 1);
      assert.equal(variableAlpha(s, 1234), 1);
    }
  }
  const variable = stars.find((s) => s.isVariable);
  assert.ok(variable, "expected at least one variable star");
  // Sample the light curve across several periods; a variable star is not
  // constant, so at least two samples must differ.
  const samples = new Set<number>();
  for (let t = 0; t < variable!.period * 2; t += 0.3) {
    samples.add(variableAlpha(variable!, t));
  }
  assert.ok(samples.size > 1, "a variable star should change over time");
});

test("a different seed yields a different sky (not all identical)", () => {
  const a = assignVariableStars(320, 1);
  const b = assignVariableStars(320, 2);
  const anyDiff = a.some((s, i) => s !== b[i]);
  assert.ok(anyDiff, "different seeds should produce different skies");
});
