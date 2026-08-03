import assert from "node:assert/strict";
import test from "node:test";

import { createAskCharleyClient } from "../src/ask-charley.js";
import { nearestPlace } from "../src/map.js";

const client = createAskCharleyClient();

test("matches common restroom requests with mapped directions", async () => {
  for (const question of [
    "Hey, nearest toilet",
    "I want to go to the toilet",
    "Where is the bathroom?",
  ]) {
    const reply = await client.ask(question);
    assert.match(reply.speech, /nearest restroom.*Lands End/i, question);
  }
});

test("selects the closest restroom from the map route origin", () => {
  assert.equal(nearestPlace("restroom")?.id, "lands-end-restrooms");
});

test("matches featured artist questions with the official daily lineup", async () => {
  for (const question of [
    "Who are the top artists?",
    "Which featured acts are in the lineup?",
  ]) {
    const reply = await client.ask(question);
    assert.match(reply.speech, /Charli xcx.*The Strokes.*RÜFÜS DU SOL/, question);
  }
});
