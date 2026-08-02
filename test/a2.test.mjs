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

test("A2 avatar, speech, and jingle contracts", async () => {
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

  const played = [];
  globalThis.Audio = class {
    pause() {}
    play() {
      played.push(this.src);
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    }
  };
  globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${CASABLANCAS_CONFIG.apiBase}/tts`);
    assert.deepEqual(JSON.parse(options.body), { text: "Hello" });
    return new Response(new Blob(["audio"], { type: "audio/mpeg" }));
  };

  const avatar = await import("../src/avatar.js");
  const root = element();
  avatar.initAvatar(root);
  avatar.setState("singing");
  assert.equal(root.dataset.state, "singing");
  assert(root.classList.contains("avatar--singing"));
  assert.throws(() => avatar.setState("unknown"), RangeError);

  const voice = await import("../src/voice.js");
  await voice.initVoice();
  await voice.speak(" Hello ");
  await voice.sing();
  assert.equal(played.length, 2);
  assert.equal(voice.startMic(() => {}), null);
  assert.equal(input.focused, true);
});
