import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("hooks the Outside Lands planner outlets into the Shows view", () => {
  for (const id of [
    "shows-view",
    "shows-days",
    "shows-search",
    "shows-stage",
    "shows-plan-title",
    "shows-plan-content",
    "shows-list",
    "shows-updated",
    "shows-live",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /src\/shows\.css/);
  assert.match(app, /initShowsView\(showsView\)/);
  assert.match(app, /showsView\.addEventListener\("showroute"/);
  assert.match(app, /if \(target !== "home"\) stopPerformance\(\)/);
});
