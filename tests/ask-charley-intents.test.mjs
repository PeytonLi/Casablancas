import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARLIE_GREETING,
  createAskCharleyClient,
} from "../src/ask-charley.js";

const client = createAskCharleyClient();

test("uses the exact Charlie greeting", () => {
  assert.equal(CHARLIE_GREETING, "Hey, I'm Charlie, here to help.");
});

test("answers current stage questions with the fixed festival update", async () => {
  for (const question of [
    "What's happening right now at the stage?",
    "What is happening currently on the Lands End stage?",
    "Who's on stage right now?",
    "I don't know what's happening now at the Grass stage",
  ]) {
    const reply = await client.ask(question);
    assert.deepEqual(
      reply,
      { speech: "The Strokes are playing at Lands End right now.", dest: "" },
      question,
    );
  }
});

test("answers restroom requests with the exact navigation reply and destination", async () => {
  for (const question of [
    "Hey, nearest toilet",
    "I need to go to the restroom",
    "Where is the bathroom?",
  ]) {
    const reply = await client.ask(question);
    assert.deepEqual(
      reply,
      { speech: "Okay, follow me.", dest: "lands-end-restrooms" },
      question,
    );
  }
});

test("opens Shows for next-show questions", async () => {
  for (const question of [
    "What's the next show?",
    "When do The Strokes play next?",
    "Show me the upcoming Strokes concert",
  ]) {
    const reply = await client.ask(question);
    assert.deepEqual(
      reply,
      {
        speech: "The Strokes play Saturday at 8:35 PM on the Lands End Stage. I've opened Shows.",
        dest: "shows",
      },
      question,
    );
  }
});

test("rejects unrelated intents with the supported capabilities", async () => {
  for (const question of [
    "Can I buy a ticket?",
    "Where can I get food?",
    "Where is the stage?",
  ]) {
    const reply = await client.ask(question);
    assert.deepEqual(
      reply,
      {
        speech: "Ask me what's on now, where the restroom is, or when The Strokes play next.",
        dest: "",
      },
      question,
    );
  }
});

test("never delegates questions to a remote service", async () => {
  let calls = 0;
  const offlineClient = createAskCharleyClient({
    fetchImpl: async () => {
      calls += 1;
      throw new Error("The deterministic demo must stay local");
    },
  });

  await offlineClient.ask("What's happening at the stage right now?");
  await offlineClient.ask("I need a restroom");
  await offlineClient.ask("What's the next show?");
  await offlineClient.ask("Tell me a joke");

  assert.equal(calls, 0);
});
