import assert from "node:assert/strict";
import test from "node:test";

import { createAskCharleyClient } from "../src/ask-charley.js";

test("passes a trimmed question to the Q&A client and normalizes its reply", async () => {
  let receivedQuestion;
  const client = createAskCharleyClient({
    askImpl: async (question) => {
      receivedQuestion = question;
      return { speech: "  Water is ahead.  ", dest: "  water-1  " };
    },
  });

  const reply = await client.ask("  where is water?  ");

  assert.equal(receivedQuestion, "where is water?");
  assert.deepEqual(reply, { speech: "Water is ahead.", dest: "water-1" });
});

test("rejects a blank question before requesting Charlie", async () => {
  let calls = 0;
  const client = createAskCharleyClient({
    askImpl: async () => {
      calls += 1;
      return {};
    },
  });

  await assert.rejects(client.ask("   "), { message: "Question required." });
  assert.equal(calls, 0);
});

test("uses a stable message when Charlie returns a non-success response", async () => {
  const client = createAskCharleyClient({
    askImpl: async () => { throw new Error("Unavailable"); },
  });

  await assert.rejects(client.ask("Where is the stage?"), { message: "Charlie is reconnecting." });
});

test("uses a stable message when Charlie returns a malformed response", async () => {
  const client = createAskCharleyClient({
    askImpl: async () => ({}),
  });

  await assert.rejects(client.ask("Where is the stage?"), { message: "Charlie is reconnecting." });
});

test("uses the two hard-coded Q&A demo answers", async () => {
  const client = createAskCharleyClient();
  assert.match((await client.ask("Who are the top artists?")).speech, /Charli xcx.*The Strokes/);
  assert.match((await client.ask("Where is the nearest bathroom?")).speech, /nearest restroom.*Lands End/i);
});
