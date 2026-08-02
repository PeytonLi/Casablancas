import assert from "node:assert/strict";
import { spawn as spawnProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  fetchArtistEvents,
  normalizeEvent,
  runImporter,
  seedShows,
} from "./pull-jambase.mjs";

const NOW = new Date("2026-08-02T12:00:00Z");

function makeOrganization({ name, identifier, kind }) {
  return {
    "@type": "Organization",
    name,
    identifier,
    disambiguatingDescription: kind,
    datePublished: "2026-01-01T00:00:00Z",
    dateModified: "2026-07-01T00:00:00Z",
  };
}

function makeOffer({ identifier, url, category, seller }) {
  return {
    "@type": "Offer",
    identifier,
    url,
    category,
    seller,
    validFrom: "2026-05-01T10:00:00",
    priceSpecification: {
      "@type": "PriceSpecification",
      minPrice: 75,
      maxPrice: 160,
      priceCurrency: "USD",
    },
  };
}

function makeEvent({
  identifier,
  startDate,
  venue = "The Independent",
  city = "San Francisco",
  primaryUrl = "https://tickets.example.com/official",
  secondaryUrl = "https://resale.example.com/listing",
}) {
  const primarySeller = makeOrganization({
    name: "Ticketmaster",
    identifier: "ticketmaster",
    kind: "eventTicketVendorPrimary",
  });
  const secondarySeller = makeOrganization({
    name: "StubHub",
    identifier: "stubhub",
    kind: "eventTicketVendorSecondary",
  });

  return {
    "@context": "https://schema.org",
    "@type": "Concert",
    name: `The Strokes at ${venue}`,
    identifier,
    url: `https://www.jambase.com/show/${identifier.replace(":", "-")}`,
    image: "https://images.jambase.com/the-strokes.jpg",
    sameAs: [],
    datePublished: "2026-04-15T16:30:00Z",
    dateModified: "2026-07-20T18:45:00Z",
    eventStatus: "scheduled",
    startDate,
    endDate: startDate.slice(0, 10),
    previousStartDate: "",
    doorTime: `${startDate.slice(0, 10)}T19:00:00`,
    location: {
      "@type": "MusicVenue",
      name: venue,
      identifier: `jambase:venue-${identifier.split(":")[1]}`,
      url: "https://www.jambase.com/venue/the-independent",
      address: {
        "@type": "PostalAddress",
        streetAddress: "628 Divisadero Street",
        addressLocality: city,
        addressRegion: "CA",
        postalCode: "94117",
        addressCountry: "US",
        "x-timezone": "America/Los_Angeles",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 37.7755,
        longitude: -122.4377,
      },
    },
    offers: [
      makeOffer({
        identifier: `${identifier}:secondary`,
        url: secondaryUrl,
        category: "ticketingLinkSecondary",
        seller: secondarySeller,
      }),
      makeOffer({
        identifier: `${identifier}:primary`,
        url: primaryUrl,
        category: "ticketingLinkPrimary",
        seller: primarySeller,
      }),
    ],
    performer: [
      {
        "@type": "MusicGroup",
        name: "The Strokes",
        identifier: "jambase:1691",
        url: "https://www.jambase.com/band/the-strokes",
        "x-performanceRank": 1,
        "x-isHeadliner": true,
        "x-dateIsConfirmed": true,
      },
    ],
    eventAttendanceMode: "offline",
    isAccessibleForFree: false,
  };
}

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Bad Request",
    async json() {
      return structuredClone(body);
    },
  };
}

function makeSpawnRecorder(exitCode = 0) {
  const calls = [];
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", exitCode));
    return child;
  };
  return { calls, spawnImpl };
}

function runNode(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(process.execPath, args, {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("normalizeEvent emits the Convex show shape and prefers a primary ticket offer", () => {
  const event = makeEvent({
    identifier: "jambase:2002",
    startDate: "2026-10-12T20:00:00",
    venue: "Bill Graham Civic Auditorium",
    primaryUrl: "https://tickets.ticketmaster.com/the-strokes-official",
    secondaryUrl: "https://www.stubhub.com/the-strokes-resale",
  });

  assert.deepEqual(normalizeEvent(event, "the strokes", NOW), {
    artist: "The Strokes",
    artistKey: "the-strokes",
    date: "2026-10-12",
    venue: "Bill Graham Civic Auditorium",
    city: "San Francisco",
    ticketUrl: "https://tickets.ticketmaster.com/the-strokes-official",
    provider: "JamBase",
    sourceId: "jambase:2002",
  });
});

test("normalizeEvent drops an event with only a secondary ticket offer and event page URL", () => {
  const event = makeEvent({
    identifier: "jambase:2003",
    startDate: "2026-10-13T20:00:00",
    secondaryUrl: "https://www.stubhub.com/the-strokes-resale-only",
  });
  event.offers = event.offers.filter(
    (offer) => offer.category === "ticketingLinkSecondary",
  );
  event.url = "https://www.jambase.com/show/the-strokes-20261013";

  assert.equal(normalizeEvent(event, "The Strokes", NOW), null);
});

test("normalizeEvent drops events before the current calendar date", () => {
  const pastEvent = makeEvent({
    identifier: "jambase:1999",
    startDate: "2026-08-01T23:30:00",
  });

  assert.equal(normalizeEvent(pastEvent, "The Strokes", NOW), null);
});

test("normalizeEvent keeps a same-night show after UTC advances to tomorrow", () => {
  const sameNightEvent = makeEvent({
    identifier: "jambase:2004",
    startDate: "2026-08-02T20:00:00",
  });
  const afterUtcMidnight = new Date("2026-08-03T00:30:00Z");

  assert.equal(
    normalizeEvent(sameNightEvent, "The Strokes", afterUtcMidnight)?.sourceId,
    "jambase:2004",
  );
});

test("fetchArtistEvents sends the v3 request contract, fetches every page, and sorts upcoming shows", async () => {
  const calls = [];
  const lateEvent = makeEvent({
    identifier: "jambase:3003",
    startDate: "2026-12-05T20:00:00",
    venue: "Madison Square Garden",
    city: "New York",
    primaryUrl: "https://tickets.ticketmaster.com/strokes-msg",
  });
  const earlyEvent = makeEvent({
    identifier: "jambase:3001",
    startDate: "2026-09-14T19:30:00",
    venue: "Red Rocks Amphitheatre",
    city: "Morrison",
    primaryUrl: "https://www.axs.com/events/strokes-red-rocks",
  });
  const pastEvent = makeEvent({
    identifier: "jambase:1000",
    startDate: "2026-07-01T20:00:00",
  });

  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    const page = Number(new URL(url).searchParams.get("page"));
    if (page === 1) {
      return jsonResponse({
        success: { code: 200 },
        pagination: {
          page: 1,
          perPage: 100,
          totalItems: 3,
          totalPages: 2,
          nextPage: "https://api.data.jambase.com/v3/events?page=2",
          previousPage: null,
        },
        events: [lateEvent, pastEvent],
      });
    }
    return jsonResponse({
      success: { code: 200 },
      pagination: {
        page: 2,
        perPage: 100,
        totalItems: 3,
        totalPages: 2,
        nextPage: null,
        previousPage: "https://api.data.jambase.com/v3/events?page=1",
      },
      events: [earlyEvent],
    });
  };

  const shows = await fetchArtistEvents({
    artist: "The Strokes",
    token: "test-token",
    now: NOW,
    fetchImpl,
  });

  assert.equal(calls.length, 2);
  for (const [index, call] of calls.entries()) {
    const url = new URL(call.url);
    assert.equal(url.origin + url.pathname, "https://api.data.jambase.com/v3/events");
    assert.equal(url.searchParams.get("artistName"), "The Strokes");
    assert.equal(url.searchParams.get("page"), String(index + 1));
    assert.equal(url.searchParams.get("perPage"), "100");
    assert.deepEqual(call.options.headers, {
      Authorization: "Bearer test-token",
      Accept: "application/json",
      "User-Agent": "Casablanca-JamBase-Importer/0.1",
    });
  }
  assert.deepEqual(
    shows.map(({ sourceId, date }) => ({ sourceId, date })),
    [
      { sourceId: "jambase:3001", date: "2026-09-14" },
      { sourceId: "jambase:3003", date: "2026-12-05" },
    ],
  );
});

test("fetchArtistEvents rejects repeated pagination metadata instead of looping", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse({
      success: { code: 200 },
      pagination: {
        page: 1,
        perPage: 100,
        totalItems: 2,
        totalPages: 2,
        nextPage: "https://api.data.jambase.com/v3/events?page=2",
        previousPage: null,
      },
      events: [
        makeEvent({
          identifier: `jambase:repeat-${calls}`,
          startDate: "2026-09-01T20:00:00",
        }),
      ],
    });
  };

  await assert.rejects(
    fetchArtistEvents({
      artist: "The Strokes",
      token: "test-token",
      now: NOW,
      fetchImpl,
    }),
    /pagination.*page 2.*reported page 1/i,
  );
  assert.equal(calls, 2);
});

test("fetchArtistEvents surfaces a JamBase HTTP failure", async () => {
  await assert.rejects(
    fetchArtistEvents({
      artist: "The Strokes",
      token: "expired-token",
      now: NOW,
      fetchImpl: async () => jsonResponse(
        {
          type: "https://api.data.jambase.com/errors/key-expired",
          title: "API key expired",
          status: 401,
        },
        { status: 401 },
      ),
    }),
    /JamBase request failed.*401/i,
  );
});

for (const { name, prod, expectedSuffix } of [
  { name: "development", prod: false, expectedSuffix: [] },
  { name: "production", prod: true, expectedSuffix: ["--prod"] },
]) {
  test(`seedShows invokes the ${name} Convex replace mutation with one JSON argument`, async () => {
    const show = {
      artist: "The Strokes",
      artistKey: "the-strokes",
      date: "2026-09-14",
      venue: "Red Rocks Amphitheatre",
      city: "Morrison",
      ticketUrl: "https://www.axs.com/events/strokes-red-rocks",
      provider: "JamBase",
      sourceId: "jambase:3001",
      debugOnly: "must not reach Convex",
    };
    const { calls, spawnImpl } = makeSpawnRecorder();

    await seedShows([show], { prod, spawnImpl });

    assert.deepEqual(calls, [
      {
        command: "npx",
        args: [
          "convex",
          "run",
          "shows:replace",
          JSON.stringify({
            shows: [{
              artist: "The Strokes",
              date: "2026-09-14",
              venue: "Red Rocks Amphitheatre",
              city: "Morrison",
              ticketUrl: "https://www.axs.com/events/strokes-red-rocks",
              provider: "JamBase",
              sourceId: "jambase:3001",
            }],
          }),
          ...expectedSuffix,
        ],
        options: { stdio: "inherit" },
      },
    ]);
  });
}

test("seedShows reports a failed Convex process", async () => {
  const { spawnImpl } = makeSpawnRecorder(7);

  await assert.rejects(
    seedShows([], { spawnImpl }),
    /convex.*exit code 7.*convex dev.*convex deploy/is,
  );
});

test("runImporter rejects a missing JAMBASE_TOKEN before network or process work", async () => {
  let fetched = false;
  let spawned = false;

  await assert.rejects(
    runImporter({
      artist: "The Strokes",
      token: "  ",
      fetchImpl: async () => {
        fetched = true;
      },
      spawnImpl: () => {
        spawned = true;
      },
    }),
    /JAMBASE_TOKEN is required/,
  );
  assert.equal(fetched, false);
  assert.equal(spawned, false);
});

test("runImporter fetches normalized shows and seeds them once", async () => {
  const event = makeEvent({
    identifier: "jambase:4001",
    startDate: "2026-10-20T20:00:00",
    venue: "Hollywood Bowl",
    city: "Los Angeles",
    primaryUrl: "https://tickets.hollywoodbowl.com/the-strokes",
  });
  const { calls, spawnImpl } = makeSpawnRecorder();

  const shows = await runImporter({
    artist: "The Strokes",
    token: "test-token",
    prod: true,
    now: NOW,
    fetchImpl: async () => jsonResponse({
      success: { code: 200 },
      pagination: {
        page: 1,
        perPage: 100,
        totalItems: 1,
        totalPages: 1,
        nextPage: null,
        previousPage: null,
      },
      events: [event],
    }),
    spawnImpl,
  });

  assert.equal(shows.length, 1);
  assert.equal(shows[0].sourceId, "jambase:4001");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(0, 3), ["convex", "run", "shows:replace"]);
  assert.deepEqual(JSON.parse(calls[0].args[3]), {
    shows: [{
      artist: "The Strokes",
      date: "2026-10-20",
      venue: "Hollywood Bowl",
      city: "Los Angeles",
      ticketUrl: "https://tickets.hollywoodbowl.com/the-strokes",
      provider: "JamBase",
      sourceId: "jambase:4001",
    }],
  });
  assert.equal(calls[0].args[4], "--prod");
});

test("the CLI runs only on direct invocation and fails before network without JAMBASE_TOKEN", async () => {
  const scriptPath = fileURLToPath(new URL("./pull-jambase.mjs", import.meta.url));
  const result = await runNode(
    [scriptPath, "The Strokes"],
    { ...process.env, JAMBASE_TOKEN: "" },
  );

  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /JAMBASE_TOKEN is required/);
});
