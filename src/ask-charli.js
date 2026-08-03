const RESPONSES = [
  {
    match: /\b(sutro|stage|set)\b/i,
    speech: "Sutro Stage is about six minutes away. Open the map and follow the acid-green route.",
  },
  {
    match: /\b(water|refill|hydration)\b/i,
    speech: "The closest water refill is directly along the route to Sutro Stage.",
  },
  {
    match: /\b(restroom|bathroom|toilet|wc)\b/i,
    speech: "There is a restroom beside the route, just before the central water refill.",
  },
  {
    match: /\b(food|eat|hungry|drink)\b/i,
    speech: "Food Alley is north of the Polo Field. It is marked with the orange fork icon.",
  },
  {
    match: /\b(show|next|ticket)\b/i,
    speech: "Tap Shows below and I will pull up the next performance and ticket link.",
  },
  {
    match: /\b(song|track|beat|music)\b/i,
    speech: "Swipe the tuner to change the track. Every station has its own tempo, groove, and sound.",
  },
];

export function getAskCharliReply(question = "") {
  const prompt = String(question).trim();
  if (!prompt) throw new Error("Ask Charli a question first.");
  return RESPONSES.find(({ match }) => match.test(prompt))?.speech
    ?? "I can help with stages, water, bathrooms, food, music, or the next show.";
}
