import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRecipe,
  recipeToParams,
  resolveRecipe,
  toggleLayer,
  describeRecipe,
  DEFAULT_RECIPE,
  RECIPE_PARAMS,
} from "./recipe";

test("parseRecipe returns the default recipe for an empty query", () => {
  assert.deepEqual(parseRecipe(new URLSearchParams({})), DEFAULT_RECIPE);
});

test("parseRecipe reads only the `=on` layers", () => {
  const r = parseRecipe(
    new URLSearchParams({ nebula: "on", comet: "on", constellation: "off" }),
  );
  assert.equal(r.nebula, true);
  assert.equal(r.comet, true);
  assert.equal(r.constellation, false, "off is treated as the default (off)");
  assert.equal(r.meteors, false);
  assert.equal(r.depth, false);
  assert.equal(r.variable, false);
  assert.equal(r.zoomMode, false);
});

test("recipeToParams writes only the layers that are on", () => {
  const qs = recipeToParams({
    nebula: true,
    constellation: true,
    meteors: false,
    depth: false,
    variable: false,
    comet: true,
    zoomMode: false,
  });
  assert.equal(qs.get("nebula"), "on");
  assert.equal(qs.get("constellation"), "on");
  assert.equal(qs.get("comet"), "on");
  assert.equal(qs.get("meteors"), null);
  assert.equal(qs.get("depth"), null);
  assert.equal(qs.get("variable"), null);
  assert.equal(qs.get("zoom"), null);
});

test("recipeToParams produces an empty query for the default recipe", () => {
  assert.equal(recipeToParams(DEFAULT_RECIPE).toString(), "");
});

test("parseRecipe and recipeToParams round-trip", () => {
  const recipe = {
    nebula: true,
    constellation: false,
    meteors: true,
    depth: true,
    variable: false,
    comet: true,
    zoomMode: true,
    aurora: false,
    moon: false,
    supernova: false,
    distant: false,
    blackHole: false,
    ringedGiant: false,
    pulsar: false,
  };
  const qs = recipeToParams(recipe);
  assert.deepEqual(parseRecipe(qs), recipe);
});

test("resolveRecipe fills missing layers from defaults", () => {
  assert.deepEqual(
    resolveRecipe({ nebula: true }),
    { ...DEFAULT_RECIPE, nebula: true },
  );
});

test("toggleLayer flips exactly one layer and returns a new object", () => {
  const next = toggleLayer(DEFAULT_RECIPE, "comet");
  assert.equal(next.comet, true);
  assert.equal(DEFAULT_RECIPE.comet, false, "original is untouched");
  assert.notEqual(next, DEFAULT_RECIPE);
  assert.deepEqual(
    { ...next, comet: false },
    DEFAULT_RECIPE,
  );
});

test("RECIPE_PARAMS covers every layer exactly once", () => {
  const keys = Object.keys(RECIPE_PARAMS);
  assert.deepEqual(keys, [
    "nebula",
    "constellation",
    "meteors",
    "depth",
    "variable",
    "comet",
    "zoom",
    "aurora",
    "moon",
    "supernova",
    "distant",
    "blackHole",
    "ringedGiant",
    "pulsar",
  ]);
});

test("describeRecipe lists the on-layers and defaults cleanly", () => {
  assert.equal(describeRecipe(DEFAULT_RECIPE), "Default galaxy");
  assert.equal(
    describeRecipe({ ...DEFAULT_RECIPE, nebula: true, comet: true }),
    "Nebula, Comet",
  );
});
