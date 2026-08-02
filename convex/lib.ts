type CanonicalDestination =
  | "lands-end"
  | "water-1"
  | "restroom-1"
  | "merch-1"
  | "exit-1";

type AskOutput = {
  speech: string;
  dest: CanonicalDestination | null;
};

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: unknown;
};

type OpenAIOutputItem = {
  content?: unknown;
};

type OpenAIContentItem = {
  text?: unknown;
};

type AskRequestBody = {
  model: "gpt-5.6";
  instructions: string;
  input: string;
  reasoning: { effort: "none" };
  max_output_tokens: number;
};

type TtsRequestBody = {
  model: "gpt-4o-mini-tts";
  voice: "cedar";
  input: string;
  response_format: "mp3";
  speed: number;
  instructions: string;
};

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const GENERIC_ASK_FALLBACK =
  "I can help with directions and festival essentials.";

const DESTINATIONS: Record<string, CanonicalDestination> = {
  stage: "lands-end",
  "lands-end": "lands-end",
  water: "water-1",
  "water-1": "water-1",
  restroom: "restroom-1",
  "restroom-1": "restroom-1",
  merch: "merch-1",
  "merch-1": "merch-1",
  exit: "exit-1",
  leave: "exit-1",
  "exit-1": "exit-1",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function extractOpenAIText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const response = payload as OpenAIResponsePayload;

  if (
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  if (!Array.isArray(response.output)) return "";

  return response.output
    .flatMap((item: unknown): unknown[] => {
      if (!isRecord(item)) return [];
      const outputItem = item as OpenAIOutputItem;
      return Array.isArray(outputItem.content) ? outputItem.content : [];
    })
    .map((content: unknown): string => {
      if (!isRecord(content)) return "";
      const contentItem = content as OpenAIContentItem;
      return typeof contentItem.text === "string"
        ? contentItem.text.trim()
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function canonicalDestination(dest: unknown): CanonicalDestination | null {
  if (typeof dest !== "string") return null;
  return DESTINATIONS[dest.trim().toLowerCase()] ?? null;
}

function fallbackAskOutput(text: string): AskOutput {
  const speech =
    text && !text.startsWith("{") && !text.startsWith("[")
      ? text
      : GENERIC_ASK_FALLBACK;
  return { speech, dest: null };
}

export function parseAskOutput(raw: unknown): AskOutput {
  const text = stripMarkdownFences(typeof raw === "string" ? raw : "");
  if (!text) return fallbackAskOutput("");

  try {
    const parsed: unknown = JSON.parse(text);

    if (typeof parsed === "string" && parsed.trim()) {
      return fallbackAskOutput(parsed.trim());
    }

    if (
      isRecord(parsed) &&
      typeof parsed.speech === "string" &&
      parsed.speech.trim()
    ) {
      return {
        speech: parsed.speech.trim(),
        dest: canonicalDestination(parsed.dest),
      };
    }

    return fallbackAskOutput("");
  } catch {
    return fallbackAskOutput(text);
  }
}

export function buildAskRequestBody(text: string): AskRequestBody {
  return {
    model: "gpt-5.6",
    instructions:
      'Return JSON only: {"speech":"short spoken reply","dest":"stage|water|restroom|merch|exit|null"}. Do not use markdown fences or extra text.',
    input: text,
    reasoning: { effort: "none" },
    max_output_tokens: 120,
  };
}

export function buildTtsRequestBody(text: string): TtsRequestBody {
  return {
    model: "gpt-4o-mini-tts",
    voice: "cedar",
    input: text,
    response_format: "mp3",
    speed: 0.93,
    instructions:
      "Use a warm, clear, generic speaking voice. Do not imitate or impersonate any real person.",
  };
}
