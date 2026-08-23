import test from "node:test";
import assert from "node:assert/strict";
import {
  FULLSCREEN_QUERY,
  FULLSCREEN_VALUE,
  FULLSCREEN_SHORTCUT,
  parseFullscreen,
  fullscreenToParams,
  fullscreenUrl,
} from "./fullscreen";

test("parseFullscreen is true only for the exact 'on' value", () => {
  assert.equal(parseFullscreen("on"), true);
  assert.equal(parseFullscreen(FULLSCREEN_VALUE), true);
});

test("parseFullscreen treats everything else as not fullscreen", () => {
  assert.equal(parseFullscreen(null), false);
  assert.equal(parseFullscreen(undefined), false);
  assert.equal(parseFullscreen(""), false);
  assert.equal(parseFullscreen("off"), false);
  assert.equal(parseFullscreen("1"), false);
  assert.equal(parseFullscreen("ON"), false); // case-sensitive, by design
});

test("fullscreenToParams sets the flag when on", () => {
  const params = fullscreenToParams(true);
  assert.equal(params.get(FULLSCREEN_QUERY), FULLSCREEN_VALUE);
});

test("fullscreenToParams omits the flag when off", () => {
  const params = fullscreenToParams(false);
  assert.equal(params.get(FULLSCREEN_QUERY), null);
  assert.equal(params.toString(), "");
});

test("fullscreenUrl appends ?fullscreen=on when turning on", () => {
  assert.equal(fullscreenUrl("/", "", true), "/?fullscreen=on");
  // Existing params are preserved.
  assert.equal(fullscreenUrl("/g", "arms=4", true), "/g?arms=4&fullscreen=on");
});

test("fullscreenUrl drops the flag cleanly when turning off", () => {
  // The pathname never carries the query string here — only the search does.
  assert.equal(fullscreenUrl("/", "?fullscreen=on", false), "/");
  // Other params survive; only the fullscreen flag is removed.
  assert.equal(
    fullscreenUrl("/g", "?arms=4&fullscreen=on", false),
    "/g?arms=4",
  );
});

test("the constants are coherent", () => {
  assert.equal(FULLSCREEN_QUERY, "fullscreen");
  assert.equal(FULLSCREEN_VALUE, "on");
  assert.equal(FULLSCREEN_SHORTCUT, "f");
  // Round-trip: what we write is what we read back.
  assert.equal(parseFullscreen(fullscreenUrl("/", "", true).split("?")[1].split("=")[1]), true);
});
