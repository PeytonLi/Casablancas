import assert from "node:assert/strict";
import test from "node:test";

import { createAskCharleyClient } from "../src/ask-charley.js";

const client = createAskCharleyClient();

test("matches common toilet requests with the concise navigation reply", async () => {
  for (const question of [
    "Hey, nearest toilet",
    "I want to go to the toilet",
    "Where is the bathroom?",
  ]) {
    const reply = await client.ask(question);
    assert.equal(reply.speech, "Okay, follow me.", question);
  }
});

test("matches next-show questions with the fixed festival answer", async () => {
  for (const question of [
    "What's the next show?",
    "Which show is next?",
  ]) {
    const reply = await client.ask(question);
    assert.equal(
      reply.speech,
      "The next show is The Strokes at Lands End on August 8.",
      question,
    );
  }
});

test("keeps the hackathon demo limited to the two supported questions", async () => {
  const reply = await client.ask("Where can I get food?");
  assert.equal(reply.speech, "Ask me about the nearest toilet or the next show.");
});
