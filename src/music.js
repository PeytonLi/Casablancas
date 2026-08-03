const TRACK_MANIFEST_URL = "/public/audio/manifest.json";
const FALLBACK_DURATION_SECONDS = 18;

// These are intentionally original, compact radio sketches rather than copies
// of the named songs. A licensed local/device file always takes precedence.
const TRACK_CATALOG = [
  {
    id: "360",
    title: "360",
    bpm: 128,
    file: "360.mp3",
    emotion: "confident",
    danceProfile: 0,
    arrangement: {
      root: 45,
      progression: [0, 3, 7, 5],
      bass: [0, null, 0, 7, 0, null, 3, null, 0, 7, null, 3, 5, null, 7, null],
      lead: [12, null, 15, null, 19, null, 15, null, 12, null, 19, 17, null, 15, null, null],
      vocalSteps: [0, 2, 4, 6, 10, 11, 13],
      wave: "triangle",
      color: 1900,
      kick: [0, 4, 8, 12],
      hats: "even",
    },
  },
  {
    id: "von-dutch",
    title: "Von dutch",
    bpm: 132,
    file: "von-dutch.mp3",
    emotion: "playful",
    danceProfile: 1,
    arrangement: {
      root: 42,
      progression: [0, 0, 5, 3],
      bass: [0, 0, null, 0, 7, null, 0, null, 0, null, 5, 5, 3, null, 7, null],
      lead: [12, null, null, 12, 17, null, 15, null, 12, 12, null, 19, null, 17, null, null],
      vocalSteps: [0, 3, 4, 8, 9, 11, 13],
      wave: "sawtooth",
      color: 1250,
      kick: [0, 3, 6, 8, 11, 12, 14],
      hats: "all",
    },
  },
  {
    id: "apple",
    title: "Apple",
    bpm: 124,
    file: "apple.mp3",
    emotion: "intense",
    danceProfile: 2,
    arrangement: {
      root: 48,
      progression: [0, 7, 9, 5],
      bass: [0, null, 7, null, 0, null, 4, 7, 9, null, 4, null, 5, null, 7, null],
      lead: [16, null, 19, 21, null, 19, null, 16, 14, null, 16, null, 21, 19, null, null],
      vocalSteps: [0, 2, 3, 5, 8, 10, 12, 13],
      wave: "triangle",
      color: 2600,
      kick: [0, 4, 8, 12],
      hats: "skip",
    },
  },
  {
    id: "club-classics",
    title: "Club classics",
    bpm: 136,
    file: "club-classics.mp3",
    emotion: "euphoric",
    danceProfile: 3,
    arrangement: {
      root: 38,
      progression: [0, 5, 7, 3],
      bass: [0, null, 0, null, 5, null, 7, 7, 0, null, 12, null, 7, null, 3, null],
      lead: [12, null, 12, 15, null, 17, null, 19, 12, null, 22, null, 19, 17, 15, null],
      vocalSteps: [0, 2, 3, 6, 8, 10, 12, 14],
      wave: "square",
      color: 1550,
      kick: [0, 4, 8, 10, 12, 14],
      hats: "all",
    },
  },
  {
    id: "b2b",
    title: "B2b",
    bpm: 130,
    file: "b2b.mp3",
    emotion: "confident",
    danceProfile: 0,
    arrangement: {
      root: 43,
      progression: [0, 5, 3, 7],
      bass: [0, null, 0, 7, 5, null, 3, null, 0, 7, null, 5, 3, null, 7, null],
      lead: [12, null, 15, null, 17, null, 15, null, 19, null, 17, 15, null, 12, null, null],
      vocalSteps: [0, 2, 4, 6, 8, 10, 11, 13],
      wave: "sawtooth",
      color: 1750,
      kick: [0, 4, 7, 8, 12, 14],
      hats: "all",
    },
  },
  {
    id: "talk-talk",
    title: "Talk talk",
    bpm: 126,
    file: "talk-talk.mp3",
    emotion: "playful",
    danceProfile: 1,
    arrangement: {
      root: 40,
      progression: [0, 3, 5, 7],
      bass: [0, null, 0, null, 3, null, 5, null, 0, 7, null, 5, 3, null, 7, null],
      lead: [12, null, 15, null, 17, 15, null, 12, 19, null, 17, null, 15, 12, null, null],
      vocalSteps: [0, 2, 4, 5, 8, 10, 12, 13],
      wave: "triangle",
      color: 2100,
      kick: [0, 4, 6, 8, 12, 14],
      hats: "even",
    },
  },
  {
    id: "guess",
    title: "Guess",
    bpm: 134,
    file: "guess.mp3",
    emotion: "intense",
    danceProfile: 2,
    arrangement: {
      root: 46,
      progression: [0, 7, 5, 3],
      bass: [0, null, 7, null, 0, 5, null, 7, 0, null, 5, null, 3, 7, null, null],
      lead: [16, null, 19, null, 21, 19, null, 16, 14, null, 19, null, 21, 19, 16, null],
      vocalSteps: [0, 2, 4, 5, 8, 10, 12, 14],
      wave: "sawtooth",
      color: 2450,
      kick: [0, 3, 4, 7, 8, 11, 12, 14],
      hats: "skip",
    },
  },
  {
    id: "365",
    title: "365",
    bpm: 138,
    file: "365.mp3",
    emotion: "euphoric",
    danceProfile: 3,
    arrangement: {
      root: 50,
      progression: [0, 5, 9, 7],
      bass: [0, null, 0, 5, 7, null, 9, null, 0, 7, null, 9, 5, null, 7, null],
      lead: [19, null, 22, 24, null, 22, 19, null, 17, null, 19, 22, null, 24, 22, null],
      vocalSteps: [0, 2, 3, 5, 8, 10, 11, 13],
      wave: "square",
      color: 2800,
      kick: [0, 4, 7, 8, 10, 12, 14],
      hats: "all",
    },
  },
];

function publicTrack({ id, title, bpm, file, emotion, danceProfile }) {
  return { id, title, bpm, file, emotion, danceProfile };
}

const sources = TRACK_CATALOG.map((track) => ({
  localUrl: `/public/audio/${track.file}`,
  localReady: false,
  checkedAt: 0,
  objectUrl: null,
  fileName: null,
}));

let preparationPromise;
let audioContext;
let audioElement;
let mediaSource;
let analyser;
let analyserData;
let frequencyData;
let pulseTimer;
let synthScheduler;
let synthFinishTimer;
let pulseCallback;
let completionCallback;
let activeSession = 0;
let currentTrack;
let lastStep = -1;
let lastVocal = false;
let smoothedLevel = 0;
let synthActive = false;
let synthStartedAt = 0;
let synthNextStep = 0;
let synthNextTime = 0;
let synthMaster;
let synthSources = new Set();
let noiseBuffer;
let noiseBufferContext;

function sourceFor(index) {
  const source = sources[index];
  if (!source) return null;
  return source.objectUrl || (source.localReady ? source.localUrl : null);
}

function playbackTime() {
  if (audioElement) return audioElement.currentTime;
  if (synthActive && audioContext) return Math.max(0, audioContext.currentTime - synthStartedAt);
  return 0;
}

async function loadLocalManifest() {
  try {
    const response = await fetch(TRACK_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) return [];
    const manifest = await response.json();
    return Array.isArray(manifest?.files) ? manifest.files : [];
  } catch {
    return [];
  }
}

async function ensureAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext || audioContext.state === "closed") audioContext = new AudioContext();
  if (audioContext.state === "suspended") await audioContext.resume();
  return audioContext;
}

function vocalBandLevel() {
  if (!analyser || !frequencyData) return 0;
  analyser.getByteFrequencyData(frequencyData);
  const nyquist = (audioContext?.sampleRate ?? 48000) / 2;
  const binWidth = nyquist / frequencyData.length;
  const firstBin = Math.max(1, Math.floor(260 / binWidth));
  const lastBin = Math.min(frequencyData.length - 1, Math.ceil(3600 / binWidth));
  let energy = 0;
  for (let index = firstBin; index <= lastBin; index += 1) energy += frequencyData[index] / 255;
  return energy / Math.max(1, lastBin - firstBin + 1);
}

function emitPulse(track) {
  if (!isTrackPlaying()) return;

  const stepDuration = 60 / track.bpm / 4;
  const step = Math.floor(playbackTime() / stepDuration) % 16;
  const level = getAudioLevel();
  const vocalBand = vocalBandLevel();
  smoothedLevel += (level - smoothedLevel) * 0.32;

  // The analyser opens the mouth only when there is audible mid-band energy.
  // A brief rest at the end of each phrase prevents permanent "singing mouth".
  const phraseRest = step === 7 || step === 15;
  const arrangement = currentTrack === null ? null : TRACK_CATALOG[currentTrack].arrangement;
  const syntheticPhrase = synthActive && arrangement?.vocalSteps.includes(step);
  const vocal = synthActive
    ? Boolean(syntheticPhrase && !phraseRest && smoothedLevel > 0.006)
    : !phraseRest && smoothedLevel > 0.018 && vocalBand > 0.055;
  if (step === lastStep && vocal === lastVocal) return;

  lastStep = step;
  lastVocal = vocal;
  const visemeHints = ["m", "ah", "ee", "oh"];
  try {
    pulseCallback?.({
      step,
      vocal,
      word: vocal ? visemeHints[step % visemeHints.length] : "",
      title: track.title,
      level,
      vocalBand,
      downbeat: step % 4 === 0,
    });
  } catch (error) {
    console.warn("The music visualizer callback failed.", error);
  }
}

function monitorTrack(track) {
  pulseTimer = window.setInterval(() => emitPulse(track), 34);
}

function resetPlaybackState() {
  if (pulseTimer) window.clearInterval(pulseTimer);
  if (synthScheduler) window.clearInterval(synthScheduler);
  if (synthFinishTimer) window.clearTimeout(synthFinishTimer);
  pulseTimer = null;
  synthScheduler = null;
  synthFinishTimer = null;
  pulseCallback = null;
  completionCallback = null;
  lastStep = -1;
  lastVocal = false;
  smoothedLevel = 0;
  currentTrack = null;
  synthActive = false;
  synthStartedAt = 0;
  synthNextStep = 0;
  synthNextTime = 0;

  const element = audioElement;
  audioElement = null;
  if (element) {
    element.pause();
    element.removeAttribute("src");
    element.load();
  }
  mediaSource?.disconnect();
  mediaSource = null;
  for (const source of synthSources) {
    try {
      source.stop();
    } catch {
      // The source may already have naturally ended.
    }
    source.disconnect();
  }
  synthSources.clear();
  synthMaster?.disconnect();
  synthMaster = null;
  analyser?.disconnect();
  analyser = null;
  analyserData = null;
  frequencyData = null;
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function rememberSynthSource(source) {
  synthSources.add(source);
  source.addEventListener("ended", () => {
    synthSources.delete(source);
    source.disconnect();
  }, { once: true });
}

function scheduleTone(context, destination, {
  frequency,
  when,
  duration,
  gain = 0.05,
  type = "triangle",
  filterFrequency = 2200,
  attack = 0.008,
  detune = 0,
}) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  oscillator.detune.setValueAtTime(detune, when);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFrequency, when);
  filter.Q.setValueAtTime(1.1, when);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(gain, when + Math.min(attack, duration * 0.3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(filter).connect(envelope).connect(destination);
  rememberSynthSource(oscillator);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.03);
}

function scheduleKick(context, destination, when, accent = 1) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(152, when);
  oscillator.frequency.exponentialRampToValueAtTime(43, when + 0.16);
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.24 * accent, when + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
  oscillator.connect(envelope).connect(destination);
  rememberSynthSource(oscillator);
  oscillator.start(when);
  oscillator.stop(when + 0.27);
}

function getNoiseBuffer(context) {
  if (noiseBuffer && noiseBufferContext === context) return noiseBuffer;
  const length = Math.floor(context.sampleRate * 0.36);
  noiseBuffer = context.createBuffer(1, length, context.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }
  noiseBufferContext = context;
  return noiseBuffer;
}

function scheduleNoise(context, destination, when, { hat = false, open = false } = {}) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const duration = hat ? (open ? 0.14 : 0.045) : 0.16;
  source.buffer = getNoiseBuffer(context);
  filter.type = hat ? "highpass" : "bandpass";
  filter.frequency.setValueAtTime(hat ? 6700 : 1850, when);
  filter.Q.setValueAtTime(hat ? 0.7 : 1.4, when);
  envelope.gain.setValueAtTime(hat ? 0.025 : 0.07, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter).connect(envelope).connect(destination);
  rememberSynthSource(source);
  source.start(when);
  source.stop(when + duration + 0.02);
}

function scheduleChord(context, destination, when, rootNote, arrangement, duration) {
  const minor = rootNote % 12 === 2 || rootNote % 12 === 6 || rootNote % 12 === 9;
  const intervals = [0, minor ? 3 : 4, 7];
  intervals.forEach((interval, index) => {
    scheduleTone(context, destination, {
      frequency: midiToFrequency(rootNote + 12 + interval),
      when,
      duration,
      gain: 0.023,
      type: index === 1 ? "triangle" : arrangement.wave,
      filterFrequency: arrangement.color * 0.72,
      attack: 0.12,
      detune: index === 2 ? 5 : index === 0 ? -4 : 0,
    });
  });
}

function scheduleVocalChop(context, destination, when, note, arrangement, duration) {
  [0, 7].forEach((detune, index) => {
    scheduleTone(context, destination, {
      frequency: midiToFrequency(note),
      when: when + index * 0.004,
      duration,
      gain: index === 0 ? 0.044 : 0.018,
      type: index === 0 ? arrangement.wave : "sine",
      filterFrequency: arrangement.color + (note % 5) * 260,
      attack: 0.012,
      detune: index === 0 ? -detune : detune,
    });
  });
}

function scheduleSynthStep(context, track, arrangement, stepNumber, when) {
  const step = stepNumber % 16;
  const bar = Math.floor(stepNumber / 16);
  const stepDuration = 60 / track.bpm / 4;
  const chordOffset = arrangement.progression[bar % arrangement.progression.length];
  const rootNote = arrangement.root + chordOffset;

  if (arrangement.kick.includes(step)) scheduleKick(context, synthMaster, when, step === 0 ? 1.14 : 1);
  if (step === 4 || step === 12) scheduleNoise(context, synthMaster, when);
  const playHat = arrangement.hats === "all"
    || (arrangement.hats === "even" && step % 2 === 0)
    || (arrangement.hats === "skip" && step % 4 !== 0);
  if (playHat) scheduleNoise(context, synthMaster, when, { hat: true, open: step === 14 });

  const bassOffset = arrangement.bass[step];
  if (bassOffset !== null) {
    scheduleTone(context, synthMaster, {
      frequency: midiToFrequency(rootNote + bassOffset),
      when,
      duration: stepDuration * 1.65,
      gain: 0.08,
      type: arrangement.wave === "square" ? "square" : "sawtooth",
      filterFrequency: 420 + (step % 4) * 55,
    });
  }

  if (step === 0) scheduleChord(context, synthMaster, when, rootNote, arrangement, stepDuration * 14.5);

  const leadOffset = arrangement.lead[step];
  if (leadOffset !== null && arrangement.vocalSteps.includes(step)) {
    scheduleVocalChop(
      context,
      synthMaster,
      when,
      rootNote + leadOffset,
      arrangement,
      stepDuration * (step % 3 === 0 ? 1.7 : 0.9),
    );
  }
}

function runSynthScheduler(session, track, arrangement) {
  if (!synthActive || session !== activeSession || !audioContext) return;
  const horizon = audioContext.currentTime + 0.18;
  while (synthNextTime < horizon && synthNextTime - synthStartedAt < FALLBACK_DURATION_SECONDS) {
    scheduleSynthStep(audioContext, track, arrangement, synthNextStep, synthNextTime);
    synthNextStep += 1;
    synthNextTime += 60 / track.bpm / 4;
  }
}

function startSynthTrack(index, track, onPulse, onEnded, context) {
  const arrangement = TRACK_CATALOG[index].arrangement;
  const session = ++activeSession;
  analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.58;
  analyserData = new Uint8Array(analyser.fftSize);
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  synthMaster = context.createGain();
  synthMaster.gain.setValueAtTime(0.68, context.currentTime);
  synthMaster.connect(analyser).connect(context.destination);

  pulseCallback = typeof onPulse === "function" ? onPulse : null;
  completionCallback = typeof onEnded === "function" ? onEnded : null;
  currentTrack = index;
  lastStep = -1;
  lastVocal = false;
  smoothedLevel = 0;
  synthActive = true;
  synthStartedAt = context.currentTime + 0.025;
  synthNextTime = synthStartedAt;
  synthNextStep = 0;

  runSynthScheduler(session, track, arrangement);
  synthScheduler = window.setInterval(() => runSynthScheduler(session, track, arrangement), 25);
  synthFinishTimer = window.setTimeout(
    () => finishSession(session, "ended"),
    FALLBACK_DURATION_SECONDS * 1000,
  );
  monitorTrack(track);
  emitPulse(track);
  return { ok: true, track: publicTrack(track), source: "built-in", fileName: null };
}

function finishSession(session, reason, error = null) {
  if (session !== activeSession || currentTrack === null) return;
  const finishedTrack = currentTrack;
  const callback = completionCallback;

  // Invalidate the session before touching the media element. Calling load()
  // can dispatch another media event in some browsers.
  activeSession += 1;
  resetPlaybackState();
  try {
    callback?.({ reason, index: finishedTrack, track: publicTrack(TRACK_CATALOG[finishedTrack]), error });
  } catch (callbackError) {
    console.warn("The radio completion callback failed.", callbackError);
  }
}

function mediaErrorMessage(element, track) {
  const messages = {
    1: "Playback was interrupted.",
    2: "The audio file could not be read.",
    3: "The audio file could not be decoded.",
    4: "This audio format is not supported.",
  };
  return messages[element.error?.code] || `The ${track.title} audio file could not be played.`;
}

export function getTracks() {
  return TRACK_CATALOG.map(publicTrack);
}

export function prepareTrackSources({ force = false } = {}) {
  if (preparationPromise) return preparationPromise;
  const now = Date.now();
  if (!force && sources.every((source) => source.checkedAt && now - source.checkedAt < 5000)) {
    return Promise.resolve(TRACK_CATALOG.map(() => true));
  }

  preparationPromise = loadLocalManifest().then((files) => {
    const availableFiles = new Set(files);
    return sources.map((source, index) => {
      source.localReady = availableFiles.has(TRACK_CATALOG[index].file);
      source.checkedAt = now;
      return true;
    });
  }).finally(() => {
    preparationPromise = null;
  });
  return preparationPromise;
}

export function hasTrackSource(index) {
  return Boolean(TRACK_CATALOG[index]);
}

export function setTrackFile(index, file) {
  const source = sources[index];
  if (!source || typeof File === "undefined" || !(file instanceof File)) return false;
  const extensionLooksLikeAudio = /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(file.name);
  const mimeLooksLikeAudio = file.type.startsWith("audio/");
  if (!mimeLooksLikeAudio && !extensionLooksLikeAudio) return false;

  if (source.objectUrl) URL.revokeObjectURL(source.objectUrl);
  source.objectUrl = URL.createObjectURL(file);
  source.fileName = file.name;
  return true;
}

export function isTrackPlaying() {
  return synthActive || Boolean(audioElement && !audioElement.paused && !audioElement.ended);
}

export function getAudioLevel() {
  if (!analyser || !analyserData || !isTrackPlaying()) return 0;
  analyser.getByteTimeDomainData(analyserData);
  let energy = 0;
  for (const sample of analyserData) {
    const normalized = (sample - 128) / 128;
    energy += normalized * normalized;
  }
  return Math.sqrt(energy / analyserData.length);
}

export async function startTrack(index, onPulse, onEnded) {
  stopTrack();
  const requestSession = activeSession;
  const track = TRACK_CATALOG[index];
  if (!track) {
    return { ok: false, reason: "missing-track", message: "That track is not in this radio." };
  }

  let source = sourceFor(index);
  if (!source) {
    await prepareTrackSources({ force: true });
    source = sourceFor(index);
  }
  if (requestSession !== activeSession) {
    return { ok: false, reason: "superseded", message: "A newer track was selected." };
  }
  let context;
  try {
    context = await ensureAudioContext();
  } catch {
    return { ok: false, reason: "playback-blocked", message: "Tap the track again to allow audio playback." };
  }
  if (requestSession !== activeSession) {
    return { ok: false, reason: "superseded", message: "A newer track was selected." };
  }
  if (!context) {
    return { ok: false, reason: "unsupported", message: "Audio playback is unavailable in this browser." };
  }

  if (!source) return startSynthTrack(index, track, onPulse, onEnded, context);

  const session = ++activeSession;
  const element = new Audio();
  element.preload = "auto";
  element.playsInline = true;
  element.loop = false;
  element.volume = 0.92;
  element.src = source;
  audioElement = element;

  try {
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.58;
    analyserData = new Uint8Array(analyser.fftSize);
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    mediaSource = context.createMediaElementSource(element);
    mediaSource.connect(analyser).connect(context.destination);
  } catch {
    activeSession += 1;
    resetPlaybackState();
    return {
      ok: false,
      reason: "playback-failed",
      message: `The ${track.title} audio file could not be connected to the performer.`,
    };
  }

  pulseCallback = typeof onPulse === "function" ? onPulse : null;
  completionCallback = typeof onEnded === "function" ? onEnded : null;
  currentTrack = index;
  lastStep = -1;
  lastVocal = false;
  smoothedLevel = 0;

  element.addEventListener("ended", () => finishSession(session, "ended"), { once: true });
  element.addEventListener("error", () => {
    if (session !== activeSession) return;
    finishSession(session, "error", mediaErrorMessage(element, track));
  }, { once: true });

  try {
    await element.play();
  } catch (error) {
    if (session === activeSession) {
      activeSession += 1;
      resetPlaybackState();
    }
    const blocked = error instanceof DOMException && error.name === "NotAllowedError";
    return {
      ok: false,
      reason: blocked ? "playback-blocked" : "playback-failed",
      message: blocked
        ? "Tap the track again to allow audio playback."
        : `The ${track.title} audio file could not be played.`,
    };
  }

  if (session !== activeSession) {
    return { ok: false, reason: "superseded", message: "A newer track is already playing." };
  }

  monitorTrack(track);
  emitPulse(track);
  return {
    ok: true,
    track: publicTrack(track),
    source: source.startsWith("blob:") ? "device" : "local",
    fileName: sources[index].fileName,
  };
}

export function stopTrack() {
  activeSession += 1;
  resetPlaybackState();
}
