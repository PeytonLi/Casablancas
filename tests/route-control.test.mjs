import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../site/index.html", import.meta.url), "utf8");

test("a selected destination keeps an enabled recenter control", () => {
  assert.match(app, /navigationPrimary\.textContent = "Recenter route";\s+navigationPrimary\.disabled = false;/);
  assert.doesNotMatch(app, /navigationPrimary\.textContent = "Route shown";\s+navigationPrimary\.disabled = true;/);
});

test("the route control recenters the active destination", () => {
  assert.match(app, /if \(activeDestinationId\) \{\s+const place = navigateToPlace\(activeDestinationId\);\s+if \(place\) showDestinationRoute\(place\);\s+return;/);
});

test("the hosted shell cache-busts the route control release", () => {
  assert.match(shell, /\/experience\/index\.html\?v=route-control-1/);
});
