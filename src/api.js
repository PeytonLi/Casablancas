function apiBase() {
  const configured = globalThis.CASABLANCAS_CONFIG?.apiBase;
  if (typeof configured !== "string" || !configured.trim()) {
    throw new Error(
      "Missing Convex API base. Set globalThis.CASABLANCAS_CONFIG.apiBase to your https://<deployment>.convex.site URL.",
    );
  }
  const value = configured.trim();

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CASABLANCAS_CONFIG.apiBase must be a valid URL.");
  }

  if (url.protocol !== "https:" || !url.hostname.endsWith(".convex.site")) {
    throw new Error("CASABLANCAS_CONFIG.apiBase must be an https://*.convex.site URL.");
  }

  return url.origin;
}

function requireText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return value.trim();
}

function demoAnswer(text) {
  const question = text.toLowerCase();
  if (/(top|headline|headliner|biggest|featured)/.test(question) && /(artist|act|lineup)/.test(question)) {
    const answer = "The official 2026 daily lineup highlights Charli xcx, Turnstile, GRIZTRONICS, and Labrinth on Friday; The Strokes, The xx, Djo, PinkPantheress, and Dijon on Saturday; and RÜFÜS DU SOL, Baby Keem, Empire of the Sun, Death Cab for Cutie, and Disco Lines on Sunday.";
    return {
      answer,
      speech: answer,
      dest: null,
      sources: [{ label: "Official Outside Lands 2026 daily lineup", url: "https://sfoutsidelands.com/news/daily-lineups-are-here/" }],
    };
  }
  if (/\b(nearest|where|find|go|take me)\b/.test(question) && /(water|bathroom|restroom|toilet)/.test(question)) {
    const wantsWater = /water/.test(question);
    const wantsRestroom = /(bathroom|restroom|toilet)/.test(question);
    const answer = wantsRestroom && !wantsWater
      ? "Opening the map and routing you to the nearest restroom, just south of Lands End."
      : "From South Gate, head northwest toward the Polo Field. The mapped water refill is near the North Tunnel Exit on the field’s north side, and the restrooms are just east of it.";
    return { answer, speech: answer, dest: wantsWater === wantsRestroom ? null : wantsWater ? "water" : "restroom", sources: [] };
  }
  return null;
}

async function request(path, options) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${apiBase()}${path}`, options);
    } catch (error) {
      if (attempt) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
      continue;
    }
    if (![502, 503, 504].includes(response.status) || attempt) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (!response) throw new Error(`${path} request failed.`);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || `${path} request failed (${response.status}).`);
  }
  return response;
}

export async function ask(text) {
  const question = requireText(text, "text");
  const demo = demoAnswer(question);
  if (demo) return demo;

  const response = await request("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: question }),
  });
  const result = await response.json();

  if (
    typeof result?.answer !== "string" ||
    typeof result?.speech !== "string" ||
    (result.dest !== null && typeof result.dest !== "string") ||
    !Array.isArray(result.sources)
  ) {
    throw new Error("The /ask response did not match { answer, speech, dest, sources }.");
  }
  return result;
}

export async function tts(text) {
  const response = await request("/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: requireText(text, "text") }),
  });
  const blob = await response.blob();
  if (!blob.size) throw new Error("The /tts response contained no audio.");
  return URL.createObjectURL(blob);
}

export async function transcribe(audio) {
  if (!(audio instanceof Blob) || !audio.size) throw new TypeError("audio must be a non-empty Blob.");
  const form = new FormData();
  form.append("audio", audio, "question.webm");
  const response = await request("/transcribe", { method: "POST", body: form });
  const result = await response.json();
  if (typeof result?.text !== "string" || !result.text.trim()) {
    throw new Error("The /transcribe response did not contain text.");
  }
  return result.text.trim();
}

export async function nextShow(artist) {
  const response = await request(
    `/nextshow?artist=${encodeURIComponent(requireText(artist, "artist"))}`,
  );
  const result = await response.json();
  if (result !== null && (typeof result !== "object" || Array.isArray(result))) {
    throw new Error("The /nextshow response must be a show object or null.");
  }
  return result;
}
