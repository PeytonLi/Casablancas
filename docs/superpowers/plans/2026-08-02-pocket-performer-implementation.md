# Pocket Performer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected multi-panel demo with one polished phone containing a fictional electro-pop performer who starts a synchronized original song when the dial is released and whose stage energy responds to continued dial rotation.

**Architecture:** Keep the existing zero-build vanilla ES-module application. Pure performance data, avatar state, and dial math live in isolated modules with Node tests; the browser layer owns media playback, cues, energy effects, and DOM orchestration. An Image Gen asset pass creates five identity-preserving performance poses from the approved source performer, then a deterministic local renderer combines those poses with locally synthesized original audio into six registered WebPs and three self-contained portrait MP4 performances.

**Tech Stack:** Semantic HTML, modern CSS, vanilla JavaScript ES modules, Node built-in test runner, Web Audio API, macOS `say`, FFmpeg/ffprobe, Python static server for local preview.

## Global Constraints

- Match `docs/concepts/pocket-performer-concept.png` and `docs/superpowers/specs/2026-08-02-pocket-performer-design.md`.
- The inner phone viewport is `390 × 844`; the avatar owns the upper 72% and the controls own the lower 28%.
- Use only `01 STATIC HEART`, `02 AFTERIMAGE`, and `03 NEON FEVER`, with the original lyrics, BPM, duration, and colors recorded in the design spec.
- Choose mode has detents at `−48°`, `0°`, and `+48°`, an `8°` hysteresis band, and a `140ms` snap; releasing a selected detent starts playback.
- Performance mode begins at 20 energy; `120°` of relative rotation spans 0–100; tap pauses/resumes; a `500ms` hold or song-title tap returns to choose mode.
- The energy dial changes glow, saturation, camera push, particles, audio filter, and gain, but never playback speed.
- Use the existing fictional performer source at `public/charli-performer.png`; do not name or claim a real artist and do not use copyrighted songs or cloned voices.
- Performance clips are `780 × 1688`, 24fps, H.264/AAC MP4 with local pose fallback, and all runtime cues follow `video.currentTime`.
- No chat, conversation, map, tickets, navigation, marketing copy, permanent play button, or timeline.
- Preserve unrelated working-tree files and never stage `DESIGN_SPEC.md`, `assets/`, `data/`, `src/map.js`, `src/music.js`, or `src/performer-rig.js` unless a later explicit decision changes scope.
- Keep verification demo-sized: module syntax, focused state/dial tests, media decode, and one browser happy path at phone size.

---

## File Structure

- `index.html`: the complete phone, stage, dial, accessible song buttons, controls sheet, and media elements.
- `src/styles.css`: design tokens, phone/stage composition, tactile dial, energy effects, animation, accessibility, and responsive layout.
- `src/performance-data.js`: immutable song metadata, media paths, lyrics, beats, effects, colors, and detent angles.
- `src/avatar.js`: pure avatar state reducer and state-machine wrapper; the only owner of application mode.
- `src/dial-controller.js`: pure dial math plus pointer, wheel, tap/hold, and keyboard interaction.
- `src/performance-player.js`: video load/play/pause/stop, selected source, media-clock access, and audio energy filter/gain graph.
- `src/cue-player.js`: derives active lyric, beats, and effects from media time without timers.
- `src/energy-controller.js`: clamps energy and maps it to CSS variables and player audio parameters.
- `src/app.js`: DOM bootstrapping and orchestration only.
- `tools/render-performances.mjs`: deterministic audio/pose/video authoring and ffprobe validation.
- `public/poses/*.webp`: six registered local selection poses.
- `public/performances/*.mp4`: three original synchronized portrait performances.
- `public/performances/performances.json`: browser-readable performance data generated from the source module.
- `tests/avatar.test.mjs`: state-transition coverage.
- `tests/dial-controller.test.mjs`: detent, hysteresis, delta, and energy coverage.
- `tests/cue-player.test.mjs`: media-clock cue selection coverage.

---

### Task 1: Performance model and avatar state machine

**Files:**
- Create: `src/performance-data.js`
- Modify: `src/avatar.js`
- Create: `tests/avatar.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `PERFORMANCES`, `DETENT_ANGLES`, `getPerformance(idOrIndex)`, `AVATAR_STATES`, `reduceAvatar(state, event)`, and `createAvatarMachine(onChange)`.
- `createAvatarMachine(onChange)` returns `{ getState, send, subscribe }`; `send(event)` returns the new frozen state.
- Task 2 consumes `DETENT_ANGLES`; Task 4 consumes every other export.

- [ ] **Step 1: Add failing state-machine tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { reduceAvatar } from "../src/avatar.js";

test("selection release enters loading with the chosen song", () => {
  const selected = reduceAvatar({ mode: "idle-pose", songIndex: 0, energy: 20 }, { type: "PREVIEW", songIndex: 1 });
  const loading = reduceAvatar(selected, { type: "RELEASE" });
  assert.deepEqual(loading, { mode: "performance-loading", songIndex: 1, energy: 20 });
});

test("playing supports pause and a return to the chooser", () => {
  const playing = { mode: "performance-playing", songIndex: 2, energy: 64 };
  assert.equal(reduceAvatar(playing, { type: "TOGGLE_PAUSE" }).mode, "performance-paused");
  assert.deepEqual(reduceAvatar(playing, { type: "CHOOSE" }), {
    mode: "idle-pose",
    songIndex: 2,
    energy: 20,
  });
});

test("energy is accepted only during an active performance and is clamped", () => {
  assert.equal(reduceAvatar({ mode: "performance-playing", songIndex: 0, energy: 20 }, { type: "ENERGY", value: 140 }).energy, 100);
  assert.equal(reduceAvatar({ mode: "idle-pose", songIndex: 0, energy: 20 }, { type: "ENERGY", value: 80 }).energy, 20);
});
```

- [ ] **Step 2: Run the test to verify the missing reducer fails**

Run: `node --test tests/avatar.test.mjs`

Expected: FAIL because `reduceAvatar` is not exported.

- [ ] **Step 3: Define exact performance metadata**

```js
export const DETENT_ANGLES = Object.freeze([-48, 0, 48]);
export const PERFORMANCES = Object.freeze([
  {
    id: "static-heart",
    number: "01",
    title: "STATIC HEART",
    bpm: 128,
    duration: 4.25,
    lyric: "Follow the glowing line / Lands End is right on time",
    colors: ["#ff304f", "#fff3f5"],
    pose: "/public/poses/pose-2.webp",
    video: "/public/performances/static-heart.mp4",
  },
  {
    id: "afterimage",
    number: "02",
    title: "AFTERIMAGE",
    bpm: 104,
    duration: 4.9,
    lyric: "Fog turns gold / when the low lights bloom",
    colors: ["#794cff", "#2d7dff"],
    pose: "/public/poses/pose-3.webp",
    video: "/public/performances/afterimage.mp4",
  },
  {
    id: "neon-fever",
    number: "03",
    title: "NEON FEVER",
    bpm: 140,
    duration: 3.85,
    lyric: "Left, right / red lights ignite",
    colors: ["#adff2f", "#ff2ea6"],
    pose: "/public/poses/pose-5.webp",
    video: "/public/performances/neon-fever.mp4",
  },
]);
```

Add beat and effect arrays at quarter-note timestamps through each duration, plus two timed lyric fragments per song. Export `getPerformance(idOrIndex)` and freeze each returned definition.

- [ ] **Step 4: Implement the pure avatar reducer and wrapper**

```js
export const AVATAR_STATES = Object.freeze([
  "idle-pose", "dial-preview", "performance-loading", "performance-enter",
  "performance-playing", "performance-paused", "performance-exit", "stopping",
]);

export function reduceAvatar(state, event) {
  if (event.type === "PREVIEW" && ["idle-pose", "dial-preview"].includes(state.mode)) {
    return Object.freeze({ ...state, mode: "dial-preview", songIndex: event.songIndex });
  }
  if (event.type === "RELEASE" && state.mode === "dial-preview") {
    return Object.freeze({ mode: "performance-loading", songIndex: state.songIndex, energy: 20 });
  }
  if (event.type === "MEDIA_READY" && state.mode === "performance-loading") return Object.freeze({ ...state, mode: "performance-enter" });
  if (event.type === "ENTERED" && state.mode === "performance-enter") return Object.freeze({ ...state, mode: "performance-playing" });
  if (event.type === "TOGGLE_PAUSE" && state.mode === "performance-playing") return Object.freeze({ ...state, mode: "performance-paused" });
  if (event.type === "TOGGLE_PAUSE" && state.mode === "performance-paused") return Object.freeze({ ...state, mode: "performance-playing" });
  if (event.type === "ENERGY" && ["performance-playing", "performance-paused"].includes(state.mode)) return Object.freeze({ ...state, energy: Math.max(0, Math.min(100, event.value)) });
  if (event.type === "ENDED") return Object.freeze({ ...state, mode: "performance-exit" });
  if (event.type === "EXITED" || event.type === "CHOOSE") return Object.freeze({ mode: "idle-pose", songIndex: state.songIndex, energy: 20 });
  if (event.type === "MEDIA_ERROR") return Object.freeze({ mode: "idle-pose", songIndex: state.songIndex, energy: 20, error: "TRY ANOTHER" });
  return state;
}
```

The wrapper stores the current frozen state, invokes subscribers after a real state change, and never mutates state in place.

- [ ] **Step 5: Add focused scripts and run tests**

Set `package.json` scripts to:

```json
{
  "dev": "python3 -m http.server 4173",
  "render:media": "node tools/render-performances.mjs",
  "test": "node --test tests/*.test.mjs",
  "check": "node --check src/app.js && node --check src/avatar.js && node --check src/dial-controller.js && node --check src/performance-player.js && node --check src/cue-player.js && node --check src/energy-controller.js && node --check src/performance-data.js"
}
```

Run: `node --test tests/avatar.test.mjs`

Expected: 3 passing tests.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add package.json src/performance-data.js src/avatar.js tests/avatar.test.mjs
git commit -m "Build pocket performer state model"
```

---

### Task 2: Tactile dial controller

**Files:**
- Create: `src/dial-controller.js`
- Create: `tests/dial-controller.test.mjs`

**Interfaces:**
- Consumes: `DETENT_ANGLES` from `src/performance-data.js`.
- Produces: `normalizeAngle(degrees)`, `shortestAngleDelta(from, to)`, `pickDetent(angle, currentIndex, hysteresis)`, `energyFromRotation(startEnergy, accumulatedDegrees)`, and `createDialController(element, callbacks)`.
- `callbacks` is `{ getMode, getEnergy, onPreview, onRelease, onEnergy, onTap, onHold }`.

- [ ] **Step 1: Add failing dial-math tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { shortestAngleDelta, pickDetent, energyFromRotation } from "../src/dial-controller.js";

test("angle deltas cross the wrap boundary", () => {
  assert.equal(shortestAngleDelta(350, 10), 20);
  assert.equal(shortestAngleDelta(10, 350), -20);
});

test("detent hysteresis keeps the current song near a midpoint", () => {
  assert.equal(pickDetent(-24, 0, 8), 0);
  assert.equal(pickDetent(-14, 0, 8), 1);
});

test("120 degrees spans the full energy range", () => {
  assert.equal(energyFromRotation(20, 96), 100);
  assert.equal(energyFromRotation(80, -96), 0);
});
```

- [ ] **Step 2: Run the test to verify the module is missing**

Run: `node --test tests/dial-controller.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement pure dial math**

```js
export const normalizeAngle = (value) => ((value % 360) + 360) % 360;
export function shortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}
export function energyFromRotation(startEnergy, degrees) {
  return Math.max(0, Math.min(100, Math.round(startEnergy + (degrees / 120) * 100)));
}
```

`pickDetent` compares the pointer angle to the three detents, but retains `currentIndex` until another detent is closer by more than the supplied `8°` hysteresis.

- [ ] **Step 4: Implement one pointer/keyboard controller**

On pointer down, record angle, time, mode, and starting energy; set pointer capture; start a `500ms` hold timer. In choose mode, pointer motion calls `onPreview(index)` only when the hysteresis result changes. In performance mode, accumulate wrapped angular deltas and call `onEnergy(energyFromRotation(...))`. On pointer up, call `onRelease(index)` after a drag in choose mode, `onTap()` when movement is under 6px and duration is below 500ms, and never emit a tap after `onHold()` fires.

Keyboard behavior is exact:

```js
const keys = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};
```

In choose mode arrows preview adjacent songs and Enter releases. In performance mode arrows adjust energy by 5, Home/End set 0/100, Enter taps, and Escape holds/returns to choose. Wheel uses the same branches and prevents default only while the dial is focused or hovered. `destroy()` removes all listeners and clears the hold timer.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/dial-controller.test.mjs`

Expected: 3 passing tests.

- [ ] **Step 6: Commit only Task 2 files**

```bash
git add src/dial-controller.js tests/dial-controller.test.mjs
git commit -m "Add tactile performance dial"
```

---

### Task 3: Deterministic original songs and portrait performance media

**Files:**
- Create: `tools/render-performances.mjs`
- Add: `public/charli-performer.png`
- Create: `public/poses/pose-0.webp` through `public/poses/pose-5.webp`
- Create: `public/performances/static-heart.mp4`
- Create: `public/performances/afterimage.mp4`
- Create: `public/performances/neon-fever.mp4`
- Create: `public/performances/performances.json`

**Interfaces:**
- Consumes: `PERFORMANCES` from `src/performance-data.js` and the approved `public/charli-performer.png` source image.
- Produces: six registered pose images, three playable MP4 files with baked original audio, and JSON metadata matching the source module.

- [ ] **Step 1: Write the deterministic PCM renderer**

Use a seeded `mulberry32(0xc45aba)` generator and write signed 16-bit little-endian stereo PCM at 48kHz. The per-sample mix contains:

```js
const mix =
  kick(songTime, beatSeconds) * 0.38 +
  snare(songTime, beatSeconds, random) * 0.12 +
  hat(songTime, beatSeconds, random) * 0.055 +
  bass(chordRoot, songTime) * 0.18 +
  chord(chordNotes, songTime) * 0.12 +
  vowelCarrier(melodyNote, songTime) * 0.14;
```

Use the design-spec chord roots and one four-chord bar per hook. Apply a 12ms attack, 60ms release, soft clip with `Math.tanh(sample * 1.25)`, and a 20ms fade at both ends. Write one temporary instrumental WAV per song.

- [ ] **Step 2: Generate five identity-preserving performance poses**

Use Image Gen editing with `public/charli-performer.png` as the sole character reference. Every prompt must repeat: same fictional woman, exact face, exact long dark curls, exact black leather stagewear and boots, full body, straight-on camera, feet visible, centered on the same black stage, `887 × 1774` portrait composition, photoreal finish, no text, no props, no extra people. Generate and retain these distinct states:

```text
pose-1: weight on left hip, left shoulder dropped, mouth just opening on a sung vowel
pose-2: weight on right hip, chin raised, one hand lifted no higher than the shoulder, mouth open on a sung vowel
pose-3: slow three-quarter torso turn while face remains toward camera, loose hair movement, softer open mouth
pose-4: returning from the turn with visible hair swing and one confident shoulder hit, mouth open wider
pose-5: sharp final freeze with both feet planted, one forearm angled outward, direct eye contact, mouth closed
```

Reject any output whose face, outfit, limb count, camera, or stage registration visibly changes. Convert the source image into `pose-0.webp`; convert the five approved edits into `pose-1.webp` through `pose-5.webp`. Preserve the original generated PNGs outside the shipped `public/poses` directory so the repo contains only delivery assets.

- [ ] **Step 3: Add the local vocal and media render commands**

For each song, run `/usr/bin/say -v Samantha` with the original lyric into a temporary AIFF, then mix it below the pitched carrier using FFmpeg:

```js
const vocalFilter = "aresample=48000,highpass=f=180,lowpass=f=5200,vibrato=f=5.4:d=0.18,chorus=0.5:0.7:32:0.28:0.22:2,volume=0.26";
const mixFilter = `[1:a]${vocalFilter}[v];[0:a][v]amix=inputs=2:duration=first:normalize=0,acompressor=threshold=-16dB:ratio=4:attack=8:release=120,alimiter=limit=0.92[a]`;
```

Generate each video from three registered poses using 100–140ms crossfades on beat boundaries plus a song-specific 24fps camera choreography: `pose-0 → pose-1 → pose-2 → pose-5` for Static Heart, `pose-0 → pose-3 → pose-4 → pose-0` for Afterimage, and `pose-0 → pose-2 → pose-1 → pose-5` for Neon Fever. Use steady red side sway for Static Heart, a slow violet push for Afterimage, and sharp green/magenta beat hits for Neon Fever. The base filter applied after the pose sequence is:

```text
scale=-2:1740,crop=780:1688:x='(iw-ow)/2+X':y='(ih-oh)/2+Y',eq=saturation=1.08:contrast=1.04,format=yuv420p
```

Keep `X` within ±14px and `Y` within ±8px so the movement reads as a confident animated pose without deforming the performer. Alternate the two open-mouth pose frames only on the generated vocal phrases; hold closed-mouth `pose-0` or `pose-5` outside those phrases. Encode H.264 high profile, CRF 18, AAC 192kbps, 24fps, `+faststart`, and the exact song duration.

- [ ] **Step 4: Register the six selection poses**

For each approved source pose, run FFmpeg with `scale=-2:1688,crop=780:1688:x='(iw-ow)/2':y=0`, then export high-quality WebP. If a pose's feet or head do not align within 12px of `pose-0`, adjust only its crop offset and scale before export; never stretch the body. The first and final pose are neutral/closed-mouth and all six stay registered on the same black stage.

- [ ] **Step 5: Validate every output inside the renderer**

For each output, call ffprobe JSON and throw unless:

```js
video.width === 780 &&
video.height === 1688 &&
Number(video.avg_frame_rate.split("/")[0]) / Number(video.avg_frame_rate.split("/")[1]) === 24 &&
Math.abs(Number(format.duration) - performance.duration) < 0.12
```

Also require both a video stream and an audio stream for each MP4, and require every pose file to be non-empty. Remove only the task-specific temporary directory in an always-run `finally` block.

- [ ] **Step 6: Render and inspect the media**

Run: `npm run render:media`

Expected: six WebPs and three MP4s generated, followed by `Validated 3 performances and 6 poses.`

Run: `ffprobe -v error -show_entries stream=codec_name,width,height,avg_frame_rate -of compact public/performances/afterimage.mp4`

Expected: one H.264 780x1688 24fps video stream and one AAC audio stream.

- [ ] **Step 7: Commit only the renderer and generated media**

```bash
git add tools/render-performances.mjs public/charli-performer.png public/poses public/performances
git commit -m "Render original pocket performances"
```

---

### Task 4: Phone UI, media clock, energy effects, and full interaction

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Create: `src/performance-player.js`
- Create: `src/cue-player.js`
- Create: `src/energy-controller.js`
- Create: `tests/cue-player.test.mjs`
- Add: `docs/concepts/pocket-performer-concept.png`

**Interfaces:**
- Consumes: every interface from Tasks 1–3.
- Produces: the complete browser demo and `createPerformancePlayer(video)`, `getCueFrame(performance, time, previousTime)`, and `createEnergyController(root, player)`.

- [ ] **Step 1: Add failing cue-clock tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { getCueFrame } from "../src/cue-player.js";

const song = {
  lyrics: [{ start: 0.1, end: 1.2, text: "Fog turns gold" }],
  beats: [{ at: 0.5, strength: 0.8 }],
  effects: [{ at: 0.9, duration: 0.2, kind: "flash", strength: 1 }],
};

test("cue frame derives lyrics and crossed beats from media time", () => {
  const frame = getCueFrame(song, 0.55, 0.45);
  assert.equal(frame.lyric, "Fog turns gold");
  assert.deepEqual(frame.beats, [{ at: 0.5, strength: 0.8 }]);
});

test("active effects expire from the media clock", () => {
  assert.equal(getCueFrame(song, 1.05, 1).effects.length, 1);
  assert.equal(getCueFrame(song, 1.2, 1.1).effects.length, 0);
});
```

- [ ] **Step 2: Implement media-clock cue selection and verify tests**

`getCueFrame` returns `{ lyric, beats, effects }`; beats include only cues where `previousTime < at && at <= time`, active effects satisfy `at <= time && time < at + duration`, and the lyric is the single fragment containing `time` or an empty string.

Run: `node --test tests/cue-player.test.mjs`

Expected: 2 passing tests.

- [ ] **Step 3: Replace the document with the complete phone surface**

Use one `<main class="phone">` containing:

```html
<section class="stage" aria-label="Pocket performer">
  <img id="idle-pose" class="performer-media idle-media" alt="Fictional electro-pop performer on a dark stage">
  <video id="performance-video" class="performer-media performance-media" playsinline preload="auto"></video>
  <div class="stage-lighting" aria-hidden="true"></div>
  <div id="particles" class="particles" aria-hidden="true"></div>
  <p id="lyric" class="lyric" aria-live="polite"></p>
</section>
<section class="control-deck">
  <button id="song-title" class="song-title" type="button">STATIC HEART</button>
  <p id="instruction">TURN TO CHOOSE</p>
  <div id="dial" class="dial" role="slider" tabindex="0" aria-valuemin="1" aria-valuemax="3">
    <button type="button" data-song="0" aria-label="Choose Static Heart">01</button>
    <button type="button" data-song="1" aria-label="Choose Afterimage">02</button>
    <button type="button" data-song="2" aria-label="Choose Neon Fever">03</button>
    <span class="energy-arc" aria-hidden="true"></span>
    <span class="dial-crown" aria-hidden="true"></span>
  </div>
  <p id="energy-word">LOW GLOW</p>
</section>
```

Add a `CONTROLS` button and hidden bottom sheet containing three 44px song buttons, Play/Pause, a native energy range, and lyrics toggle. No other visible components are allowed.

- [ ] **Step 4: Build the exact visual system from the concept**

Define tokens before component rules:

```css
:root {
  --bg: #030405;
  --phone: #08090b;
  --metal: #34373c;
  --text: #f7f7f5;
  --muted: #9a9ca3;
  --accent-a: #794cff;
  --accent-b: #2d7dff;
  --energy: .2;
  --glow: .04;
  --camera-scale: 1.007;
  --radius-phone: 52px;
  --snap: 140ms cubic-bezier(.2,.8,.2,1);
}
```

Desktop centers the `390 × 844` phone with a 1px metal edge, inner highlight, camera island, and restrained floor reflection. At `max-width: 520px`, remove the exterior bezel and set the phone to `100dvw × 100dvh`. Stage and deck use 72/28 rows. Use `overflow: hidden` and `object-fit: cover` for media, with no color wash over the performer; colored light comes from edge beams, haze, particles, and reflection overlays. The 120px brushed-metal crown sits in a 152px target, with narrow uppercase control typography and visible focus rings.

Animate playback with song-specific whole-frame choreography no larger than 4% scale and 10px translation. Respect reduced motion by disabling particles, parallax, shake, and large zoom while retaining crossfades and brightness changes.

- [ ] **Step 5: Implement the player and energy controller**

`createPerformancePlayer(video)` sets `src`, waits for `loadeddata`, calls `video.play()` only from the dial-release gesture, exposes `currentTime`, and implements `pause`, `resume`, `stop`, and `setEnergy`. Build a `MediaElementAudioSourceNode` once when Web Audio is available; route it through a low-pass filter and gain node. If Web Audio setup fails, video audio still plays.

`createEnergyController` applies exact mappings:

```js
root.style.setProperty("--energy", String(e));
root.style.setProperty("--glow", String(e * e));
root.style.setProperty("--saturation", String(1 + 0.45 * e));
root.style.setProperty("--camera-scale", String(1 + 0.035 * e));
player.setEnergy({ cutoff: 1800 + 16200 * e, gain: 0.72 + 0.28 * e });
```

Create `6 + Math.round(22 * e)` reusable particles, update at no more than 30fps, and add a one-frame `peak-bloom` class only when crossing upward into 100.

- [ ] **Step 6: Wire orchestration through the avatar machine**

`app.js` subscribes once to the state machine and renders state copy, song copy, ARIA values, pose, theme colors, and energy. Dial callbacks only send machine events. On `performance-loading`, set the selected media, await `load`, send `MEDIA_READY`, play, then send `ENTERED`. A single requestAnimationFrame loop reads `video.currentTime`, calls `getCueFrame`, renders lyric/beat/effect state, and never uses cue timers. Ended media sends `ENDED`, holds the exit pose for 180ms, then sends `EXITED`.

Exact state copy:

```js
const STATE_COPY = {
  "idle-pose": "TURN TO CHOOSE",
  "dial-preview": "RELEASE TO PLAY",
  "performance-loading": "LOADING",
  "performance-enter": "TURN UP THE ENERGY",
  "performance-playing": "TURN UP THE ENERGY",
  "performance-paused": "TAP TO RESUME",
  "performance-exit": "TURN FOR ANOTHER",
};
```

Song detent buttons call preview then release. Song-title click and dial hold send `CHOOSE`. The controls sheet calls the same controller paths, never a parallel state model. If media load fails, display `TRY ANOTHER` and leave the other song buttons active.

- [ ] **Step 7: Run the focused verification set**

Run: `npm test && npm run check`

Expected: all state, dial, and cue tests pass and every source module parses.

Run: `for media in public/performances/*.mp4; do ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$media"; done`

Expected: three lines beginning `h264,780,1688`.

Start `npm run dev`, open `http://127.0.0.1:4173`, verify at `390 × 844`: turn to Afterimage, release to play, raise energy, pause with a tap, resume, hold to return, and start Neon Fever. Capture one implementation screenshot for direct comparison with `docs/concepts/pocket-performer-concept.png`.

- [ ] **Step 8: Commit only the phone implementation and concept**

```bash
git add index.html src/app.js src/styles.css src/performance-player.js src/cue-player.js src/energy-controller.js tests/cue-player.test.mjs docs/concepts/pocket-performer-concept.png
git commit -m "Build interactive pocket performer phone"
```

---

## Final acceptance

- The phone is the entire demo and visually matches the approved concept.
- Each detent selects one of the three original hooks; release starts audible playback.
- The performer visibly moves, the lyric cues follow the video clock, and the dial changes the live stage energy without changing playback speed.
- Tap pause/resume, hold-to-choose, title-to-choose, keyboard paths, and the accessible controls sheet work.
- All three generated MP4s decode at the required dimensions/frame rate with audio.
- No unrelated working-tree changes are staged or committed.
