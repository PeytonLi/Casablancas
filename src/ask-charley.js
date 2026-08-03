const DEFAULT_ENDPOINT = "https://content-cheetah-171.convex.site/ask";
const RECONNECTING_MESSAGE = "Charlie is reconnecting.";

const LOCAL_REPLIES = [
  [/\b(restroom|bathroom|toilet|wc)\b/i, "The nearest restroom is beside the central water refill, right along the route to Sutro."],
  [/\b(water|refill|hydration)\b/i, "The closest water refill is directly along the route to Sutro Stage."],
  [/\b(sutro|stage|set)\b/i, "Sutro Stage is about six minutes away. Open the map and follow the acid-green route."],
  [/\b(food|eat|hungry|drink)\b/i, "Food Alley is north of the Polo Field, marked with the orange fork icon."],
  [/\b(song|track|beat|music)\b/i, "Swipe the tuner to change tracks. Every station now has its own tempo, groove, and sound."],
  [/\b(show|next|ticket)\b/i, "Tap Shows below to see the next performance and ticket link."],
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
          ?? "I can help with stages, water, bathrooms, food, music, or the next show.";
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
