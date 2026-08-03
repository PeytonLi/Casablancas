export const CHARLIE_GREETING = "Hey, I'm Charlie, here to help.";
export const CHARLIE_STAGE_REPLY = "The Strokes are playing at Lands End right now.";
export const CHARLIE_RESTROOM_REPLY = "Okay, follow me.";
export const CHARLIE_NEXT_SHOW_REPLY =
  "The Strokes play Saturday at 8:35 PM on the Lands End Stage. I've opened Shows.";
export const CHARLIE_CAPABILITIES_REPLY =
  "Ask me what's on now, where the restroom is, or when The Strokes play next.";

const RESTROOM_PATTERN = /\b(restroom|bathroom|toilet|wc)\b/i;
const STAGE_PATTERN = /\b(stage|grass lands?|lands end)\b/i;
const CURRENT_EVENT_PATTERN = /\b(now|currently|happening|playing|performing)\b/i;
const NEXT_SHOW_PATTERN = /(?:\bnext\b.*\b(show|concert|gig|set|play|playing|perform)\b|\b(show|concert|gig|set|play|playing|perform)\b.*\bnext\b|\bupcoming\b.*\b(show|concert|gig|set|performance)\b)/i;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function createAskCharleyClient() {
  return {
    async ask(question) {
      const trimmedQuestion = normalizeString(question);
      if (!trimmedQuestion) throw new Error("Question required.");

      if (RESTROOM_PATTERN.test(trimmedQuestion)) {
        return {
          speech: CHARLIE_RESTROOM_REPLY,
          dest: "lands-end-restrooms",
        };
      }

      if (NEXT_SHOW_PATTERN.test(trimmedQuestion)) {
        return { speech: CHARLIE_NEXT_SHOW_REPLY, dest: "shows" };
      }

      if (STAGE_PATTERN.test(trimmedQuestion) && CURRENT_EVENT_PATTERN.test(trimmedQuestion)) {
        return { speech: CHARLIE_STAGE_REPLY, dest: "" };
      }

      return { speech: CHARLIE_CAPABILITIES_REPLY, dest: "" };
    },
  };
}
