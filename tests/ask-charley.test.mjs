import assert from "node:assert/strict";
import test from "node:test";

import { createAskCharleyClient } from "../src/ask-charley.js";

test("posts a trimmed question and returns normalized reply fields", async () => {
  let request;
  const client = createAskCharleyClient({
    endpoint: "https://example.test/ask",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ speech: "  Water is ahead.  ", dest: "  water-1  " }), { status: 200 });
    },
  });

  const reply = await client.ask("  where is water?  ");

  assert.deepEqual(request, {
    url: "https://example.test/ask",
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "where is water?" }),
    },
  });
  assert.deepEqual(reply, { speech: "Water is ahead.", dest: "water-1" });
});

test("rejects a blank question before requesting Charlie", async () => {
  let calls = 0;
  const client = createAskCharleyClient({
    fetchImpl: async () => {
      calls += 1;
      return new Response();
    },
  });

  await assert.rejects(client.ask("   "), { message: "Question required." });
  assert.equal(calls, 0);
});

test("uses a stable message when Charlie returns a non-success response", async () => {
  const client = createAskCharleyClient({
    fetchImpl: async () => new Response("Unavailable", { status: 503 }),
  });

  await assert.rejects(client.ask("Where is the stage?"), { message: "Charlie is reconnecting." });
});

test("uses a stable message when Charlie returns malformed JSON", async () => {
  const client = createAskCharleyClient({
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });

  await assert.rejects(client.ask("Where is the stage?"), { message: "Charlie is reconnecting." });
});

test("answers festival questions locally when the live service is unavailable", async () => {
  const client = createAskCharleyClient();
  assert.match((await client.ask("Where is the bathroom?")).speech, /follow me/i);
  assert.match((await client.ask("change the music")).speech, /tuner/i);
});
