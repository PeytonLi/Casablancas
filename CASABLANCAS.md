# CASABLANCAS — PRD + 4-agent execution plan

**Event:** OutsideLLMS III — Outside Lands × OpenAI Buildathon
**Hard lock: 17:15.** Written 15:20. Build window: ~115 minutes.
**Supersedes:** RANGER-PRD.md. Product is StageMate, renamed Casablancas.

---

## 1. Product

Casablancas is a voice-powered artist companion. A fan speaks to an animated
avatar and gets spoken guidance, a route drawn on the festival map, nearby
amenities, a short original sung cue, and the artist's next show with an
official ticket link.

**Featured artist: The Strokes.** Saturday, Lands End Stage.
**Default route: South Gate → Lands End.** Locked. Do not renegotiate mid-build.

### Demo user story

Fan enters at South Gate and says *"Take me to the Strokes' stage."* The avatar:
1. answers by voice
2. sings a short original cue
3. draws the route to Lands End with a walking time
4. offers water / restroom / merch / exit nearby
5. shows the next Strokes show from JamBase with the official ticket link

### Success criteria

A judge can: ask for directions → hear a voice reply → see the route appear →
request an amenity → hear it sing → see the next show → open an official ticket link.

### Out of scope

Real GPS · Google Maps AR · real checkout · multiple artists · the full OSL
schedule · crowd density · production routing accuracy.

### Rights guardrails (from StageMate's own spec — keep them)

- Avatar is **stylized, not a photoreal likeness** of Julian Casablancas.
- **No voice cloning.** TTS is a generic voice, never an imitation.
- Singing is a **short original phrase**. No copyrighted lyrics.
- JamBase gives ticket **links**; checkout happens on the official seller's site.
- Show provider name + source attribution on every external action.

---

## 2. Stack — one deviation from the PRD, stated

StageMate lists Next.js + React + Rive as a *suggested* stack. **Using plain
HTML + ES modules instead. No build step.**

Reason: 115 minutes, empty repo, four parallel sessions. `npm install` plus a
dev server plus four agents in one Next.js tree is pure collision risk, and
nothing on the feature list needs React. Everything below is static files
served from disk and deployed to OpenAI Sites.

```
index.html          shell, quick actions, bottom card
styles.css
src/app.js          intent routing + wiring
src/avatar.js       avatar states
src/voice.js        TTS, mic, jingle
src/map.js          svg map, routing, pins
src/jambase.js      next-show lookup
data/venue.json     coordinates + walk graph
data/artist.json    JamBase fallback
assets/map.svg
assets/jingle.mp3
```

Deploy target is **OpenAI Sites** — required for prize eligibility.

---

## 3. The rule that makes 4 agents work

**No two agents write the same file.** Every cross-agent dependency is a frozen
signature, written as a throwing stub before anyone starts. An agent blocked on
another agent uses the stub and keeps going.

| Files | Owner |
|---|---|
| `index.html`, `styles.css`, `src/app.js` | **A1** |
| `src/avatar.js`, `src/voice.js`, `assets/jingle.mp3` | **A2** |
| `src/map.js`, `assets/map.svg`, `data/venue.json` | **A3** |
| `src/jambase.js`, `tools/pull-jambase.mjs`, `data/artist.json` | **A4** |

### Frozen interfaces

```js
// src/avatar.js — A2
export function initAvatar(el)
export function setState(s)          // 'idle' | 'listening' | 'speaking' | 'singing'

// src/voice.js — A2
export async function initVoice()    // MUST run inside a click handler (autoplay policy)
export async function speak(text)    // TTS → audio; sets avatar state; resolves on end
export async function sing()         // plays the original jingle; resolves on end
export function startMic(onTranscript)

// src/map.js — A3
export async function initMap(containerEl)
export function route(fromId, toId)  // → { minutes } ; draws polyline, highlights destination
export function highlight(id)
export function clearRoute()
export function nearest(type, fromId) // → pointId ; type: 'water'|'restroom'|'merch'|'exit'

// src/jambase.js — A4
export async function nextShow(artist) // → {artist,date,venue,city,ticketUrl,provider} | null
```

### DOM contract — A1 writes, everyone queries

`#map` · `#avatar` · `#mic` · `#input` · `#send` · `#card` · `#wake` ·
`.qa[data-dest]` (Stage / Water / Restroom / Merch / Exit)

### `data/venue.json` — A3 owns, A1 reads

```jsonc
{
  "points": {
    "south-gate":  { "x": 210, "y": 470, "type": "gate",     "label": "South Gate" },
    "lands-end":   { "x": 305, "y": 300, "type": "stage",    "label": "Lands End Stage" },
    "water-1":     { "x": 260, "y": 390, "type": "water",    "label": "Water" }
  },
  "edges": [["south-gate","water-1"], ["water-1","lands-end"]],
  "walk_seconds_per_unit": 0.6
}
```

### `data/artist.json` — A4 owns, always present

Precomputed fallback so the demo never depends on a live call.

```jsonc
{
  "The Strokes": {
    "next": { "date": "2026-09-12", "venue": "Kia Forum", "city": "Inglewood, CA",
              "ticketUrl": "https://...", "provider": "Ticketmaster" }
  }
}
```

---

## 4. Phase 0 — 15:25–15:35 (lead, not an agent)

Faster to write the stubs than to brief anyone on them.

1. `index.html` with the DOM ids above + importmap + `config.js` tag
2. Throwing stubs for all four `src/*.js` modules
3. Hand-written `data/venue.json` (3 points) and `data/artist.json` (The Strokes)
4. `config.js` + `.gitignore` entry
5. `pip install pymupdf` — the only PDF→SVG path on this machine (`pdftocairo`,
   `inkscape`, `mutool` are all missing). A3 needs it.

**Human tasks, in parallel — these block A2 and A4:**
- OpenAI API key
- JamBase Bearer token
- Ask Anav/Apoorv whether Sites can hold a secret. If not, route through Convex (sponsor).

---

## 5. The four agents — 15:35–16:45

### A1 — App shell + integration
**Owns:** `index.html`, `styles.css`, `src/app.js`

1. **T+10: ship the shell.** Everyone else is blocked on the DOM ids. Ship it
   ugly, style it after. Full-screen `#map`, floating `#avatar`, large `#mic`,
   `#input` text fallback always visible, five `.qa` quick-action buttons,
   `#card` at the bottom.
2. `#wake` gate button → `initVoice()` + `initAvatar()`. Autoplay policy means
   the AudioContext must be born in a click handler.
3. **Intent routing — keyword first, LLM second.** Match the seven StageMate
   commands with a keyword table (stage / bathroom / water / merch / leave /
   when / next show). Zero latency, no key needed, deterministic on stage.
   Anything unmatched falls through to one GPT-5.6 call that returns
   `{speech, dest}`. The scripted demo never touches the network; judge
   improvisation still works.
4. Wire it: `route()` → `speak()` → `#card` render.
5. **T+15: deploy a hello-world to OpenAI Sites.** Derisk eligibility while it's
   cheap, not at 17:00.

### A2 — Avatar + voice + singing
**Owns:** `src/avatar.js`, `src/voice.js`, `assets/jingle.mp3`

1. Four visual states: idle, listening, speaking, singing. CSS or Lottie —
   whichever is faster. **Stylized, not a likeness.**
2. OpenAI TTS for `speak()`. Warm, unhurried, generic voice — **not an
   imitation of anyone.** Speaking rate slightly below default.
3. `sing()` plays a short original cue, 3–5 seconds. Write the line yourself:
   *"Follow the glowing line, Lands End is right on time."* Record it, or
   generate it, or hum it into a phone. **Ship the audio file by T+20** — this
   is the one asset with no fallback.
4. `startMic()` via `webkitSpeechRecognition`, continuous off, interim on.
   Chrome only, fine for a demo. **Never let the mic block anything** — the
   text input stays visible at all times.
5. Test against a local mp3 before the TTS key arrives. Do not sit idle.

### A3 — Map + routing
**Owns:** `src/map.js`, `assets/map.svg`, `data/venue.json`

1. **Convert the map first, 15-minute timebox.** `pip install pymupdf`, then
   `page.get_svg_image()` on `Outside Lands Map.pdf`. Inline the result.
   **If it hasn't converted in 15 minutes, stop and hand-place points over a
   PNG render of the PDF** (`convert` is installed). The route line is what
   sells this, not vector fidelity.
2. Hand-place coordinates for: South Gate, Lands End Stage, and one each of
   water / restroom / merch / exit along the route. **Six points is the whole
   demo.** Add more only if ahead.
3. `route()` draws an SVG polyline along `edges`, computes walking minutes from
   pixel distance, highlights the destination pin.
4. `nearest()` is a linear scan over `points` filtered by type. Six points —
   no spatial index, no pathfinding library.
5. Use the festival's own palette for pins and the route line. Free credibility.

### A4 — Artist data + JamBase
**Owns:** `src/jambase.js`, `tools/pull-jambase.mjs`, `data/artist.json`

1. **T+15: hand-write `data/artist.json` for The Strokes first.** A1 is blocked
   on the shape, and this guarantees the card renders even if JamBase never
   answers. Non-negotiable checkpoint.
2. Then the real pull: JamBase v3 events search, **Bearer token in the
   `Authorization` header**, paginated events response. Cache to
   `data/artist.json`.
3. `nextShow()` reads the **cached file**, not the network. **No live JamBase
   call during the demo** — trial-key rate limits at 6pm are a known way to die
   on stage.
4. Card fields: artist, date, venue, city, provider name, official ticket link,
   source attribution. External-checkout button clearly marked as leaving the app.

---

## 6. Timeline

| Time | |
|---|---|
| 15:25–15:35 | Phase 0 — stubs, contracts, pymupdf. Human gets keys. |
| 15:35–16:45 | Four agents in parallel. Checkpoints: A1 shell T+10, Sites T+15; A4 artist.json T+15; A2 jingle T+20. |
| 16:45–17:05 | Lead integrates. Agents don't merge well. |
| 17:05–17:15 | Buffer. Cut, don't fix. |
| **17:15** | **HARD LOCK. Record the backup video regardless of state.** |
| 17:15–18:00 | Rehearse the pitch out loud, three times. |

## 7. Cut order if behind

Amenity buttons beyond water → the LLM fallback (keyword only) → mic (type
instead) → converted SVG (PNG + pins) → JamBase live pull (hand-written JSON).

**Never cut:** the route drawing, the sung cue, the ticket card. Those are the
three beats of the demo.

**Minimum shippable:** avatar visible and animating · answers one typed question
aloud · draws South Gate → Lands End with a walk time · sings the cue once ·
shows one ticket card.

If behind at 17:15, demo the minimum and say nothing about the rest.

## 8. Live risks

| Risk | Owner | State |
|---|---|---|
| No API keys in env | human | **blocks A2 and A4 — resolve by 15:50** |
| No PDF→SVG tool installed | A3 | `pip install pymupdf`, 15-min timebox, then PNG fallback |
| Sites can't hold a secret key | A1 | ask mentors; fallback is a Convex function (sponsor) |
| Autoplay blocks first audio | A2 | AudioContext born inside the `#wake` click handler |
| Mic misfires on stage | A2 | text input always visible; type it |
| JamBase rate limit at 6pm | A4 | cached JSON only, zero live calls |
| Jingle asset never gets made | A2 | **no fallback — ship it by T+20** |
| 115 minutes, not 4 hours | all | stub-first checkpoints; cut order above |
