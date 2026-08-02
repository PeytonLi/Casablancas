import { ask, nextShow } from "./api.js";
import { initAvatar } from "./avatar.js";
import { initVoice, sing, speak, startMic } from "./voice.js";
import { initMap, nearest, route } from "./map.js";

const $ = (selector) => document.querySelector(selector);
const map = $("#map");
const avatar = $("#avatar");
const wake = $("#wake");
const input = $("#input");
const card = $("#card");
const send = $("#send");
let location = "south-gate";
let voiceReady;

initAvatar(avatar);

const mapReady = Promise.resolve()
  .then(() => initMap(map))
  .then(() => true)
  .catch((error) => {
    console.error("Map initialization failed.", error);
    const status = map.querySelector(".map-loading") || document.createElement("p");
    status.className = "map-loading";
    status.textContent = "Map unavailable — voice and quick actions still work.";
    map.replaceChildren(status);
    return false;
  });

function enableVoice() {
  if (!voiceReady) {
    voiceReady = initVoice()
      .catch((error) => console.warn("Using browser speech fallback.", error))
      .finally(() => { wake.hidden = true; });
  }
  return voiceReady;
}

function renderCard(kicker, message) {
  const title = document.createElement("p");
  title.className = "card-kicker";
  title.textContent = kicker;
  const body = document.createElement("p");
  body.textContent = message;
  card.replaceChildren(title, body);
}

function browserSpeak(text) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = utterance.onerror = resolve;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function say(text) {
  if (!globalThis.CASABLANCAS_CONFIG?.apiBase) return browserSpeak(text);

  const started = performance.now();
  try {
    await speak(text);
    if (performance.now() - started < 250) await browserSpeak(text);
  } catch (error) {
    console.warn("Using browser speech fallback.", error);
    await browserSpeak(text);
  }
}

function walkLabel(minutes) {
  return Number.isFinite(minutes)
    ? `${minutes} minute${minutes === 1 ? "" : "s"}`
    : "a short walk";
}

async function drawRoute(destination) {
  if (!(await mapReady)) return {};

  try {
    return route(location, destination) || {};
  } catch (error) {
    console.warn(`Could not draw a route to ${destination}.`, error);
    return {};
  }
}

async function directions(destination, label, kind = "Route") {
  const origin = location;
  const result = await drawRoute(destination);
  location = destination;
  const walk = walkLabel(result.minutes);
  const speech = `${label} is ${walk} away. Follow the glowing line.`;
  renderCard(`${kind} · ${walk}`, `${origin.replaceAll("-", " ")} → ${label}`);
  await say(speech);
}

async function stage() {
  const origin = location;
  const result = await drawRoute("lands-end");
  location = "lands-end";
  const walk = walkLabel(result.minutes);
  const speech = `The Strokes are at Lands End Stage, ${walk} away. Follow the glowing line.`;
  renderCard(`${origin.replaceAll("-", " ")} → Lands End · ${walk}`, "The Strokes · Saturday · Lands End Stage");
  await say(speech);
  await sing();
}

async function amenity(type, label) {
  if (!(await mapReady)) {
    const fallback = `I can't place the nearest ${label.toLowerCase()} on the map right now.`;
    renderCard(`${label} · Map unavailable`, fallback);
    return say(fallback);
  }

  const found = nearest(type, location);
  const destination = typeof found === "string" ? found : found?.id;
  if (!destination) {
    const fallback = `I couldn't find a nearby ${label.toLowerCase()}.`;
    renderCard(`${label} · Unavailable`, fallback);
    return say(fallback);
  }
  return directions(destination, found?.label || label, label);
}

function safeTicketUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function showNextShow() {
  let show;
  try {
    show = await nextShow("The Strokes");
  } catch (error) {
    console.error(error);
  }

  if (!show) {
    const fallback = "I can't load the next Strokes show right now. Please try again shortly.";
    renderCard("The Strokes · Next show", fallback);
    return say(fallback);
  }

  const provider = show.provider || "official ticket seller";
  const details = [show.date, show.venue, show.city].filter(Boolean).join(" · ");
  const speech = `The Strokes' next show is ${show.date || "coming up"} at ${show.venue || "the listed venue"} in ${show.city || "the listed city"}.`;
  renderCard(`${show.artist || "The Strokes"} · Next show`, details || "See the official listing for details.");

  const ticketUrl = safeTicketUrl(show.ticketUrl);
  if (ticketUrl) {
    const link = document.createElement("a");
    link.href = ticketUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `Official tickets via ${provider}`;
    card.append(link);
  }

  const source = document.createElement("p");
  source.className = "card-meta";
  source.textContent = `Ticket provider: ${provider} · Source: JamBase`;
  card.append(source);
  await say(speech);
}

const intents = [
  [/\b(?:when|next[\s-]+show)\b/i, showNextShow],
  [/\b(?:stage|strokes|lands[\s-]+end)\b/i, stage],
  [/\b(?:bathroom|restroom|toilet)\b/i, () => amenity("restroom", "Restroom")],
  [/\bwater\b/i, () => amenity("water", "Water")],
  [/\bmerch(?:andise)?\b/i, () => amenity("merch", "Merch")],
  [/\b(?:leave|exit)\b/i, () => amenity("exit", "Exit")],
];

async function handle(rawText) {
  const text = rawText?.trim();
  if (!text) return;
  input.value = "";
  send.disabled = true;

  try {
    await enableVoice();
    const local = intents.find(([pattern]) => pattern.test(text));
    if (local) return await local[1]();

    const answer = await ask(text);
    const result = answer.dest ? await drawRoute(answer.dest) : {};
    if (answer.dest) location = answer.dest;
    const walk = Number.isFinite(result.minutes) ? ` · ${result.minutes} min` : "";
    renderCard(`Festival guide${walk}`, answer.speech);
    await say(answer.speech);
  } catch (error) {
    console.error(error);
    const fallback = "I lost the guide signal, but the destination buttons and map still work.";
    renderCard("Still here", fallback);
    await browserSpeak(fallback);
  } finally {
    send.disabled = false;
  }
}

wake.addEventListener("click", enableVoice);
send.addEventListener("click", () => handle(input.value));
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handle(input.value);
});
$("#mic").addEventListener("click", async () => {
  await enableVoice();
  startMic(handle);
});
document.querySelectorAll(".qa[data-dest]").forEach((button) => {
  button.addEventListener("click", () => handle(button.dataset.dest));
});
