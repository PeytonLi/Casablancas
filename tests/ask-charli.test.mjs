import assert from "node:assert/strict";
import test from "node:test";

import { getAskCharliReply } from "../src/ask-charli.js";

test("answers core festival questions locally", () => {
  assert.match(getAskCharliReply("Where is the bathroom?"), /restroom/i);
  assert.match(getAskCharliReply("How do I get to Sutro stage?"), /six minutes/i);
  assert.match(getAskCharliReply("change the music"), /tuner/i);
});

test("falls back safely and rejects an empty prompt", () => {
  assert.match(getAskCharliReply("help me"), /stages, water/i);
  assert.throws(() => getAskCharliReply("   "), /question first/i);
});
