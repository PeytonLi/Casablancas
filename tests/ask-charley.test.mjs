import assert from "node:assert/strict";
import test from "node:test";

import { createAskCharleyClient } from "../src/ask-charley.js";

test("trims a stage question before matching the local intent", async () => {
  const client = createAskCharleyClient();

  const reply = await client.ask("  what's happening on stage right now?  ");

  assert.deepEqual(reply, {
    speech: "The Strokes are playing at Lands End right now.",
    dest: "",
  });
});

test("rejects a blank question", async () => {
  const client = createAskCharleyClient();

  await assert.rejects(client.ask("   "), { message: "Question required." });
});
