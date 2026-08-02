let app;
let avatar;
let label;
let caption;
let liveDot;

const modeLabels = {
  idle: "Ready",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking",
  singing: "Performing",
};

export function initAvatar(element) {
  avatar = element;
  app = document.querySelector("#app");
  label = document.querySelector("#mode-label");
  caption = avatar.querySelector(".performance-caption");
  liveDot = avatar.querySelector(".live-dot");
  setState("idle");
}

export function setState(state) {
  if (!app || !avatar) return;

  app.className = `app-shell mode-${state}`;
  avatar.classList.toggle("is-performing", state === "speaking" || state === "singing");
  label.textContent = modeLabels[state] || modeLabels.idle;
  liveDot.classList.toggle("active", state === "speaking" || state === "singing");
}

export function setLyric(text = "") {
  if (!caption) return;
  caption.textContent = text;
  caption.classList.toggle("visible", Boolean(text));
}
