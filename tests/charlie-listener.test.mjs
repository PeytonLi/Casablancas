import assert from "node:assert/strict";
import test from "node:test";

import { createCharlieListener } from "../src/charlie-listener.js";

class FakeRecognition {
  static latest;

  constructor() {
    FakeRecognition.latest = this;
  }

  start() {
    queueMicrotask(() => {
      this.onresult({ results: [[{ transcript: "  I need to go to the bathroom  " }]] });
      this.onend();
    });
  }
}

test("listens once and returns the trimmed spoken question", async () => {
  const events = [];
  const track = { stop: () => events.push("track stopped") };
  const listener = createCharlieListener({
    SpeechRecognitionCtor: FakeRecognition,
    requestMicrophone: async (constraints) => {
      events.push(`microphone requested:${constraints.audio}`);
      return { getTracks: () => [track] };
    },
  });
  assert.equal(await listener.listen(), "I need to go to the bathroom");
  assert.deepEqual(events, ["microphone requested:true", "track stopped"]);
  assert.equal(FakeRecognition.latest.lang, "en-US");
  assert.equal(FakeRecognition.latest.interimResults, false);
  assert.equal(FakeRecognition.latest.maxAlternatives, 1);
  assert.equal(FakeRecognition.latest.continuous, false);
});

test("reports unsupported voice recognition clearly", async () => {
  const listener = createCharlieListener({ SpeechRecognitionCtor: null });
  await assert.rejects(listener.listen(), /isn't supported/);
});

test("reports denied microphone access before starting recognition", async () => {
  let recognitionStarted = false;
  class RecognitionThatMustNotStart extends FakeRecognition {
    start() {
      recognitionStarted = true;
    }
  }
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const listener = createCharlieListener({
    SpeechRecognitionCtor: RecognitionThatMustNotStart,
    requestMicrophone: async () => { throw denied; },
  });

  await assert.rejects(listener.listen(), /Allow microphone access/);
  assert.equal(recognitionStarted, false);
});

test("stops listening and recovers when speech recognition hangs", async () => {
  let aborted = false;
  class HangingRecognition {
    start() {}
    abort() { aborted = true; }
  }
  const listener = createCharlieListener({
    SpeechRecognitionCtor: HangingRecognition,
    requestMicrophone: null,
    listenTimeoutMs: 5,
  });

  await assert.rejects(listener.listen(), /didn't hear anything/);
  assert.equal(aborted, true);
});

test("recovers when the browser leaves microphone permission pending", async () => {
  const listener = createCharlieListener({
    SpeechRecognitionCtor: FakeRecognition,
    requestMicrophone: () => new Promise(() => {}),
    microphoneTimeoutMs: 5,
  });

  await assert.rejects(listener.listen(), /Microphone permission timed out/);
});
