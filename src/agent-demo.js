import { ask, transcribe } from "./api.js";
import { initAvatar } from "./avatar.js";
import { initVoice, speak, startMic } from "./voice.js";

const form = document.querySelector("#ask-form");
const input = document.querySelector("#input");
const submit = form.querySelector("button[type=submit]");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const answer = document.querySelector("#answer");
const sourceBlock = document.querySelector("#source-block");
const sources = document.querySelector("#sources");
const playVoice = document.querySelector("#play-voice");
const mic = document.querySelector("#mic");
const autoVoice = document.querySelector("#auto-voice");

let speech = "";
let recorder;

initAvatar(document.querySelector("#avatar"));

document.querySelectorAll(".prompts button").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.textContent.trim();
    input.focus();
  });
});

mic.addEventListener("click", async () => {
  if (recorder?.state === "recording") {
    recorder.stop();
    return;
  }
  await initVoice();
  setListening(true);
  const recognition = startMic((transcript) => {
    input.value = transcript;
    setListening(false);
    form.requestSubmit();
  });
  if (!recognition) {
    await recordQuestion();
    return;
  }
  recognition.addEventListener("error", () => {
    setListening(false);
    status.textContent = "Microphone access failed. Allow microphone permission or type your question.";
    status.classList.add("is-error");
  }, { once: true });
  recognition.addEventListener("end", () => setListening(false), { once: true });
});

async function recordQuestion() {
  const mimeType = ["audio/webm;codecs=opus", "audio/webm"]
    .find((type) => globalThis.MediaRecorder?.isTypeSupported(type));
  if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
    setListening(false);
    status.textContent = "Voice recording is unavailable in this browser. Type your question instead.";
    status.classList.add("is-error");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType });
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", async () => {
      stream.getTracks().forEach((track) => track.stop());
      const audio = new Blob(chunks, { type: mimeType });
      recorder = undefined;
      setListening(false);
      mic.disabled = true;
      status.textContent = "Transcribing your question…";
      let submitted = false;
      try {
        input.value = await transcribe(audio);
        submitted = true;
        form.requestSubmit();
      } catch (error) {
        console.error(error);
        status.textContent = "The recording could not be transcribed. Try again or type your question.";
        status.classList.add("is-error");
      } finally {
        if (!submitted) mic.disabled = false;
      }
    }, { once: true });
    recorder.start();
    setListening(true, "■ Stop & ask");
  } catch (error) {
    console.error(error);
    recorder = undefined;
    setListening(false);
    status.textContent = "Microphone access failed. Allow microphone permission or type your question.";
    status.classList.add("is-error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return input.focus();

  setBusy(true, "Searching JamBase and trusted music sources…");
  result.hidden = true;

  try {
    await initVoice();
    const response = await ask(question);
    speech = response.speech;
    answer.textContent = plainText(response.answer);
    renderSources(response.sources);
    result.hidden = false;
    status.textContent = "Answer ready.";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
    if (autoVoice.checked) void playAnswer();
  } catch (error) {
    console.error(error);
    status.textContent = "The agent could not answer. Check the connection and try again.";
    status.classList.add("is-error");
  } finally {
    setBusy(false);
  }
});

playVoice.addEventListener("click", playAnswer);

async function playAnswer() {
  const text = speech;
  if (!text) return;
  playVoice.disabled = true;
  playVoice.textContent = "Loading voice…";
  status.textContent = "Generating the ElevenLabs voice…";
  await speak(text);
  if (text === speech) {
    playVoice.disabled = false;
    playVoice.textContent = "▶ Play voice";
    status.textContent = "Answer ready.";
  }
}

function setBusy(busy, message = "") {
  submit.disabled = busy;
  mic.disabled = busy;
  input.disabled = busy;
  if (busy) status.classList.remove("is-error");
  if (message) status.textContent = message;
}

function setListening(listening, label = "● Listening…") {
  mic.classList.toggle("is-listening", listening);
  mic.textContent = listening ? label : "● Talk";
  mic.setAttribute("aria-pressed", String(listening));
  if (listening) status.textContent = "Listening—ask your music question.";
}

function renderSources(items) {
  sources.replaceChildren();

  for (const source of items) {
    let url;
    try {
      url = new URL(source.url);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(url.protocol)) continue;

    const link = document.createElement("a");
    link.href = url.href;
    link.textContent = source.label || url.hostname;
    link.target = "_blank";
    link.rel = "nofollow noopener";

    const item = document.createElement("li");
    item.append(link);
    sources.append(item);
  }

  sourceBlock.hidden = !sources.childElementCount;
}

function plainText(text) {
  return text
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}
