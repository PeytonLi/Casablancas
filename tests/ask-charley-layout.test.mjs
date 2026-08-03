import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("uses a reliable two-question popup instead of microphone input", () => {
  assert.equal((html.match(/id="ask-charley-open"/g) ?? []).length, 1);
  assert.match(html, /id="ask-charley-sheet"/);
  assert.deepEqual(
    [...html.matchAll(/data-charlie-question="([^"]+)"/g)].map((match) => match[1]),
    ["What's happening at the stage right now?", "I need to go to the restroom."],
  );
  assert.doesNotMatch(html, /id="ask-charley-question"/);
  assert.doesNotMatch(html, /id="ask-charley-send"/);
});
