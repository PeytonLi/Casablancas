import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const map = await readFile(new URL("../src/map.js", import.meta.url), "utf8");

test("opening Ask Charlie returns to Home and clears prior map state", () => {
  assert.match(app, /async function openAskCharley\(\) \{\s+await showView\("home"\);\s+resetMapInterface\(\);/);
  assert.match(app, /await mapReady;\s+resetMapInterface\(\);/);
});

test("every selected destination starts at the fresh Home origin", () => {
  assert.match(map, /resetMapExperience\(\{ resetCamera: false \}\);\s+const origin = \[\.\.\.NAVIGATION_ROUTE\[0\]\];/);
  assert.match(map, /findNearestPlace\(NAVIGATION_ROUTE\[0\], festivalPlaces, "restroom"\)/);
  assert.doesNotMatch(map, /function currentLocation\(/);
});

test("destination routes replace the curated route instead of stacking", () => {
  assert.match(map, /setCuratedRouteVisible\(routeMode === "curated"\);\s+setDestinationRouteVisible\(routeMode === "destination"\);/);
  assert.match(map, /source\.setData\(festivalDestinationFeature\(origin, place\.coordinates\)\);\s+setRouteMode\("destination"\);/);
  assert.match(map, /setData\(festivalDestinationFeature\(origin, origin\)\)/);
});
