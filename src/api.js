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

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(12000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error(`${path} request timed out after 12000ms.`, { cause: error });
    }
    throw new Error(`${path} request failed: ${error?.message || "Network error"}.`, {
      cause: error,
    });
  }
  if (!response.ok) throw new Error(`${path} request failed (${response.status}).`);
  return response;
}

export async function ask(text) {
  const response = await request("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: requireText(text, "text") }),
  });
  const result = await response.json();

  if (
    typeof result?.speech !== "string" ||
    ![null, "lands-end", "water", "restroom", "merch", "exit"].includes(result.dest)
  ) {
    throw new Error("The /ask response did not match { speech, dest }.");
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

export async function nextShow(artist) {
  const response = await request(
    `/nextshow?artist=${encodeURIComponent(requireText(artist, "artist"))}`,
  );
  const result = await response.json();
  const fields = ["artist", "date", "venue", "city", "ticketUrl", "provider"];
  if (
    result !== null &&
    (typeof result !== "object" ||
      Array.isArray(result) ||
      fields.some((field) => typeof result[field] !== "string"))
  ) {
    throw new Error("The /nextshow response must be a show object or null.");
  }
  return result;
}
