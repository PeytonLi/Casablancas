import test from "node:test";
import assert from "node:assert/strict";

globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };

const json = (value) => new Response(JSON.stringify(value), {
  headers: { "Content-Type": "application/json" },
});

const { ask, nextShow, tts } = await import("../src/api.js");

test("frontend API validates responses and translates failures", async (t) => {
  await t.test("accepts valid ask, TTS, and next-show responses", async () => {
    const show = {
      artist: "The Strokes",
      date: "2026-08-08",
      venue: "Lands End",
      city: "San Francisco",
      ticketUrl: "https://example.com/tickets",
      provider: "Example Tickets",
    };
    globalThis.fetch = async (url, options = {}) => {
      assert(options.signal instanceof AbortSignal);
      if (url.endsWith("/ask")) return json({ speech: "Head west.", dest: "lands-end" });
      if (url.endsWith("/tts")) return new Response(new Blob(["audio"]));
      if (url.includes("/nextshow?")) return json(show);
      throw new Error(`Unexpected URL: ${url}`);
    };

    assert.deepEqual(await ask("Where is the stage?"), {
      speech: "Head west.",
      dest: "lands-end",
    });
    const audioUrl = await tts("Hello");
    assert.match(audioUrl, /^blob:/);
    URL.revokeObjectURL(audioUrl);
    assert.deepEqual(await nextShow("The Strokes"), show);
  });

  await t.test("rejects an invalid ask destination", async () => {
    globalThis.fetch = async () => json({ speech: "Go there.", dest: "parking" });
    await assert.rejects(ask("Where?"), /did not match/);
  });

  await t.test("rejects an invalid next-show object", async () => {
    globalThis.fetch = async () => json({ artist: "The Strokes" });
    await assert.rejects(nextShow("The Strokes"), /show object or null/);
  });

  await t.test("translates timeout and network errors with the endpoint", async () => {
    globalThis.fetch = async () => {
      const error = new Error("expired");
      error.name = "TimeoutError";
      throw error;
    };
    await assert.rejects(ask("Where?"), /\/ask request timed out after 12000ms/);

    globalThis.fetch = async () => { throw new Error("offline"); };
    await assert.rejects(ask("Where?"), /\/ask request failed: offline/);
  });
});
