import assert from "node:assert/strict";
import test from "node:test";

import {
  handleAsk,
  handleNextShow,
  handleTts,
} from "./httpHandlers.ts";

test("handleAsk calls the Responses API and returns the frozen public contract", async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return Response.json({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: '{"speech":"Follow the glowing line.","dest":"stage"}',
            },
          ],
        },
      ],
    });
  };

  const response = await handleAsk(
    new Request("https://demo.convex.site/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Take me to The Strokes." }),
    }),
    { apiKey: "server-key", fetchImpl },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), {
    speech: "Follow the glowing line.",
    dest: "lands-end",
  });
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers.Authorization, "Bearer server-key");
  assert.deepEqual(JSON.parse(captured.options.body), {
    model: "gpt-5.6",
    instructions:
      'Return JSON only: {"speech":"short spoken reply","dest":"stage|water|restroom|merch|exit|null"}. Do not use markdown fences or extra text.',
    input: "Take me to The Strokes.",
    reasoning: { effort: "none" },
    max_output_tokens: 120,
  });
});

test("handleAsk remains demoable without an OpenAI key", async () => {
  const response = await handleAsk(
    new Request("https://demo.convex.site/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Where is the exit?" }),
    }),
    {
      apiKey: "",
      fetchImpl: async () => {
        throw new Error("fetch must not run without a key");
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    speech: "The nearest exit is marked on the glowing route.",
    dest: "exit-1",
  });
});

test("handleAsk turns an upstream failure into a speakable deterministic reply", async () => {
  const response = await handleAsk(
    new Request("https://demo.convex.site/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "I need water" }),
    }),
    {
      apiKey: "server-key",
      fetchImpl: async () => new Response("rate limited", { status: 429 }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    speech: "The nearest water station is along the route.",
    dest: "water-1",
  });
});

test("handleAsk rejects a malformed body with CORS intact", async () => {
  const response = await handleAsk(
    new Request("https://demo.convex.site/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    }),
    { apiKey: "server-key", fetchImpl: fetch },
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), { error: "text is required" });
});

test("handleTts returns ElevenLabs MP3 bytes with the configured voice", async () => {
  const mp3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]);
  let captured;
  const response = await handleTts(
    new Request("https://demo.convex.site/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "The Strokes are playing at Lands End right now." }),
    }),
    {
      apiKey: "server-key",
      voiceId: "voice-123",
      fetchImpl: async (url, options) => {
        captured = { url, options };
        return new Response(mp3, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  );

  assert.equal(
    captured.url,
    "https://api.elevenlabs.io/v1/text-to-speech/voice-123?output_format=mp3_44100_128",
  );
  assert.equal(captured.options.headers["xi-api-key"], "server-key");
  assert.equal(captured.options.headers.Accept, "audio/mpeg");
  assert.deepEqual(JSON.parse(captured.options.body), {
    text: "The Strokes are playing at Lands End right now.",
    model_id: "eleven_flash_v2_5",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), mp3);
});

test("handleTts reports missing ElevenLabs configuration without exposing details", async () => {
  const response = await handleTts(
    new Request("https://demo.convex.site/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello" }),
    }),
    { apiKey: "", voiceId: "", fetchImpl: fetch },
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), {
    error: "Voice is not configured yet",
  });
});

test("handleTts refuses arbitrary paid synthesis", async () => {
  let calls = 0;
  const response = await handleTts(
    new Request("https://demo.convex.site/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Read this expensive arbitrary paragraph." }),
    }),
    {
      apiKey: "server-key",
      voiceId: "voice-123",
      fetchImpl: async () => {
        calls += 1;
        return new Response();
      },
    },
  );

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  assert.deepEqual(await response.json(), { error: "Unsupported phrase" });
});

test("handleNextShow ensures and reads the demo show from Convex dependencies", async () => {
  const calls = [];
  const show = {
    artist: "The Strokes",
    date: "2026-08-08",
    venue: "Outside Lands — Lands End Stage",
    city: "San Francisco, CA",
    ticketUrl: "https://sfoutsidelands.com/tickets/",
    provider: "JamBase",
  };
  const response = await handleNextShow(
    new Request(
      "https://demo.convex.site/nextshow?artist=The%20Strokes",
    ),
    {
      now: () => new Date("2026-08-02T12:00:00Z"),
      ensureDemoShow: async () => calls.push("ensure"),
      findNextShow: async (args) => {
        calls.push(["find", args]);
        return show;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), show);
  assert.deepEqual(calls, [
    "ensure",
    ["find", { artist: "The Strokes", today: "2026-08-02" }],
  ]);
});

test("handleNextShow uses the festival calendar date across the UTC day boundary", async () => {
  const calls = [];
  const response = await handleNextShow(
    new Request("https://demo.convex.site/nextshow?artist=The%20Strokes"),
    {
      // 5:30 p.m. August 2 in San Francisco is already August 3 in UTC.
      now: () => new Date("2026-08-03T00:30:00Z"),
      ensureDemoShow: async () => undefined,
      findNextShow: async (args) => {
        calls.push(args);
        return null;
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    { artist: "The Strokes", today: "2026-08-02" },
  ]);
});

test("handleNextShow returns JSON null for an unknown artist", async () => {
  const response = await handleNextShow(
    new Request("https://demo.convex.site/nextshow?artist=Unknown"),
    {
      now: () => new Date("2026-08-02T12:00:00Z"),
      ensureDemoShow: async () => undefined,
      findNextShow: async () => null,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.equal(await response.text(), "null");
});

test("handleNextShow requires the artist query parameter", async () => {
  const response = await handleNextShow(
    new Request("https://demo.convex.site/nextshow"),
    {
      now: () => new Date("2026-08-02T12:00:00Z"),
      ensureDemoShow: async () => undefined,
      findNextShow: async () => null,
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "artist is required" });
});
