import test from "node:test";
import assert from "node:assert/strict";
import {
  AURORA_SEED,
  AURORA_BANDS,
  AURORA_HEIGHT_FRACTION,
  AURORA_SAMPLES,
  computeAuroraBands,
  auroraEdgeY,
  auroraEdgePoints,
  type AuroraBand,
} from "./aurora";

const HUES = [150, 175, 285] as number[];

test("computeAuroraBands is deterministic for a given seed/hues", () => {
  const a = computeAuroraBands({ height: 900, hues: HUES, seed: AURORA_SEED });
  const b = computeAuroraBands({ height: 900, hues: HUES, seed: AURORA_SEED });
  assert.deepEqual(a, b);
});

test("computeAuroraBands produces the requested band count", () => {
  assert.equal(computeAuroraBands({ height: 900, hues: HUES }).length, AURORA_BANDS);
  assert.equal(computeAuroraBands({ height: 900, hues: HUES, bandCount: 3 }).length, 3);
});

test("bands are spaced across the upper sky and stay in range", () => {
  const bands = computeAuroraBands({ height: 800, hues: HUES });
  for (const band of bands) {
    assert.ok(band.baseY >= 0 && band.baseY < AURORA_HEIGHT_FRACTION + 0.1, `baseY ${band.baseY}`);
    assert.ok(band.amplitude > 0, "amplitude positive");
    assert.ok(band.wavelength > 0, "wavelength positive");
    assert.ok(band.saturation >= 0 && band.saturation <= 100, "saturation in %");
    assert.ok(band.lightness > 0, "lightness positive");
    assert.ok(band.alpha > 0 && band.alpha < 1, "alpha in (0,1)");
  }
});

test("hue is drawn from the supplied theme hues", () => {
  const bands = computeAuroraBands({ height: 900, hues: HUES });
  for (const band of bands) {
    assert.ok(HUES.includes(band.hue), `hue ${band.hue} not from theme`);
  }
});

test("different seeds yield different band geometry", () => {
  const a = computeAuroraBands({ height: 900, hues: HUES, seed: 1 });
  const b = computeAuroraBands({ height: 900, hues: HUES, seed: 2 });
  assert.notDeepEqual(a, b);
});

test("auroraEdgeY tracks width/height and stays near the resting band", () => {
  const bands = computeAuroraBands({ height: 900, hues: HUES });
  const band = bands[0];
  const width = 1200;
  const height = 900;
  for (let i = 0; i <= AURORA_SAMPLES; i++) {
    const x = (i / AURORA_SAMPLES) * width;
    const y = auroraEdgeY(band, x, width, height, 0, 0);
    // The edge should hover within a couple of amplitudes of the resting line.
    const rest = band.baseY * height;
    const deviation = Math.abs(y - rest);
    const maxDev = band.amplitude * height * 2 + 1;
    assert.ok(deviation <= maxDev, `deviation ${deviation} too large at x=${x}`);
  }
});

test("auroraEdgeY shifts with time (the ribbons drift)", () => {
  const band: AuroraBand = {
    baseY: 0.2,
    amplitude: 0.05,
    wavelength: 400,
    phase: 0,
    speed: 1,
    secondaryWavelength: 200,
    secondaryPhase: 0,
    hue: 150,
    saturation: 80,
    lightness: 60,
    alpha: 0.2,
  };
  const width = 1000;
  const height = 800;
  const y0 = auroraEdgeY(band, 300, width, height, 0);
  const y1 = auroraEdgeY(band, 300, width, height, 3);
  assert.notEqual(y0, y1, "edge should move as time advances");
});

test("auroraEdgeY shifts with the horizontal sway offset", () => {
  const band: AuroraBand = {
    baseY: 0.3,
    amplitude: 0.05,
    wavelength: 400,
    phase: 0,
    speed: 1,
    secondaryWavelength: 200,
    secondaryPhase: 0,
    hue: 150,
    saturation: 80,
    lightness: 60,
    alpha: 0.2,
  };
  const width = 1000;
  const height = 800;
  const y0 = auroraEdgeY(band, 500, width, height, 1, 0);
  const y1 = auroraEdgeY(band, 500, width, height, 1, 40);
  assert.notEqual(y0, y1, "edge should move as sway changes");
});

test("auroraEdgePoints returns SAMPLES+1 points spanning the width", () => {
  const bands = computeAuroraBands({ height: 900, hues: HUES });
  const band = bands[0];
  const width = 1200;
  const height = 900;
  const pts = auroraEdgePoints(band, width, height, 0);
  assert.equal(pts.length, AURORA_SAMPLES + 1);
  assert.equal(pts[0][0], 0);
  assert.equal(pts[pts.length - 1][0], width);
});

test("a single band draws without throwing across a time sweep", () => {
  const band = computeAuroraBands({ height: 900, hues: HUES })[0];
  for (let t = 0; t < 20; t += 0.5) {
    auroraEdgePoints(band, 1200, 900, t, (t * 10) % 60 - 30);
  }
});
