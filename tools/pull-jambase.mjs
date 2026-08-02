import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const API = "https://api.data.jambase.com/v3/events";

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function toShow(event, artist) {
  const offers = Array.isArray(event.offers) ? event.offers : event.offers ? [event.offers] : [];
  const offer = offers.find((item) => validUrl(item?.url));
  const ticketUrl = offer?.url ?? event.url;
  if (!event.startDate || !validUrl(ticketUrl)) return null;
  return {
    artist,
    date: event.startDate,
    venue: event.location?.name || "Venue TBA",
    city: event.location?.address?.addressLocality || "City TBA",
    ticketUrl,
    provider: "JamBase",
  };
}

async function pull(artist, token) {
  const shows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = new URL(API);
    url.search = new URLSearchParams({
      artistName: artist,
      eventDateFrom: new Date().toISOString().slice(0, 10),
      sort: "eventDate",
      page: String(page),
      perPage: "100",
    });
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "Casablancas/1.0",
      },
    });
    if (!response.ok) throw new Error(`JamBase request failed (${response.status})`);
    const data = await response.json();
    shows.push(...(data.events ?? []).map((event) => toShow(event, artist)).filter(Boolean));
    totalPages = Number(data.pagination?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);
  return shows;
}

function selfTest() {
  assert.deepEqual(
    toShow(
      {
        startDate: "2026-09-01T20:00:00",
        url: "https://www.jambase.com/show/example",
        location: { name: "Venue", address: { addressLocality: "City" } },
        offers: [{ url: "https://tickets.example/show" }],
      },
      "The Strokes",
    ),
    {
      artist: "The Strokes",
      date: "2026-09-01T20:00:00",
      venue: "Venue",
      city: "City",
      ticketUrl: "https://tickets.example/show",
      provider: "JamBase",
    },
  );
  console.log("JamBase normalizer: OK");
}

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const artist = process.argv.find((arg) => arg.startsWith("--artist="))?.slice(9) || "The Strokes";
const token = process.env.JAMBASE_API_TOKEN;
if (!token) throw new Error("JAMBASE_API_TOKEN is required");

const shows = await pull(artist, token);
if (!shows.length) throw new Error(`No upcoming JamBase events found for ${artist}`);

if (process.argv.includes("--seed")) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npx, ["convex", "run", "shows:seed", JSON.stringify({ shows })], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status) process.exit(result.status);
} else {
  console.log(JSON.stringify(shows, null, 2));
}
