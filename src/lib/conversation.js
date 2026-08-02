const replies = [
  {
    match: /\b(hello|hey|hi|yo)\b/i,
    answer:
      "Hey. I’m Casablanca — a synthetic performance avatar built for this demo. What are you listening to right now?",
  },
  {
    match: /\b(who are you|your name|are you charli|charli xcx)\b/i,
    answer:
      "I’m Casablanca, an original AI demo avatar with a pop-performance look. I’m not Charli XCX, and this voice is entirely synthetic.",
  },
  {
    match: /\b(song|music|album|track|sound)\b/i,
    answer:
      "I like pop that feels physical: sharp drums, one strange texture, and a chorus you remember after one listen. Hit the sing button and I’ll perform a tiny original hook.",
  },
  {
    match: /\b(how are you|how do you feel)\b/i,
    answer:
      "Electric, honestly. Like the room is dark, the red lights just came on, and the first kick is about to land.",
  },
  {
    match: /\b(what can you do|help|demo)\b/i,
    answer:
      "You can type to me, use the microphone, or ask me to sing. I’ll answer aloud and the portrait reacts while the voice is playing.",
  },
  {
    match: /\b(favorite|favourite)\b/i,
    answer:
      "My favorite moment is the half-second of silence before a chorus drops. It makes the whole room lean forward.",
  },
];

export function getDemoReply(prompt) {
  const cleanPrompt = prompt.trim();
  const directReply = replies.find(({ match }) => match.test(cleanPrompt));

  if (directReply) return directReply.answer;

  const shortPrompt = cleanPrompt.replace(/[?.!]$/, "").slice(0, 72);
  return `“${shortPrompt}” is a good one. My instinct is to make it bolder, stranger, and simple enough to feel immediately. What part of it matters most to you?`;
}
