import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EVENTS_URL = "https://api.data.jambase.com/v3/events";
const USER_AGENT = "Casablanca-JamBase-Importer/0.1";
const DEFAULT_ARTIST = "The Strokes";
const MAX_PAGES = 1_000;

function calendarDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function artistKey(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function selectTicketUrl(event) {
  const offers = Array.isArray(event?.offers)
    ? event.offers.filter((offer) => typeof offer?.url === "string" && offer.url)
    : [];
  const primary = offers.find((offer) =>
    offer.category === "ticketingLinkPrimary"
      || offer.seller?.disambiguatingDescription === "eventTicketVendorPrimary"
  );

  return primary?.url ?? null;
}

export function normalizeEvent(event, requestedArtist, now = new Date()) {
  const date = typeof event?.startDate === "string" ? event.startDate : "";
  const dateMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
  const eventTimeZone = event?.location?.address?.["x-timezone"];
  const timeZone = typeof eventTimeZone === "string" && eventTimeZone
    ? eventTimeZone
    : "America/Los_Angeles";
  const today = calendarDate(new Date(now), timeZone);
  if (!dateMatch || dateMatch[0] < today) return null;

  const requestedKey = artistKey(requestedArtist);
  const performer = Array.isArray(event.performer)
    ? event.performer.find((candidate) => artistKey(candidate?.name) === requestedKey)
    : null;
  const artist = performer?.name?.trim() || String(requestedArtist ?? "").trim();
  const venue = event.location?.name;
  const city = event.location?.address?.addressLocality;
  const ticketUrl = selectTicketUrl(event);
  const sourceId = event.identifier;

  if (!artist || !venue || !city || !ticketUrl || !sourceId) return null;

  return {
    artist,
    artistKey: artistKey(artist),
    date: dateMatch[0],
    venue,
    city,
    ticketUrl,
    provider: "JamBase",
    sourceId,
  };
}

function requireToken(token) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("JAMBASE_TOKEN is required");
  }
  return token.trim();
}

export async function fetchArtistEvents({
  artist,
  token,
  now = new Date(),
  fetchImpl = globalThis.fetch,
}) {
  const cleanToken = requireToken(token);
  const cleanArtist = String(artist ?? "").trim();
  if (!cleanArtist) throw new Error("Artist name is required");

  const events = [];
  let page = 1;

  while (true) {
    if (page > MAX_PAGES) {
      throw new Error(`JamBase pagination exceeded ${MAX_PAGES} pages`);
    }

    const url = new URL(EVENTS_URL);
    url.searchParams.set("artistName", cleanArtist);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", "100");

    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });

    if (!response?.ok) {
      throw new Error(`JamBase request failed with status ${response?.status ?? "unknown"}`);
    }

    const body = await response.json();
    const reportedPage = Number(body?.pagination?.page);
    const totalPages = Number(body?.pagination?.totalPages);

    if (!Number.isInteger(reportedPage) || reportedPage !== page) {
      throw new Error(
        `JamBase pagination requested page ${page} but reported page ${reportedPage}`,
      );
    }
    if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > MAX_PAGES) {
      throw new Error(`JamBase pagination reported invalid totalPages ${totalPages}`);
    }
    if (!Array.isArray(body.events)) {
      throw new Error("JamBase response did not include an events array");
    }

    events.push(...body.events);
    if (totalPages === 0 || page >= totalPages) break;
    page += 1;
  }

  return events
    .map((event) => normalizeEvent(event, cleanArtist, now))
    .filter(Boolean)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function waitForProcess(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(
        `Convex process exited with exit code ${code}. Run npx convex dev or npx convex deploy before seeding.`,
      ));
    });
  });
}

export async function seedShows(shows, { prod = false, spawnImpl = spawn } = {}) {
  const convexShows = shows.map(({
    artist,
    date,
    venue,
    city,
    ticketUrl,
    provider,
    sourceId,
  }) => ({
    artist,
    date,
    venue,
    city,
    ticketUrl,
    provider,
    sourceId,
  }));
  const args = [
    "convex",
    "run",
    "shows:replace",
    JSON.stringify({ shows: convexShows }),
  ];
  if (prod) args.push("--prod");

  const child = spawnImpl("npx", args, { stdio: "inherit" });
  await waitForProcess(child);
}

export async function runImporter({
  artist = DEFAULT_ARTIST,
  token,
  prod = false,
  now = new Date(),
  fetchImpl = globalThis.fetch,
  spawnImpl = spawn,
} = {}) {
  const cleanToken = requireToken(token);
  const shows = await fetchArtistEvents({
    artist,
    token: cleanToken,
    now,
    fetchImpl,
  });
  await seedShows(shows, { prod, spawnImpl });
  return shows;
}

function parseCliArgs(argv) {
  const prod = argv.includes("--prod");
  const artist = argv.filter((value) => value !== "--prod").join(" ").trim();
  return { artist: artist || DEFAULT_ARTIST, prod };
}

export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  spawnImpl = spawn,
  now = new Date(),
} = {}) {
  const { artist, prod } = parseCliArgs(argv);
  const shows = await runImporter({
    artist,
    token: env.JAMBASE_TOKEN,
    prod,
    now,
    fetchImpl,
    spawnImpl,
  });
  console.log(`Seeded ${shows.length} JamBase show${shows.length === 1 ? "" : "s"}.`);
  return shows;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
