import assert from "node:assert/strict";
import test from "node:test";

import {
  CORS_HEADERS,
  buildAskRequestBody,
  buildTtsRequestBody,
  extractOpenAIText,
  parseAskOutput,
  preflightResponse,
} from "./lib.ts";

const GENERIC_ASK_FALLBACK =
  "I can help with directions and festival essentials.";

test("CORS headers expose the HTTP API to the browser", () => {
  assert.deepEqual(CORS_HEADERS, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
});

test("preflightResponse returns an empty successful CORS response", async () => {
  const response = preflightResponse();

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(
    response.headers.get("Access-Control-Allow-Methods"),
    "POST, GET, OPTIONS",
  );
  assert.equal(
    response.headers.get("Access-Control-Allow-Headers"),
    "Content-Type",
  );
});

test("extractOpenAIText returns a top-level Responses API output_text", () => {
  assert.equal(
    extractOpenAIText({ output_text: "  Take the glowing route.  " }),
    "Take the glowing route.",
  );
});

test("extractOpenAIText joins nested Responses API text blocks", () => {
  const payload = {
    output: [
      { type: "reasoning", content: [] },
      {
        type: "message",
        content: [
          { type: "output_text", text: "First sentence." },
          { type: "output_text", text: "Second sentence." },
        ],
      },
    ],
  };

  assert.equal(extractOpenAIText(payload), "First sentence.\nSecond sentence.");
});

test("extractOpenAIText returns an empty string for missing or malformed text", () => {
  assert.equal(extractOpenAIText(null), "");
  assert.equal(extractOpenAIText({ output: [{ content: [{ text: 42 }] }] }), "");
});

test("parseAskOutput strips markdown fences around JSON", () => {
  const raw = [
    "```json",
    '{"speech":"Follow the glowing line.","dest":"stage"}',
    "```",
  ].join("\n");

  assert.deepEqual(parseAskOutput(raw), {
    speech: "Follow the glowing line.",
    dest: "lands-end",
  });
});

test("parseAskOutput canonicalizes every public destination", () => {
  const cases = [
    ["stage", "lands-end"],
    ["water", "water-1"],
    ["restroom", "restroom-1"],
    ["merch", "merch-1"],
    ["exit", "exit-1"],
    ["leave", "exit-1"],
  ];

  for (const [dest, expected] of cases) {
    assert.deepEqual(
      parseAskOutput(JSON.stringify({ speech: `Heading to ${dest}.`, dest })),
      { speech: `Heading to ${dest}.`, dest: expected },
    );
  }
});

test("parseAskOutput accepts canonical destinations and normalizes casing", () => {
  assert.deepEqual(
    parseAskOutput('{"speech":"Water is this way.","dest":"  WATER-1  "}'),
    { speech: "Water is this way.", dest: "water-1" },
  );
});

test("parseAskOutput accepts the canonical exit destination", () => {
  assert.deepEqual(
    parseAskOutput('{"speech":"The exit is this way.","dest":"  EXIT-1  "}'),
    { speech: "The exit is this way.", dest: "exit-1" },
  );
});

test("parseAskOutput keeps valid speech and nulls an unknown destination", () => {
  assert.deepEqual(
    parseAskOutput('{"speech":"I do not have that location.","dest":"parking"}'),
    { speech: "I do not have that location.", dest: null },
  );
});

test("parseAskOutput falls back to plain speakable model text", () => {
  assert.deepEqual(parseAskOutput("  Keep left at the fork.  "), {
    speech: "Keep left at the fork.",
    dest: null,
  });
});

test("parseAskOutput uses a generic line for empty or structured junk", () => {
  assert.deepEqual(parseAskOutput("   "), {
    speech: GENERIC_ASK_FALLBACK,
    dest: null,
  });
  assert.deepEqual(parseAskOutput('{"unexpected":true}'), {
    speech: GENERIC_ASK_FALLBACK,
    dest: null,
  });
  assert.deepEqual(parseAskOutput(undefined), {
    speech: GENERIC_ASK_FALLBACK,
    dest: null,
  });
});

test("buildAskRequestBody creates the bounded JSON-only Responses request", () => {
  assert.deepEqual(buildAskRequestBody("Take me to the Strokes' stage."), {
    model: "gpt-5.6",
    instructions:
      'Return JSON only: {"speech":"short spoken reply","dest":"stage|water|restroom|merch|exit|null"}. Do not use markdown fences or extra text.',
    input: "Take me to the Strokes' stage.",
    reasoning: { effort: "none" },
    max_output_tokens: 120,
  });
});

test("buildTtsRequestBody creates a generic non-imitative MP3 request", () => {
  assert.deepEqual(buildTtsRequestBody("Lands End is five minutes away."), {
    model: "gpt-4o-mini-tts",
    voice: "cedar",
    input: "Lands End is five minutes away.",
    response_format: "mp3",
    speed: 0.93,
    instructions:
      "Use a warm, clear, generic speaking voice. Do not imitate or impersonate any real person.",
  });
});
