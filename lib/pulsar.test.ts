import test from "node:test";
import assert from "node:assert/strict";
import {
  PULSAR_SEED,
  PULSAR_PERIOD_MS,
  PULSAR_TRANSIT_MS,
  PULSAR_RADIUS_FRACTION,
  PULSAR_CORE_MIN,
  PULSAR_CORE_MAX,
  PULSAR_BEAM_HALF_ANGLE,
  PULSAR_BEAM_LENGTH_FRACTION,
  PULSAR_AXIS_TILT,
  PULSAR_POLE_OFFSET,
  computePulsar,
  beamDirectionAt,
  pulseFactor,
  beamEndpoint,
} from "./pulsar";

const WIDTH = 1280;
const HEIGHT = 800;

test("computePulsar is deterministic for a given time/size/seed", () => {
  const a = computePulsar({ time: 12345, width: WIDTH, height: HEIGHT, seed: PULSAR_SEED });
  const b = computePulsar({ time: 12345, width: WIDTH, height: HEIGHT, seed: PULSAR_SEED });
  assert.deepEqual(a, b);
});

test("the pulsar drifts from the left edge to the right edge across its transit", () => {
  const start = computePulsar({ time: 0, width: WIDTH, height: HEIGHT });
  const end = computePulsar({ time: PULSAR_TRANSIT_MS * 0.99, width: WIDTH, height: HEIGHT });
  assert.ok(start.x < WIDTH / 2, `expected start.x (${start.x}) left of centre`);
  assert.ok(end.x > WIDTH / 2, `expected end.x (${end.x}) right of centre`);
  assert.ok(Math.abs(start.x - WIDTH * 0.06) < 40, `start.x should be near the left margin, got ${start.x}`);
  assert.ok(end.x > WIDTH * 0.9, `end.x ${end.x} should be near the right edge`);
});

test("the core radius is clamped into the comfortable on-screen range", () => {
  const tiny = computePulsar({ time: 0, width: 60, height: 60 });
  const huge = computePulsar({ time: 0, width: 5000, height: 5000 });
  assert.ok(tiny.coreRadius >= PULSAR_CORE_MIN, `tiny core ${tiny.coreRadius} below min`);
  assert.ok(huge.coreRadius <= PULSAR_CORE_MAX, `huge core ${huge.coreRadius} above max`);
  const nominal = computePulsar({ time: 0, width: WIDTH, height: HEIGHT });
  const expected = Math.min(WIDTH, HEIGHT) * PULSAR_RADIUS_FRACTION;
  // The nominal case sits at the configured fraction of the sky, clamped into
  // the comfortable on-screen range.
  assert.ok(
    Math.abs(nominal.coreRadius - Math.min(expected, PULSAR_CORE_MAX)) <= 2 || nominal.coreRadius === PULSAR_CORE_MAX,
    `nominal core ${nominal.coreRadius} vs ~${expected} (clamped to [${PULSAR_CORE_MIN},${PULSAR_CORE_MAX}])`,
  );
});

test("the beams are exactly opposite unit vectors", () => {
  const s = computePulsar({ time: 1234, width: WIDTH, height: HEIGHT });
  const [n, so] = s.beams;
  assert.ok(Math.abs(n.x + so.x) < 1e-9, `north/south x should cancel: ${n.x}, ${so.x}`);
  assert.ok(Math.abs(n.y + so.y) < 1e-9, `north/south y should cancel: ${n.y}, ${so.y}`);
  assert.ok(Math.hypot(n.x, n.y) > 0.999 && Math.hypot(n.x, n.y) < 1.001, "beam must be a unit vector");
});

test("beamDirectionAt returns a unit vector and sweeps an arc as the star spins", () => {
  const a = beamDirectionAt({ spinAngle: 0, tilt: PULSAR_AXIS_TILT, poleOffset: PULSAR_POLE_OFFSET });
  const b = beamDirectionAt({ spinAngle: Math.PI, tilt: PULSAR_AXIS_TILT, poleOffset: PULSAR_POLE_OFFSET });
  assert.ok(Math.hypot(a.x, a.y) > 0.999 && Math.hypot(a.x, a.y) < 1.001, "a is a unit vector");
  assert.ok(Math.hypot(b.x, b.y) > 0.999 && Math.hypot(b.x, b.y) < 1.001, "b is a unit vector");
  // A non-zero pole offset means the beam actually moves as it spins.
  assert.ok(a.x !== b.x || a.y !== b.y, "the beam direction should change as the star spins");
});

test("a zero pole offset never sweeps — the beam stays fixed on the axis", () => {
  const a = beamDirectionAt({ spinAngle: 0, tilt: PULSAR_AXIS_TILT, poleOffset: 0 });
  const b = beamDirectionAt({ spinAngle: Math.PI, tilt: PULSAR_AXIS_TILT, poleOffset: 0 });
  assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, "no pole offset ⇒ no sweep");
});

test("pulseFactor is 1 when a beam faces the viewer and 0 when edge-on", () => {
  const facing = { x: 1, y: 0 };
  assert.ok(Math.abs(pulseFactor(facing, { x: 1, y: 0 }) - 1) < 1e-9, "beam straight at viewer ⇒ pulse 1");
  const edgeOn = pulseFactor(facing, { x: 0, y: 1 });
  assert.ok(Math.abs(edgeOn) < 1e-9, "beam edge-on ⇒ pulse 0");
  const opposite = pulseFactor(facing, { x: -1, y: 0 });
  assert.ok(Math.abs(opposite - 1) < 1e-9, "|cos| ⇒ opposite beam still pulses");
});

test("pulse is in [0,1] and clearly oscillates — a visible flare per rotation", () => {
  const s0 = computePulsar({ time: 0, width: WIDTH, height: HEIGHT });
  assert.ok(s0.pulse >= 0 && s0.pulse <= 1, `pulse ${s0.pulse} outside [0,1]`);

  // Sweep a full rotation at a representative position and watch the flare.
  let minPulse = 1;
  let maxPulse = 0;
  for (let i = 0; i <= 120; i++) {
    const s = computePulsar({ time: (i / 120) * PULSAR_PERIOD_MS, width: WIDTH, height: HEIGHT });
    minPulse = Math.min(minPulse, s.pulse);
    maxPulse = Math.max(maxPulse, s.pulse);
  }
  // The core must visibly brighten and dim — a genuine pulse, not a steady glow.
  assert.ok(maxPulse - minPulse > 0.3, `pulse should oscillate > 0.3, got ${maxPulse - minPulse}`);
  // And reach a bright peak, not just a faint twinkle.
  assert.ok(maxPulse > 0.5, `peak pulse ${maxPulse} should be a strong flare`);
});

test("a beam pointing straight at the viewer pulses fully (factor 1)", () => {
  // The pulse peaks at 1 exactly when a beam faces the viewer. Compose the two
  // pure helpers the way the draw code does: a beam along direction d, viewed
  // from the same direction, must give a full pulse.
  const d = beamDirectionAt({ spinAngle: 0, tilt: PULSAR_AXIS_TILT, poleOffset: PULSAR_POLE_OFFSET });
  assert.ok(Math.abs(pulseFactor(d, d) - 1) < 1e-9, `aligned beam should pulse to 1, got ${pulseFactor(d, d)}`);
});

test("beamEndpoint extends a beam by the requested length", () => {
  const e = beamEndpoint(0, 0, { x: 1, y: 0 }, 100);
  assert.ok(Math.abs(e.x - 100) < 1e-6 && Math.abs(e.y) < 1e-6, `endpoint should be (100,0), got ${JSON.stringify(e)}`);
});

test("beam length and half-angle honour the configured constants", () => {
  assert.ok(PULSAR_BEAM_HALF_ANGLE > 0 && PULSAR_BEAM_HALF_ANGLE < Math.PI, "half-angle must be a sane cone");
  assert.ok(PULSAR_BEAM_LENGTH_FRACTION > 0 && PULSAR_BEAM_LENGTH_FRACTION <= 1, "beam length fraction must be (0,1]");
});
