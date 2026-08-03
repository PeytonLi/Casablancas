import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_SHOW,
  normalizeArtistKey,
  toPublicShow,
} from "./showData.ts";

test("normalizeArtistKey makes artist lookup casing and whitespace stable", () => {
  assert.equal(normalizeArtistKey("  The   STROKES \n"), "the strokes");
});

test("DEMO_SHOW is the verified Outside Lands seed", () => {
  assert.deepEqual(DEMO_SHOW, {
    artist: "The Strokes",
    artistKey: "the strokes",
    date: "2026-08-08",
    venue: "Outside Lands — Lands End Stage",
    city: "San Francisco, CA",
    ticketUrl: "https://sfoutsidelands.com/tickets/",
    provider: "JamBase",
    sourceId: "demo:outside-lands-2026-the-strokes",
  });
});

test("toPublicShow removes database-only fields from an API response", () => {
  assert.deepEqual(
    toPublicShow({
      _id: "show_123",
      _creationTime: 1_786_192_800_000,
      ...DEMO_SHOW,
    }),
    {
      artist: "The Strokes",
      date: "2026-08-08",
      venue: "Outside Lands — Lands End Stage",
      city: "San Francisco, CA",
      ticketUrl: "https://sfoutsidelands.com/tickets/",
      provider: "JamBase",
    },
  );
});

test("toPublicShow preserves a missing next show as null", () => {
  assert.equal(toPublicShow(null), null);
});
