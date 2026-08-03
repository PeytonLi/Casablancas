import assert from "node:assert/strict";
import test from "node:test";

import { createCharlieVoicePlayer } from "../src/charlie-voice.js";

test("plays a bundled hard-coded answer without making a network request", async () => {
  let playedUrl = "";
  const player = createCharlieVoicePlayer({
    audioByText: { "Okay, follow me.": "/audio/charlie-toilet.mp3" },
    fetchImpl: async () => {
      throw new Error("Bundled replies must not fetch");
    },
    audioFactory: (url) => ({
      play: async () => { playedUrl = url; },
      pause() {},
      onended: null,
      onerror: null,
    }),
  });

  await player.speak("Okay, follow me.");

  assert.equal(playedUrl, "/audio/charlie-toilet.mp3");
});

test("plays ElevenLabs audio returned by the server and releases its object URL", async () => {
  let request;
  let played = false;
  let revoked = "";
  let audio;
  const player = createCharlieVoicePlayer({
    audioByText: {},
    endpoint: "https://example.test/tts",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      });
    },
    createObjectURL: () => "blob:charlie-voice",
    revokeObjectURL: (url) => { revoked = url; },
    audioFactory: (url) => {
      audio = {
        url,
        play: async () => { played = true; },
        pause() {},
        onended: null,
        onerror: null,
      };
      return audio;
    },
  });

  await player.speak("Okay, follow me.");

  assert.equal(request.url, "https://example.test/tts");
  assert.deepEqual(JSON.parse(request.options.body), { text: "Okay, follow me." });
  assert.equal(audio.url, "blob:charlie-voice");
  assert.equal(played, true);
  audio.onended();
  assert.equal(revoked, "blob:charlie-voice");
});

test("reports a server failure so the UI can use its speech fallback", async () => {
  const player = createCharlieVoicePlayer({
    audioByText: {},
    fetchImpl: async () => new Response("Unavailable", { status: 503 }),
  });

  await assert.rejects(player.speak("Okay, follow me."), /Charlie voice is unavailable/);
});
