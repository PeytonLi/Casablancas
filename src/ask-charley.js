const DEFAULT_ENDPOINT = "https://content-cheetah-171.convex.site/ask";
const RECONNECTING_MESSAGE = "Charlie is reconnecting.";

const LOCAL_REPLIES = [
  [/\b(restroom|bathroom|toilet|wc)\b/i, "Okay, follow me."],
  [/\b(show|next|ticket)\b/i, "The next show is The Strokes at Lands End on August 8."],
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function createAskCharleyClient({ endpoint = DEFAULT_ENDPOINT, fetchImpl = null } = {}) {
  return {
    async ask(question) {
      const trimmedQuestion = normalizeString(question);
      if (!trimmedQuestion) throw new Error("Question required.");

      if (!fetchImpl) {
        const speech = LOCAL_REPLIES.find(([pattern]) => pattern.test(trimmedQuestion))?.[1]
          ?? "Ask me about the nearest toilet or the next show.";
        return { speech, dest: "" };
      }

      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmedQuestion }),
        });
        if (!response.ok) throw new Error(RECONNECTING_MESSAGE);

        const payload = await response.json();
        return {
          speech: normalizeString(payload?.speech),
          dest: normalizeString(payload?.dest),
        };
      } catch {
        throw new Error(RECONNECTING_MESSAGE);
      }
    },
  };
}
