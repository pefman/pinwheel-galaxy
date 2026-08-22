import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeVoice,
  describeVoice,
  midiToFreq,
  TEMPO,
  SHIMMER,
  THEME_SCALES,
  type SoundscapeVoice,
} from "./soundscape";
import { DEFAULT_CONFIG, THEMES } from "./galaxyPresets";
import { DEFAULT_RECIPE } from "./recipe";

function voice(
  config = DEFAULT_CONFIG,
  recipe = DEFAULT_RECIPE,
): SoundscapeVoice {
  return composeVoice(config, recipe);
}

test("midiToFreq is anchored at A4 = 440 Hz", () => {
  assert.equal(midiToFreq(69), 440);
  // An octave up is exactly double.
  assert.ok(Math.abs(midiToFreq(81) / 880 - 1) < 1e-9);
  // Higher note → higher frequency.
  assert.ok(midiToFreq(72) > midiToFreq(60));
});

test("every theme maps to a non-empty scale with distinct modes", () => {
  const keys = Object.keys(THEMES);
  assert.equal(keys.length, Object.keys(THEME_SCALES).length);
  for (const key of keys) {
    const scale = THEME_SCALES[key];
    assert.ok(scale.offsets.length >= 3, `${key} should have a real scale`);
    assert.ok(scale.offsets[0] === 0, `${key} tonic should start at 0`);
  }
  // The five themes really are musically distinct.
  const modes = new Set(keys.map((k) => THEME_SCALES[k].mode));
  assert.equal(modes.size, keys.length);
});

test("composeVoice is deterministic for the same galaxy", () => {
  assert.deepEqual(voice(), voice());
});

test("tempo scales with spin speed and stays in range", () => {
  const slow = voice({ ...DEFAULT_CONFIG, rpm: 1 });
  const fast = voice({ ...DEFAULT_CONFIG, rpm: 20 });
  assert.ok(slow.bpm >= TEMPO.min);
  assert.ok(fast.bpm <= TEMPO.max);
  assert.ok(fast.bpm > slow.bpm, "faster spin should raise the tempo");
});

test("star density scales shimmer and stays in range", () => {
  const sparse = voice({ ...DEFAULT_CONFIG, stars: 120 });
  const dense = voice({ ...DEFAULT_CONFIG, stars: 640 });
  assert.ok(shimmerInRange(sparse.shimmerDensity));
  assert.ok(shimmerInRange(dense.shimmerDensity));
  assert.ok(dense.shimmerDensity > sparse.shimmerDensity);
});

test("layers map to their voice triggers", () => {
  const base = voice();
  assert.equal(base.hasPad, false);
  assert.equal(base.hasArpeggio, false);
  assert.equal(base.hasTwinkle, false);
  assert.equal(base.hasGlissando, false);

  const layered = voice(DEFAULT_CONFIG, {
    ...DEFAULT_RECIPE,
    nebula: true,
    constellation: true,
    variable: true,
    comet: true,
  });
  assert.equal(layered.hasPad, true);
  assert.equal(layered.hasArpeggio, true);
  assert.equal(layered.hasTwinkle, true);
  assert.equal(layered.hasGlissando, true);
});

test("the tonic frequency follows the theme", () => {
  const violet = voice({ ...DEFAULT_CONFIG, theme: "violet" });
  const aurora = voice({ ...DEFAULT_CONFIG, theme: "aurora" });
  assert.notEqual(violet.rootFreq, aurora.rootFreq);
  assert.ok(violet.rootFreq > 0 && aurora.rootFreq > 0);
});

test("describeVoice reads mode, tempo and theme", () => {
  const v = voice({ ...DEFAULT_CONFIG, theme: "aurora", rpm: 10 });
  const text = describeVoice(v, THEMES.aurora.label);
  assert.match(text, /lydian/);
  assert.match(text, /\d+ BPM/);
  assert.match(text, /Aurora/);
});

function shimmerInRange(d: number): boolean {
  return d >= SHIMMER.min && d <= SHIMMER.max;
}
