import test from "node:test";
import assert from "node:assert/strict";
import {
  cursorSpeed,
  lerp,
  mulberry32,
  polylineLength,
  resampleTail,
  tailLengthFromSpeed,
} from "./comet";

const closeTo = (actual: number, expected: number, eps = 1e-6) => {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `expected ${actual} to be close to ${expected} (eps ${eps})`,
  );
};

test("mulberry32 is deterministic for a fixed seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) closeTo(a(), b());
});

test("mulberry32 produces values in [0, 1)", () => {
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test("lerp interpolates between endpoints", () => {
  closeTo(lerp(0, 10, 0), 0);
  closeTo(lerp(0, 10, 1), 10);
  closeTo(lerp(0, 10, 0.5), 5);
  closeTo(lerp(4, 4, 0.3), 4);
});

test("cursorSpeed returns 0 with insufficient history", () => {
  assert.equal(cursorSpeed([{ x: 0, y: 0, t: 0 }]), 0);
  assert.equal(cursorSpeed([]), 0);
});

test("cursorSpeed computes px/s from a uniform sweep", () => {
  // 100px over 0.5s = 200 px/s, sampled 6 times.
  const history = Array.from({ length: 6 }, (_, i) => ({
    x: i * 20,
    y: 0,
    t: i * 100,
  }));
  closeTo(cursorSpeed(history, 4), 200);
});

test("cursorSpeed returns 0 when time does not advance", () => {
  const history = [
    { x: 0, y: 0, t: 100 },
    { x: 5, y: 0, t: 100 },
  ];
  assert.equal(cursorSpeed(history, 1), 0);
});

test("polylineLength sums segment lengths", () => {
  const pts = [
    { x: 0, y: 0, t: 0 },
    { x: 3, y: 0, t: 1 },
    { x: 3, y: 4, t: 2 },
  ];
  closeTo(polylineLength(pts), 7);
});

test("polylineLength is 0 for a single point", () => {
  assert.equal(polylineLength([{ x: 1, y: 2, t: 0 }]), 0);
});

test("resampleTail returns the history when there are fewer than two points", () => {
  const one = [{ x: 1, y: 1, t: 0 }];
  assert.deepEqual(resampleTail(one, 5), one);
});

test("resampleTail produces exactly the requested number of points (up to the path length)", () => {
  const straight = Array.from({ length: 11 }, (_, i) => ({
    x: i * 10,
    y: 0,
    t: i,
  }));
  assert.equal(resampleTail(straight, 8).length, 8);
  assert.equal(resampleTail(straight, 3).length, 3);
});

test("resampleTail caps the number of points at the path length", () => {
  const straight = Array.from({ length: 11 }, (_, i) => ({
    x: i * 10,
    y: 0,
    t: i,
  }));
  assert.equal(resampleTail(straight, 999).length, 11);
});

test("resampleTail spreads points evenly along a straight path", () => {
  const straight = Array.from({ length: 11 }, (_, i) => ({
    x: i * 10,
    y: 0,
    t: i,
  }));
  const tail = resampleTail(straight, 6);
  // First point IS the comet tip at arc-length 0 (x≈0); the last lands just
  // before the head at arc-length total * (n-1) / n (x≈83.33).
  assert.ok(Math.abs(tail[0].x - 0) < 1e-3);
  assert.ok(Math.abs(tail[tail.length - 1].x - 83.333) < 1e-2);
  // Monotonically increasing and evenly spaced in x.
  for (let i = 1; i < tail.length; i++) {
    assert.ok(tail[i].x > tail[i - 1].x);
  }
  const step = 100 / 6;
  for (let i = 0; i < tail.length; i++) closeTo(tail[i].x, i * step);
});

test("resampleTail never exceeds the source length", () => {
  const straight = Array.from({ length: 11 }, (_, i) => ({
    x: i * 10,
    y: 0,
    t: i,
  }));
  assert.ok(resampleTail(straight, 999).length <= straight.length);
});

test("resampleTail follows a diagonal path in both axes", () => {
  const diag = Array.from({ length: 6 }, (_, i) => ({
    x: i * 10,
    y: i * 10,
    t: i,
  }));
  const tail = resampleTail(diag, 3);
  // Starts exactly at the comet tip, advances monotonically in both axes, and
  // stays on the y == x diagonal.
  assert.ok(Math.abs(tail[0].x) < 1e-3);
  assert.ok(Math.abs(tail[0].y) < 1e-3);
  assert.ok(tail[1].x > tail[0].x);
  assert.ok(tail[2].x > tail[1].x);
  assert.ok(Math.abs(tail[2].x - tail[2].y) < 1e-6);
});

test("tailLengthFromSpeed returns the base length below threshold", () => {
  closeTo(tailLengthFromSpeed(0, 40, 240, 0, 800), 40);
  closeTo(tailLengthFromSpeed(100, 40, 240, 200, 800), 40);
});

test("tailLengthFromSpeed grows linearly and caps at max", () => {
  closeTo(tailLengthFromSpeed(400, 40, 240, 0, 800), 140);
  closeTo(tailLengthFromSpeed(800, 40, 240, 0, 800), 240);
  closeTo(tailLengthFromSpeed(1600, 40, 240, 0, 800), 240);
});
