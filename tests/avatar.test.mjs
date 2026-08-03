import test from "node:test";
import assert from "node:assert/strict";
import { reduceAvatar } from "../src/avatar.js";

test("selection release enters loading with the chosen song", () => {
  const selected = reduceAvatar({ mode: "idle-pose", songIndex: 0, energy: 20 }, { type: "PREVIEW", songIndex: 1 });
  const loading = reduceAvatar(selected, { type: "RELEASE" });
  assert.deepEqual(loading, { mode: "performance-loading", songIndex: 1, energy: 20 });
});

test("playing supports pause and a return to the chooser", () => {
  const playing = { mode: "performance-playing", songIndex: 2, energy: 64 };
  assert.equal(reduceAvatar(playing, { type: "TOGGLE_PAUSE" }).mode, "performance-paused");
  assert.deepEqual(reduceAvatar(playing, { type: "CHOOSE" }), {
    mode: "idle-pose",
    songIndex: 2,
    energy: 20,
  });
});

test("energy is accepted only during an active performance and is clamped", () => {
  assert.equal(reduceAvatar({ mode: "performance-playing", songIndex: 0, energy: 20 }, { type: "ENERGY", value: 140 }).energy, 100);
  assert.equal(reduceAvatar({ mode: "idle-pose", songIndex: 0, energy: 20 }, { type: "ENERGY", value: 80 }).energy, 20);
});
