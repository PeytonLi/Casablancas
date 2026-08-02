import test from "node:test";
import assert from "node:assert/strict";

class ClassList {
  names = new Set();
  add(...names) { names.forEach((name) => this.names.add(name)); }
  remove(...names) { names.forEach((name) => this.names.delete(name)); }
  contains(name) { return this.names.has(name); }
}

const element = () => ({
  classList: new ClassList(),
  dataset: {},
  setAttribute(name, value) { this[name] = value; },
  append(...children) { this.children = [...(this.children || []), ...children]; },
  replaceChildren(...children) { this.children = children; },
});

test("A2 avatar, speech, jingle, and microphone contracts", async (t) => {
  const styles = new Map();
  const input = { focused: false, focus() { this.focused = true; } };
  globalThis.document = {
    head: { append(node) { styles.set(node.id, node); } },
    createElement: element,
    getElementById: (id) => styles.get(id),
    querySelector: () => input,
  };
  globalThis.window = { AudioContext: class { async resume() {} } };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { language: "en-US" },
  });

  let audioMode = "success";
  const played = [];
  globalThis.Audio = class {
    pause() {}
    play() {
      played.push(this.src);
      if (audioMode === "reject") return Promise.reject(new Error("blocked"));
      queueMicrotask(() => {
        if (audioMode === "error") this.onerror?.();
        else this.onended?.();
      });
      return Promise.resolve();
    }
  };
  globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };
  let ttsFails = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${CASABLANCAS_CONFIG.apiBase}/tts`);
    assert.deepEqual(JSON.parse(options.body), { text: "Hello" });
    if (ttsFails) throw new Error("offline");
    return new Response(new Blob(["audio"], { type: "audio/mpeg" }));
  };

  const avatar = await import("../src/avatar.js");
  const root = element();
  avatar.initAvatar(root);

  await t.test("avatar accepts known states", () => {
    avatar.setState("singing");
    assert.equal(root.dataset.state, "singing");
    assert(root.classList.contains("avatar--singing"));
    assert.throws(() => avatar.setState("unknown"), RangeError);
  });

  const voice = await import("../src/voice.js");
  await voice.initVoice();

  await t.test("successful speech resolves true", async () => {
    assert.equal(await voice.speak(" Hello "), true);
    assert.equal(root.dataset.state, "idle");
  });

  await t.test("TTS and playback failures resolve false and reset idle", async () => {
    ttsFails = true;
    assert.equal(await voice.speak("Hello"), false);
    assert.equal(root.dataset.state, "idle");
    ttsFails = false;

    audioMode = "error";
    assert.equal(await voice.speak("Hello"), false);
    assert.equal(root.dataset.state, "idle");

    audioMode = "reject";
    assert.equal(await voice.speak("Hello"), false);
    assert.equal(root.dataset.state, "idle");
    audioMode = "success";
  });

  await t.test("jingle plays and missing recognition focuses typed input", async () => {
    assert.equal(await voice.sing(), true);
    assert.equal(voice.startMic(() => {}), null);
    assert.equal(input.focused, true);
    assert.equal(played.length, 4);
  });

  await t.test("recognition is reused and submits final transcript once", () => {
    class Recognition {
      start() { this.onstart?.(); }
    }
    window.SpeechRecognition = Recognition;
    let submissions = 0;
    const recognition = voice.startMic(() => { submissions += 1; });
    assert.equal(voice.startMic(() => { submissions += 1; }), recognition);

    const result = [{ transcript: "Take me there" }];
    result.isFinal = true;
    const event = { resultIndex: 0, results: [result] };
    recognition.onresult(event);
    recognition.onresult(event);

    assert.equal(submissions, 1);
    assert.equal(input.value, "Take me there");
    assert.equal(root.dataset.state, "idle");
    recognition.onend();
  });
});
