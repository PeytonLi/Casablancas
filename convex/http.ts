import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

const http = httpRouter();

for (const path of ["/ask", "/tts", "/nextshow"] as const) {
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
      if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 503);

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: [
            {
              role: "system",
              content:
                "You are Casablancas, a concise Outside Lands guide. Reply in one short spoken sentence. Set dest to lands-end, water, restroom, merch, or exit only when routing is requested; otherwise null. Never imitate a real person or quote song lyrics.",
            },
            { role: "user", content: text },
          ],
          max_output_tokens: 300,
          text: {
            format: {
              type: "json_schema",
              name: "route_response",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  speech: { type: "string" },
                  dest: { enum: ["lands-end", "water", "restroom", "merch", "exit", null] },
                },
                required: ["speech", "dest"],
                additionalProperties: false,
              },
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);

      const answer = JSON.parse(outputText(await response.json()));
      if (
        typeof answer?.speech !== "string" ||
        !answer.speech.trim() ||
        answer.speech.length > 400 ||
        !destinations.has(answer.dest)
      ) {
        throw new Error("OpenAI returned an invalid route response");
      }
      return json({ speech: answer.speech.trim(), dest: answer.dest });
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
              speed: 0.95,
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
