import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { clampDestinationZoom } from "../src/map.js";

test("destination routing keeps the camera close without over-zooming", () => {
  assert.equal(clampDestinationZoom(14.8), 16.45);
  assert.equal(clampDestinationZoom(16.8), 16.8);
  assert.equal(clampDestinationZoom(18), 17.2);
  assert.equal(clampDestinationZoom(undefined), 16.45);
});

test("the hosted shell cache-busts the current map release", async () => {
  const shell = await readFile(new URL("../site/index.html", import.meta.url), "utf8");
  assert.match(shell, /\/experience\/index\.html\?v=route-control-1/);
});
