# Charley Performance Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing 29-part performer with more convincing dance mechanics, expand the horizontal radio to eight catalog-driven selections, and add one compact agent-ready Ask Charley sheet.

**Architecture:** `src/music.js` becomes the canonical track catalog and exposes complete public metadata; `src/app.js` renders the tuner from that catalog. Pure motion helpers and a pure Ask Charley client make choreography and network behavior testable without a browser, while the existing DOM app remains the integration layer.

**Tech Stack:** Vanilla ES modules, SVG transforms, Web Audio API, Node test runner, static HTML/CSS, Convex HTTP action.

## Global Constraints

- Keep the existing 29 independently animated SVG parts and five moves per dance profile.
- Preserve the black, white, chrome, and brat-green mobile visual system.
- The primary viewport is exactly 390 x 844 with no horizontal overflow.
- Keep local licensed audio priority, automatic original fallback playback, and 18-second radio advance.
- Ask Charley is one compact sheet, not a full chatbot or conversation-history surface.
- Lip sync remains functional but receives no new polish.
- Audio failure must never stop the visual performance.
- Reduced Motion must retain breathing and blinking while reducing dance and secondary movement.

---

### Task 1: Canonical eight-track radio catalog

**Files:**
- Modify: `src/music.js`
- Modify: `src/app.js`
- Modify: `index.html`
- Modify: `public/audio/README.md`
- Modify: `public/audio/manifest.json`
- Create: `tests/music-catalog.test.mjs`

**Interfaces:**
- Produces: `getTracks(): Array<{id,title,bpm,file,emotion,danceProfile}>`
- Produces: valid track indexes `0..7` for `startTrack`, `hasTrackSource`, and rig selection.
- Consumes later: Task 2 reads `danceProfile`; Task 3 is independent.

- [ ] **Step 1: Write the failing catalog test**

Create `tests/music-catalog.test.mjs` with assertions that `getTracks()` returns exactly these titles in order:

```js
[
  "360",
  "Von dutch",
  "Apple",
  "Club classics",
  "B2b",
  "Talk talk",
  "Guess",
  "365",
]
```

Also assert unique `id` and `file`, finite BPM between 100 and 160, emotion in `confident|playful|intense|euphoric`, and integer `danceProfile` in `0..3`.

- [ ] **Step 2: Verify the test fails for four tracks**

Run: `node --test tests/music-catalog.test.mjs`

Expected: FAIL because `getTracks()` currently returns four entries and omits catalog IDs, emotions, and dance profiles.

- [ ] **Step 3: Consolidate playback metadata and arrangements**

Replace `TRACKS` plus `FALLBACK_ARRANGEMENTS` with one private `TRACK_CATALOG` array. Each entry contains:

```js
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
}
```

Add equivalent complete arrangements for `Talk talk` at 126 BPM/profile 1, `Guess` at 134 BPM/profile 2, and `365` at 138 BPM/profile 3. Existing four entries retain their current arrangement values.

Update every internal arrangement lookup to use `TRACK_CATALOG[index].arrangement`. `getTracks()` returns only public metadata, not arrangement internals.

- [ ] **Step 4: Generate tuner buttons from catalog metadata**

Leave `#track-list` empty in `index.html`. In `src/app.js`, render one button per track before collecting `trackButtons`:

```js
trackList.replaceChildren(...tracks.map((track, index) => {
  const button = document.createElement("button");
  button.id = `track-${index}`;
  button.className = `track-option${index === 0 ? " selected" : ""}`;
  button.type = "button";
  button.dataset.track = String(index);
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", String(index === 0));
  const label = document.createElement("span");
  label.textContent = track.title;
  button.append(label);
  return button;
}));
```

Set `app.dataset.emotion = tracks[selectedTrack].emotion` and call `rig.setTrack(tracks[selectedTrack].danceProfile)` so eight entries reuse the four intentional profiles.

- [ ] **Step 5: Update audio documentation and manifest**

List all eight optional local filenames in `public/audio/README.md` and `public/audio/manifest.json`. State that missing files use built-in original arrangements automatically and never open an upload picker.

- [ ] **Step 6: Verify catalog and regression tests pass**

Run: `node --test tests/music-catalog.test.mjs && npm test && npm run check`

Expected: the catalog test passes, the complete test suite reports zero failures, and syntax checks exit 0.

- [ ] **Step 7: Commit the catalog task**

```bash
git add src/music.js src/app.js index.html public/audio/README.md public/audio/manifest.json tests/music-catalog.test.mjs
git commit -m "Expand the performer radio to eight tracks"
```

### Task 2: Polished beat-aware dance mechanics

**Files:**
- Create: `src/dance-motion.js`
- Create: `tests/dance-motion.test.mjs`
- Modify: `src/performer-rig.js`
- Modify: `src/app.js`

**Interfaces:**
- Produces: `createDanceMotion(profileIndex): { sample(timeSeconds, pulse): Pose }`
- Produces: rig method `setPulse({step, level, downbeat})`.
- Consumes: Task 1 supplies `danceProfile` through `rig.setTrack(profile)`.

- [ ] **Step 1: Write failing pure-motion tests**

Create `tests/dance-motion.test.mjs`. Assert:

- `createDanceMotion(0).sample(0, null)` returns finite numeric pose fields for hip, pelvis, bounce, torso, shoulders, head, arms, forearms, legs, and lower legs.
- Sampling five successive eight-beat phrases produces five distinct pose signatures.
- A downbeat pulse with `level: 0.8` increases bounce intensity without multiplying every limb by the same factor.
- Profile changes produce different pose signatures at the same time.
- Every pose remains inside explicit safe bounds: rotations within `-90..90`, translation-like fields within `-24..24`.

- [ ] **Step 2: Verify the motion test fails**

Run: `node --test tests/dance-motion.test.mjs`

Expected: FAIL because `src/dance-motion.js` does not exist.

- [ ] **Step 3: Extract allocation-free choreography**

Create `src/dance-motion.js` with module-level frozen profile and accent tables. Replace per-sample `Object.fromEntries` and nested accent construction with one reusable pose object per motion instance. Use eased beat envelopes with anticipation, fast hit, short hold, and damped settle; stagger head, shoulders, and forearms by 30–90 ms.

Keep the existing 20 move identities. Add pelvis translation, shoulder counter-rotation, knee compression, and lower-leg compensation so weight reads as planted instead of floating.

- [ ] **Step 4: Integrate motion and secondary springs into the rig**

Import `createDanceMotion` in `src/performer-rig.js`. Use sampled pelvis and shoulders to carry torso/head/limb roots. Replace the single `hairFollow` scalar with separate damped back-hair, front-hair, and strap states using different response speeds.

Add:

```js
setPulse({ step = 0, level = 0, downbeat = false } = {})
```

Store a smoothed pulse level and phase correction. If pulses stop, continue using elapsed time. Apply reduced-motion scaling to idle shift, reactions, and secondary springs while preserving a slow breath and blink.

- [ ] **Step 5: Feed music pulses to the rig**

Change `onMusicPulse` in `src/app.js` to call both `rig.setPulse({step, level, downbeat})` and existing `rig.setVocal(vocal, word, step)`.

- [ ] **Step 6: Verify motion and regression tests pass**

Run: `node --test tests/dance-motion.test.mjs && npm test && npm run check`

Expected: motion tests pass, the complete suite reports zero failures, and syntax checks exit 0.

- [ ] **Step 7: Commit the rig task**

```bash
git add src/dance-motion.js tests/dance-motion.test.mjs src/performer-rig.js src/app.js
git commit -m "Polish the beat-aware performer choreography"
```

### Task 3: Compact Ask Charley agent sheet

**Files:**
- Create: `src/ask-charley.js`
- Create: `tests/ask-charley.test.mjs`
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `createAskCharleyClient({endpoint, fetchImpl}).ask(question): Promise<{speech,dest}>`
- Default endpoint: `https://content-cheetah-171.convex.site/ask`
- Consumes: existing `/ask` JSON contract; no Convex token is sent by the browser.

- [ ] **Step 1: Write failing client tests**

Create `tests/ask-charley.test.mjs` using a small injected `fetchImpl`. Assert that `ask("  where is water?  ")` POSTs `{"question":"where is water?"}` with JSON headers, returns normalized `{speech,dest}`, rejects a blank question with `Question required.`, rejects a non-2xx response with `Charley is reconnecting.`, and rejects malformed JSON with the same stable message.

- [ ] **Step 2: Verify the client test fails**

Run: `node --test tests/ask-charley.test.mjs`

Expected: FAIL because `src/ask-charley.js` does not exist.

- [ ] **Step 3: Implement the pure client**

Implement `createAskCharleyClient` with dependency-injected fetch, one POST request, trimmed input, normalized string fields, and stable errors. Do not add retries, fake answers, history, TTS, or map side effects.

- [ ] **Step 4: Add the compact sheet markup**

Replace the passive header status with:

```html
<button id="ask-charley-open" class="ask-charley-open" type="button" aria-expanded="false" aria-controls="ask-charley-sheet">Ask Charley</button>
```

Add `#ask-charley-sheet` before `#toast`, hidden by default, containing a close button, `<form id="ask-charley-form">`, a labeled text input with placeholder `Ask about stages, food, or the festival`, a Send button, and `#ask-charley-status` with `aria-live="polite"`.

- [ ] **Step 5: Wire accessible open, close, and submit state**

In `src/app.js`, open the sheet without stopping playback, focus the input, disable Send for blank or pending input, close on Escape, and restore focus to the header button. On success render `speech`; on failure render the client's stable message while preserving the question for editing. Keep returned `dest` in `sheet.dataset.destination` as the future map seam.

- [ ] **Step 6: Style the sheet in the existing system**

Add compact styles that anchor the sheet above `.bottom-nav`, use near-black surfaces, one-pixel chrome borders, acid-green focus/action states, and explicit control typography. At 390 x 844 the performer remains dominant and the sheet stays inside the phone shell without horizontal overflow. Reduced Motion disables sheet translation while retaining instant visibility changes.

- [ ] **Step 7: Verify Ask Charley and regression tests pass**

Run: `node --test tests/ask-charley.test.mjs && npm test && npm run check`

Expected: client tests pass, the complete suite reports zero failures, and syntax checks exit 0.

- [ ] **Step 8: Commit the Ask Charley task**

```bash
git add src/ask-charley.js tests/ask-charley.test.mjs index.html src/app.js src/styles.css
git commit -m "Add the Ask Charley agent sheet"
```

### Task 4: Integrated mobile browser verification

**Files:**
- Modify only if a failing browser check proves a defect in Task 1–3 files.
- Create: `docs/qa/charley-polish-mobile.png`

**Interfaces:**
- Consumes all previous task interfaces.
- Produces one verified mobile interaction and final QA screenshot.

- [ ] **Step 1: Run the complete automated verification**

Run: `npm run check && npm test && git diff --check`

Expected: syntax checks exit 0, every test passes, and diff checking is clean.

- [ ] **Step 2: Verify the eight-track tuner at 390 x 844**

In the in-app browser, confirm eight options exist, the first and last options center under the needle, selecting a track keeps `data-playing="true"`, no file input exists, and the document has no horizontal overflow.

- [ ] **Step 3: Verify dance quality and continuity**

During playback, sample the rig over at least five phrase boundaries. Confirm 29 rig parts remain, five visibly distinct pose signatures occur, arm/torso/leg transforms change, a track change does not reset to idle, and touch reaction still works.

- [ ] **Step 4: Verify Ask Charley without breaking playback**

Open Ask Charley while music is playing. Confirm focus, blank-submit guard, pending state, success or stable connection error, Escape close, and uninterrupted `data-playing="true"`.

- [ ] **Step 5: Capture and inspect the final implementation**

Capture `docs/qa/charley-polish-mobile.png` at 390 x 844. Use `view_image` on the prior accepted mobile reference and the new screenshot. Compare avatar dominance, tuner geometry, palette, typography, sheet fit, navigation reachability, and overflow.

- [ ] **Step 6: Commit verified QA output**

```bash
git add docs/qa/charley-polish-mobile.png
git commit -m "Verify the polished Charley mobile experience"
```
