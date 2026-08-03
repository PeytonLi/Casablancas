import {
  CORS_HEADERS,
  buildAskRequestBody,
  extractOpenAIText,
  parseAskOutput,
} from "./lib.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const SPEECH_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const FESTIVAL_TIME_ZONE = "America/Los_Angeles";
const APPROVED_TTS_PHRASES = new Set([
  "Okay, follow me.",
  "The next show is The Strokes at Lands End on August 8.",
]);

type OpenAIDependencies = {
  apiKey?: string;
  voiceId?: string;
  fetchImpl?: typeof fetch;
};

type PublicShow = {
  artist: string;
  date: string;
  venue: string;
  city: string;
  ticketUrl: string;
  provider: string;
};

type NextShowDependencies = {
  ensureDemoShow: () => Promise<unknown>;
  findNextShow: (args: {
    artist: string;
    today: string;
  }) => Promise<PublicShow | null>;
  now?: () => Date;
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function calendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function requestText(request: Request): Promise<string> {
  try {
    const body = await request.json();
    return typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return "";
  }
}

function offlineAskReply(text: string): { speech: string; dest: string | null } {
  const prompt = text.toLowerCase();

  if (/\b(strokes|stage|lands?\s*end)\b/.test(prompt)) {
    return {
      speech: "Follow the glowing line to Lands End. It is about five minutes away.",
      dest: "lands-end",
    };
  }
  if (/\b(water|hydration)\b/.test(prompt)) {
    return {
      speech: "The nearest water station is along the route.",
      dest: "water-1",
    };
  }
  if (/\b(restroom|bathroom|toilet)\b/.test(prompt)) {
    return {
      speech: "The nearest restroom is marked beside the route.",
      dest: "restroom-1",
    };
  }
  if (/\b(merch|merchandise|shirt)\b/.test(prompt)) {
    return {
      speech: "The merch stand is just beyond Lands End.",
      dest: "merch-1",
    };
  }
  if (/\b(exit|leave|gate)\b/.test(prompt)) {
    return {
      speech: "The nearest exit is marked on the glowing route.",
      dest: "exit-1",
    };
  }

  return {
    speech: "I can help with the stage, water, restrooms, merch, or the exit.",
    dest: null,
  };
}

export async function handleAsk(
  request: Request,
  { apiKey = "", fetchImpl = fetch }: OpenAIDependencies = {},
): Promise<Response> {
  const text = await requestText(request);
  if (!text) return jsonResponse({ error: "text is required" }, 400);

  if (!apiKey) return jsonResponse(offlineAskReply(text));

  try {
    const upstream = await fetchImpl(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAskRequestBody(text)),
    });

    if (!upstream.ok) return jsonResponse(offlineAskReply(text));

    const payload = await upstream.json();
    const reply = parseAskOutput(extractOpenAIText(payload));
    return jsonResponse(reply);
  } catch {
    return jsonResponse(offlineAskReply(text));
  }
}

export async function handleTts(
  request: Request,
  { apiKey = "", voiceId = "", fetchImpl = fetch }: OpenAIDependencies = {},
): Promise<Response> {
  const text = await requestText(request);
  if (!text) return jsonResponse({ error: "text is required" }, 400);
  if (!apiKey || !voiceId) {
    return jsonResponse({ error: "Voice is not configured yet" }, 503);
  }
  if (!APPROVED_TTS_PHRASES.has(text)) {
    return jsonResponse({ error: "Unsupported phrase" }, 400);
  }

  try {
    const upstream = await fetchImpl(
      `${SPEECH_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
      },
    );

    if (!upstream.ok) {
      return jsonResponse({ error: "Voice is temporarily unavailable" }, 502);
    }

    const audio = await upstream.arrayBuffer();
    if (audio.byteLength === 0) {
      return jsonResponse({ error: "Voice is temporarily unavailable" }, 502);
    }

    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch {
    return jsonResponse({ error: "Voice is temporarily unavailable" }, 502);
  }
}

export async function handleNextShow(
  request: Request,
  { ensureDemoShow, findNextShow, now = () => new Date() }: NextShowDependencies,
): Promise<Response> {
  const artist = new URL(request.url).searchParams.get("artist")?.trim() ?? "";
  if (!artist) return jsonResponse({ error: "artist is required" }, 400);

  try {
    await ensureDemoShow();
    const today = calendarDate(now(), FESTIVAL_TIME_ZONE);
    const show = await findNextShow({ artist, today });
    return jsonResponse(show ?? null);
  } catch {
    return jsonResponse({ error: "Show data is temporarily unavailable" }, 503);
  }
}
