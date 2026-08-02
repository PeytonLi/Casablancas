import { initAvatar, setState } from "./avatar.js";
import { initVoice, sing, speak, startMic, stopVoice } from "./voice.js";
import { getDemoReply } from "./lib/conversation.js";

const avatar = document.querySelector("#avatar");
const answer = document.querySelector("#answer");
const form = document.querySelector("#prompt-form");
const input = document.querySelector("#input");
const mic = document.querySelector("#mic");
const singButton = document.querySelector("#sing");
const talkLabel = mic.querySelector(".talk-label");
const singLabel = singButton.querySelector(".sing-label");

let activeMode = "idle";
let responseTimer;

initAvatar(avatar);

function syncButtons(mode) {
  activeMode = mode;
  mic.classList.toggle("active", mode === "listening");
  mic.classList.toggle("show-stop", mode === "speaking");
  singButton.classList.toggle("show-stop", mode === "singing");
  talkLabel.textContent = mode === "speaking" ? "Stop" : mode === "listening" ? "Listening…" : "Talk";
  singLabel.textContent = mode === "singing" ? "Stop performance" : "Sing an original hook";
}

function changeState(mode) {
  setState(mode);
  syncButtons(mode);
}

async function respondTo(prompt) {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return;

  window.clearTimeout(responseTimer);
  changeState("thinking");
  answer.textContent = "…";
  responseTimer = window.setTimeout(async () => {
    const reply = getDemoReply(cleanPrompt);
    answer.textContent = reply;
    changeState("speaking");
    await speak(reply);
    syncButtons("idle");
  }, 480);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = input.value;
  input.value = "";
  respondTo(prompt);
});

mic.addEventListener("click", async () => {
  await initVoice();
  if (activeMode === "speaking" || activeMode === "listening") {
    stopVoice();
    syncButtons("idle");
    return;
  }

  const started = startMic(
    (transcript, isFinal) => {
      input.value = transcript;
      answer.textContent = isFinal ? "…" : transcript;
      if (isFinal) {
        input.value = "";
        respondTo(transcript);
      }
    },
    () => {
      answer.textContent = "Microphone input isn’t available here. Type your question instead.";
      input.focus();
    },
    () => syncButtons("idle"),
  );
  if (started) syncButtons("listening");
});

singButton.addEventListener("click", async () => {
  if (activeMode === "singing") {
    stopVoice();
    syncButtons("idle");
    return;
  }

  await sing();
  syncButtons("singing");
  window.setTimeout(() => syncButtons("idle"), 5000);
});

window.addEventListener("beforeunload", stopVoice);
