import test from "node:test";
import assert from "node:assert/strict";

test("demo questions return verified answers without calling the agent", async () => {
  globalThis.fetch = () => assert.fail("demo questions must not call the backend");
  const { ask } = await import("../src/api.js");

  const artists = await ask("Who are the top artists?");
  assert.match(artists.answer, /Charli xcx.*The Strokes.*RÜFÜS DU SOL/);
  assert.equal(artists.sources[0].url, "https://sfoutsidelands.com/news/daily-lineups-are-here/");

  const bathroom = await ask("Where is the nearest bathroom?");
  assert.equal(bathroom.dest, "restroom");
  assert.match(bathroom.answer, /South Gate.*North Tunnel Exit/);
});

test("home page receives answer, speech, routing, and sources", async () => {
  globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.convex.site/ask");
    assert.deepEqual(JSON.parse(options.body), { text: "When is the next show?" });
    return Response.json({
      answer: "The next show is September 1.",
      speech: "The next show is September first.",
      dest: null,
      sources: [{ label: "JamBase", url: "https://www.jambase.com/show/example" }],
    });
  };

  const { ask } = await import("../src/api.js");
  const result = await ask(" When is the next show? ");
  assert.equal(result.sources[0].label, "JamBase");
  assert.equal(result.dest, null);
});

test("Firefox recordings are sent for transcription", async () => {
  globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.convex.site/transcribe");
    assert.equal(options.method, "POST");
    assert(options.body.get("audio") instanceof Blob);
    return Response.json({ text: "When is the next show?" });
  };

  const { transcribe } = await import("../src/api.js");
  assert.equal(await transcribe(new Blob(["audio"], { type: "audio/webm" })), "When is the next show?");
});

test("transient endpoint failures are retried once", async () => {
  globalThis.CASABLANCAS_CONFIG = { apiBase: "https://example.convex.site" };
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("NetworkError");
    return Response.json(null);
  };

  const { nextShow } = await import("../src/api.js");
  assert.equal(await nextShow("The Strokes"), null);
  assert.equal(calls, 2);
});
