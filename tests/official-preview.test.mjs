import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { OFFICIAL_PREVIEW } from "../src/official-preview.js";

test("uses the official Apple Music preview for Charli xcx 360", () => {
  assert.equal(OFFICIAL_PREVIEW.title, "360");
  assert.equal(OFFICIAL_PREVIEW.artist, "Charli xcx");
  assert.match(OFFICIAL_PREVIEW.previewUrl, /^https:\/\/audio-ssl\.itunes\.apple\.com\//);
  assert.match(OFFICIAL_PREVIEW.sourceUrl, /^https:\/\/music\.apple\.com\/us\/album\/360\//);
  assert.equal(OFFICIAL_PREVIEW.durationMs, 15_000);
});

test("keeps the compact official preview on the home stage and outside the tuner", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const stageStart = html.indexOf('<section id="avatar"');
  const stageEnd = html.indexOf("</section>", stageStart);
  const preview = html.indexOf('id="official-360-preview"');
  const tunerStart = html.indexOf('id="track-list"');
  const tunerEnd = html.indexOf("</section>", tunerStart);

  assert.ok(preview > stageStart && preview < stageEnd);
  assert.ok(preview < tunerStart || preview > tunerEnd);
  assert.equal(html.match(/id="official-360-preview"/g)?.length, 1);
});

test("keeps map content below the route cards so the close button stays clickable", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.navigation-puck\s*\{[^}]*z-index:\s*3;/s);
  assert.match(css, /\.festival-icon-marker\s*\{[^}]*z-index:\s*2;/s);
  assert.match(css, /\.navigation-top-card\s*\{[^}]*z-index:\s*4;/s);
  assert.match(css, /\.map-search-results\s*\{[^}]*z-index:\s*9;/s);
});
