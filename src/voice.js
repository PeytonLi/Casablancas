import { setState } from "./avatar.js";
import { tts } from "./api.js";

const audio = new Audio();
const jingleUrl = new URL("../assets/jingle.mp3", import.meta.url).href;

let audioContext;
let finishPlayback;

export async function initVoice() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  try {
    audioContext ||= AudioContext && new AudioContext();
    await audioContext?.resume();
    audio.preload = "auto";
  } catch (error) {
    console.warn("Audio could not be initialized; typed input still works.", error);
  }
}

export async function speak(text) {
  if (!text?.trim()) return;

  let url;
  try {
    url = await tts(text.trim());
    if (!url) throw new Error("The TTS endpoint returned no audio.");
    await play(url, "speaking");
  } catch (error) {
    console.warn("Speech playback failed.", error);
    setState("idle");
  } finally {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

export async function sing() {
  await play(jingleUrl, "singing");
}

export function startMic(onTranscript) {
  const SpeechRecognition =
    window.webkitSpeechRecognition || window.SpeechRecognition;
  const input = document.querySelector("#input");

  if (!SpeechRecognition) {
    input?.focus();
    return null;
  }

  const recognition = new SpeechRecognition();
  let submitted = false;

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  recognition.onstart = () => setState("listening");
  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += text;
      else interimText += text;
    }

    const visibleText = (finalText || interimText).trim();
    if (input && visibleText) input.value = visibleText;

    if (finalText.trim()) {
      submitted = true;
      setState("idle");
      onTranscript(finalText.trim());
    }
  };
  recognition.onerror = (event) => {
    console.warn(`Speech recognition failed: ${event.error}`);
    setState("idle");
    input?.focus();
  };
  recognition.onend = () => {
    if (!submitted) setState("idle");
  };

  try {
    recognition.start();
    return recognition;
  } catch (error) {
    console.warn("Speech recognition could not start.", error);
    setState("idle");
    input?.focus();
    return null;
  }
}

function play(url, state) {
  finishPlayback?.();

  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      audio.onended = null;
      audio.onerror = null;
      finishPlayback = null;
      setState("idle");
      resolve();
    };

    finishPlayback = finish;
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    audio.onended = finish;
    audio.onerror = finish;
    setState(state);
    audio.play().catch((error) => {
      console.warn("Audio playback failed.", error);
      finish();
    });
  });
}
