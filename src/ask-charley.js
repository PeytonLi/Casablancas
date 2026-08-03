import { ask as askQanda } from "./api.js";

const RECONNECTING_MESSAGE = "Charlie is reconnecting.";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function createAskCharleyClient({ askImpl = askQanda } = {}) {
  return {
    async ask(question) {
      const trimmedQuestion = normalizeString(question);
      if (!trimmedQuestion) throw new Error("Question required.");

      try {
        const payload = await askImpl(trimmedQuestion);
        const speech = normalizeString(payload?.speech || payload?.answer);
        if (!speech) throw new Error(RECONNECTING_MESSAGE);
        return {
          speech,
          dest: normalizeString(payload?.dest),
        };
      } catch {
        throw new Error(RECONNECTING_MESSAGE);
      }
    },
  };
}
