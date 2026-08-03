import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

function rule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

test("keeps Ask Charley answers in a compact, scrollable region", () => {
  assert.match(html, /id="ask-charley-status"/);

  const sheet = rule(".ask-charley-sheet");
  const status = rule("#ask-charley-status");

  assert.match(sheet, /max-height\s*:/);
  assert.match(sheet, /min-width\s*:\s*0/);
  assert.match(status, /max-height\s*:/);
  assert.match(status, /overflow-y\s*:\s*auto/);
  assert.match(status, /overflow-wrap\s*:\s*anywhere/);
  assert.match(status, /min-width\s*:\s*0/);
});

test("Ask Charlie supports Firefox-compatible speech transcription", () => {
  assert.match(html, /id="ask-charley-mic"/);
  assert.match(app, /import \{ transcribe \} from "\.\/api\.js"/);
  assert.match(app, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(app, /new MediaRecorder/);
  assert.match(app, /await transcribe\(audio\)/);
});

test("Ask Charlie opens a route to the nearest restroom", () => {
  assert.match(app, /reply\.dest === "restroom"/);
  assert.match(app, /nearestPlace\("restroom"\)/);
  assert.match(app, /await showView\("map"\)/);
  assert.match(app, /showRouteToPlace\(restroom\.id\)/);
});
