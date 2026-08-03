import { setLyric, setState } from "./avatar.js";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let audioContext;
let timers = [];
let initialized = false;

function chooseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const preferences = [
    /Ava.*Premium/i,
    /Serena/i,
    /Samantha/i,
    /Google UK English Female/i,
    /female/i,
  ];

  for (const preference of preferences) {
    const match = voices.find((voice) => preference.test(voice.name));
    if (match) return match;
  }

  return voices.find((voice) => voice.lang?.startsWith("en")) || voices[0];
}

function clearTimers() {
  timers.forEach(window.clearTimeout);
  timers = [];
}

export async function initVoice() {
  if (initialized) return;
  initialized = true;
  window.speechSynthesis?.getVoices?.();

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    audioContext = new AudioContext();
    await audioContext.suspend();
  }
}

export function stopVoice() {
  clearTimers();
  recognition?.abort?.();
  window.speechSynthesis?.cancel?.();
  setLyric("");
  setState("idle");
}

export function speak(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      setState("idle");
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chooseVoice();

    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    utterance.onstart = () => setState("speaking");
    utterance.onend = () => {
      setState("idle");
      resolve();
    };
    utterance.onerror = () => {
      setState("idle");
      resolve();
    };

    setState("speaking");
    window.speechSynthesis.speak(utterance);
  });
}

function makeVocalNote(context, destination, frequency, start, duration) {
  const carrier = context.createOscillator();
  const overtone = context.createOscillator();
  const carrierGain = context.createGain();
  const overtoneGain = context.createGain();
  const filter = context.createBiquadFilter();

  carrier.type = "sine";
  carrier.frequency.setValueAtTime(frequency, start);
  overtone.type = "triangle";
  overtone.frequency.setValueAtTime(frequency * 2, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1550, start);
  filter.Q.setValueAtTime(1.2, start);

  carrierGain.gain.setValueAtTime(0.0001, start);
  carrierGain.gain.exponentialRampToValueAtTime(0.15, start + 0.05);
  carrierGain.gain.setValueAtTime(0.13, start + duration * 0.62);
  carrierGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  overtoneGain.gain.setValueAtTime(0.0001, start);
  overtoneGain.gain.exponentialRampToValueAtTime(0.035, start + 0.06);
  overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  carrier.connect(carrierGain).connect(filter);
  overtone.connect(overtoneGain).connect(filter);
  filter.connect(destination);
  carrier.start(start);
  overtone.start(start);
  carrier.stop(start + duration + 0.02);
  overtone.stop(start + duration + 0.02);
}

export async function sing() {
  stopVoice();
  await initVoice();

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContext();
  await audioContext.resume();

  const master = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  master.gain.value = 0.82;
  master.connect(compressor).connect(audioContext.destination);

  const notes = [
    [329.63, 0.45], [392, 0.45], [440, 0.75], [392, 0.4],
    [493.88, 0.45], [523.25, 0.45], [493.88, 0.75], [440, 1],
  ];
  const lyrics = ["Light", "it", "up", "we", "own", "the", "night", "tonight"];
  const start = audioContext.currentTime + 0.08;
  let cursor = 0;

  setState("singing");
  notes.forEach(([frequency, duration], index) => {
    makeVocalNote(audioContext, master, frequency, start + cursor, duration);
    timers.push(window.setTimeout(() => setLyric(lyrics[index]), cursor * 1000));
    cursor += duration;
  });

  timers.push(window.setTimeout(() => {
    setLyric("");
    setState("idle");
  }, cursor * 1000 + 180));
}

export function startMic(onTranscript, onUnavailable, onEnd) {
  if (!SpeechRecognition) {
    onUnavailable?.();
    return false;
  }

  stopVoice();
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => setState("listening");
  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("")
      .trim();
    const isFinal = event.results[event.results.length - 1].isFinal;
    onTranscript(text, isFinal);
  };
  recognition.onerror = () => {
    setState("idle");
    onEnd?.();
  };
  recognition.onend = () => {
    setState("idle");
    onEnd?.();
  };
  recognition.start();
  return true;
}
