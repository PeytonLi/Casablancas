import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const jsonHeaders = { ...cors, "Content-Type": "application/json" };
const destinations = new Set(["lands-end", "water", "restroom", "merch", "exit", null]);

class InputError extends Error {}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function bodyText(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new InputError("request body must be JSON");
  }
  if (typeof body?.text !== "string") throw new InputError("text is required");
  const text = body.text.trim();
  if (!text || text.length > 500) throw new InputError("text must be 1-500 characters");
  return text;
}

function outputText(data: any) {
  for (const item of data?.output ?? []) {
    const part = item.type === "message"
      ? item.content?.find((content: any) => content.type === "output_text")
      : null;
    if (typeof part?.text === "string") return part.text;
  }
  throw new Error("OpenAI returned no output text");
}

type JamBaseArgs = {
  kind: "events" | "artists" | "venues";
  query: string;
  eventFilter: "artist" | "venue" | "title" | null;
  dateFrom: string | null;
  dateTo: string | null;
  includePast: boolean;
  sort: "ascending" | "descending";
  limit: number;
};

const jamBaseTool = {
  type: "function",
  name: "search_jambase",
  description:
    "Search JamBase's live music database for artists, venues, upcoming concerts, festivals, or past shows. Use this before answering factual concert-history or schedule questions.",
  parameters: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["events", "artists", "venues"] },
      query: { type: "string", description: "Artist, venue, festival, or event name." },
      eventFilter: { enum: ["artist", "venue", "title", null] },
      dateFrom: { type: ["string", "null"], description: "Inclusive YYYY-MM-DD date, or null." },
      dateTo: { type: ["string", "null"], description: "Inclusive YYYY-MM-DD date, or null." },
      includePast: { type: "boolean" },
      sort: { type: "string", enum: ["ascending", "descending"] },
      limit: { type: "integer", minimum: 1, maximum: 20 },
    },
    required: ["kind", "query", "eventFilter", "dateFrom", "dateTo", "includePast", "sort", "limit"],
    additionalProperties: false,
  },
  strict: true,
} as const;

function parseJamBaseArgs(raw: string): JamBaseArgs {
  const value: any = JSON.parse(raw);
  if (
    !["events", "artists", "venues"].includes(value?.kind) ||
    typeof value?.query !== "string" ||
    !value.query.trim() ||
    value.query.length > 100 ||
    !["artist", "venue", "title", null].includes(value.eventFilter) ||
    !["ascending", "descending"].includes(value.sort) ||
    typeof value.includePast !== "boolean" ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    value.limit > 20
  ) throw new Error("Invalid JamBase search arguments");
  for (const date of [value.dateFrom, value.dateTo]) {
    if (date !== null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      throw new Error("JamBase dates must use YYYY-MM-DD");
    }
  }
  return { ...value, query: value.query.trim() };
}

function record(value: unknown): Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function compactJamBaseItem(value: unknown) {
  const item = record(value);
  const location = record(item.location);
  const address = record(location.address);
  const performers = Array.isArray(item.performer) ? item.performer : [];
  const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : [];
  return {
    name: item.name,
    id: item.identifier,
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.eventStatus,
    url: item.url,
    image: item.image,
    venue: location.name,
    city: address.addressLocality,
    region: address.addressRegion,
    country: address.addressCountry,
    performers: performers.slice(0, 12).map((performer) => {
      const artist = record(performer);
      return { name: artist.name, id: artist.identifier, url: artist.url };
    }),
    tickets: offers.slice(0, 4).map((offer) => record(offer).url).filter((url) => typeof url === "string"),
    sameAs: Array.isArray(item.sameAs) ? item.sameAs.slice(0, 12) : [],
    genres: Array.isArray(item.genre) ? item.genre.slice(0, 12) : item.genre,
  };
}

async function searchJamBase(args: JamBaseArgs, token: string) {
  const url = new URL(`https://api.data.jambase.com/v3/${args.kind}`);
  const nameParam = args.kind === "artists"
    ? "artistName"
    : args.kind === "venues"
      ? "venueName"
      : args.eventFilter === "venue"
        ? "venueName"
        : args.eventFilter === "title"
          ? "name"
          : "artistName";
  url.searchParams.set(nameParam, args.query);
  url.searchParams.set("perPage", String(args.limit));
  if (args.kind === "events") {
    if (args.dateFrom) url.searchParams.set("eventDateFrom", args.dateFrom);
    if (args.dateTo) url.searchParams.set("eventDateTo", args.dateTo);
    if (args.includePast) url.searchParams.set("expandPastEvents", "true");
    url.searchParams.set("sort", args.sort === "descending" ? "-eventDate" : "eventDate");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "Casablancas/1.0",
    },
  });
  if (!response.ok) throw new Error(`JamBase request failed (${response.status})`);
  const data = record(await response.json());
  const items = Array.isArray(data[args.kind]) ? data[args.kind] : [];
  return {
    provider: "JamBase",
    attributionUrl: "https://www.jambase.com/",
    totalItems: record(data.pagination).totalItems ?? items.length,
    items: items.slice(0, args.limit).map(compactJamBaseItem),
  };
}

async function openAI(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  return response.json();
}

const answerFormat = {
  type: "json_schema",
  name: "guide_answer",
  strict: true,
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      speech: { type: "string" },
      dest: { enum: ["lands-end", "water", "restroom", "merch", "exit", null] },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, url: { type: "string" } },
          required: ["label", "url"],
          additionalProperties: false,
        },
      },
    },
    required: ["answer", "speech", "dest", "sources"],
    additionalProperties: false,
  },
} as const;

const http = httpRouter();

for (const path of ["/ask", "/tts", "/transcribe", "/nextshow"] as const) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => new Response(null, { status: 204, headers: cors })),
  });
}

http.route({
  path: "/ask",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const text = await bodyText(request);
      const apiKey = process.env.OPENAI_API_KEY;
      const jamBaseToken = process.env.JAMBASE_API_TOKEN;
      if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 503);

      const input: any[] = [
        {
          role: "system",
          content:
            `You are Casablancas, a concise live-music and Outside Lands guide. Today is ${new Date().toISOString().slice(0, 10)}. ` +
            "For concert dates, lineups, artists, venues, festivals, and touring history, call search_jambase before answering. " +
            "For current official merchandise or music facts JamBase does not contain, use web search and prefer official artist sources. " +
            "Never invent dates, prices, stock, links, or past performances. Say when data is unavailable. Keep speech under 500 characters. " +
            "Include the JamBase event or ticket URL for show results and a visible JamBase attribution source. " +
            "Set dest only for an explicit request to navigate to lands-end, water, restroom, merch, or exit. Never imitate a real person or quote song lyrics.",
        },
        { role: "user", content: text },
      ];
      let data: any;
      for (let turn = 0; turn < 3; turn += 1) {
        data = await openAI(apiKey, {
          model: "gpt-5.6",
          store: false,
          input,
          tools: [jamBaseTool, { type: "web_search" }],
          max_output_tokens: 900,
          text: { format: answerFormat },
        });
        input.push(...(data.output ?? []));
        const calls = (data.output ?? []).filter((item: any) => item.type === "function_call");
        if (!calls.length) break;
        for (const call of calls) {
          if (call.name !== "search_jambase") throw new Error(`Unknown tool: ${call.name}`);
          const output = jamBaseToken
            ? await searchJamBase(parseJamBaseArgs(call.arguments), jamBaseToken)
            : { error: "JamBase is not configured" };
          input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) });
        }
      }

      const answer = JSON.parse(outputText(data));
      if (
        typeof answer?.answer !== "string" ||
        !answer.answer.trim() ||
        typeof answer?.speech !== "string" ||
        !answer.speech.trim() ||
        answer.speech.length > 500 ||
        !destinations.has(answer.dest) ||
        !Array.isArray(answer.sources)
      ) {
        throw new Error("OpenAI returned an invalid guide response");
      }
      const sources = answer.sources.flatMap((source: any) => {
        if (typeof source?.label !== "string" || typeof source?.url !== "string") return [];
        try {
          const url = new URL(source.url);
          return ["http:", "https:"].includes(url.protocol) ? [{ label: source.label, url: url.href }] : [];
        } catch {
          return [];
        }
      }).slice(0, 8);
      return json({
        answer: answer.answer.trim().slice(0, 2000),
        speech: answer.speech.trim(),
        dest: answer.dest,
        sources,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      return json({ error: message }, error instanceof InputError ? 400 : 502);
    }
  }),
});

http.route({
  path: "/transcribe",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new InputError("request body must be multipart form data");
      }
      const audio = form.get("audio");
      if (!(audio instanceof Blob) || !audio.size) throw new InputError("audio is required");
      if (audio.size > 10 * 1024 * 1024) throw new InputError("audio must be at most 10 MB");

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 503);
      const upstream = new FormData();
      const extension = audio.type.includes("mpeg") ? "mp3" : audio.type.includes("wav") ? "wav" : "webm";
      upstream.append("file", audio, `question.${extension}`);
      upstream.append("model", "gpt-4o-mini-transcribe");
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
      });
      if (!response.ok) throw new Error(`OpenAI transcription failed (${response.status})`);
      const text = record(await response.json()).text;
      if (typeof text !== "string" || !text.trim()) throw new Error("OpenAI returned no transcript");
      return json({ text: text.trim().slice(0, 500) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      return json({ error: message }, error instanceof InputError ? 400 : 502);
    }
  }),
});

http.route({
  path: "/tts",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const text = await bodyText(request);
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) return json({ error: "ELEVENLABS_API_KEY is not configured" }, 503);

      // Authorized ElevenLabs voice configured for the guide.
      const response = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/YpV71ED2KxvYbgnaI7Oe?output_format=mp3_44100_128",
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.75,
              style: 0,
              use_speaker_boost: true,
              speed: 1.1,
            },
          }),
        },
      );
      if (!response.ok) throw new Error(`ElevenLabs request failed (${response.status})`);

      return new Response(await response.arrayBuffer(), {
        headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      return json({ error: message }, error instanceof InputError ? 400 : 502);
    }
  }),
});

const strokesFallback = {
  artist: "The Strokes",
  date: "See current dates",
  venue: "Tour listings",
  city: "JamBase",
  ticketUrl: "https://www.jambase.com/band/the-strokes",
  provider: "JamBase",
};

http.route({
  path: "/nextshow",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const artist = new URL(request.url).searchParams.get("artist")?.trim() || "The Strokes";
    if (artist.length > 100) return json({ error: "artist must be at most 100 characters" }, 400);
    const show = await ctx
      .runQuery(internal.shows.next, {
        artist,
        today: new Date().toISOString().slice(0, 10),
      })
      .catch(() => null);
    return json(show ?? (artist.toLowerCase() === "the strokes" ? strokesFallback : null));
  }),
});

export default http;
