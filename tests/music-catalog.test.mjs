import assert from "node:assert/strict";
import test from "node:test";

import { getTracks } from "../src/music.js";

test("returns the complete public radio catalog with valid playback metadata", () => {
  const tracks = getTracks();

  assert.deepEqual(tracks.map((track) => track.title), [
    "360",
    "Von dutch",
    "Apple",
    "Club classics",
    "B2b",
    "Talk talk",
    "Guess",
    "365",
  ]);
  assert.equal(new Set(tracks.map((track) => track.id)).size, tracks.length);
  assert.equal(new Set(tracks.map((track) => track.file)).size, tracks.length);

  for (const track of tracks) {
    assert.ok(Number.isFinite(track.bpm) && track.bpm >= 100 && track.bpm <= 160);
    assert.match(track.emotion, /^(confident|playful|intense|euphoric)$/);
    assert.ok(Number.isInteger(track.danceProfile) && track.danceProfile >= 0 && track.danceProfile <= 3);
  }
});
