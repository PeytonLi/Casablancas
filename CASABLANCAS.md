# CASABLANCAS — PRD + 4-agent execution plan

**Event:** OutsideLLMS III — Outside Lands × OpenAI Buildathon
**Hard lock: 17:15.** Revised 15:26. Build window: ~110 minutes.
**Supersedes:** RANGER-PRD.md. Product is StageMate, renamed Casablancas.
**Backend: Convex. Required, not conditional.**

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

## 2. Architecture

Static page, no build step, talking to Convex over plain HTTP.

```
  browser (OpenAI Sites)                 Convex
  ┌────────────────────────┐            ┌──────────────────────────┐
  │ index.html             │            │ POST /ask      → GPT-5.6 │
  │ avatar · map · card    │  fetch →   │ POST /tts      → OpenAI  │
  │ NO API KEYS            │            │ GET  /nextshow → table   │
  └────────────────────────┘            │ env: OPENAI_API_KEY,     │
                                        │      JAMBASE_TOKEN       │
                                        └──────────────────────────┘
```

**No keys ever reach the browser.** That's the point of the backend, and it's
what makes the QR code on the final slide safe.

StageMate suggests Next.js + React; using **plain HTML + ES modules** instead.
110 minutes, empty repo, four parallel sessions — a Next.js tree is collision
risk that buys nothing here. Convex is consumed with bare `fetch`, no client
library, no bundler.

```
index.html          shell, quick actions, bottom card
styles.css
src/app.js          intent routing + wiring
src/avatar.js       avatar states
src/voice.js        mic, audio playback, jingle
src/map.js          svg map, routing, pins
src/api.js          fetch wrappers for the three endpoints
convex/http.ts      the router — all three endpoints
convex/schema.ts    shows table, tts cache table
data/venue.json     coordinates + walk graph
assets/map.svg
assets/jingle.mp3
```

Deploy target is **OpenAI Sites** — required for prize eligibility.

### Two Convex gotchas that will cost you 20 minutes each

1. **HTTP actions are served from `.convex.site`, not `.convex.cloud`.**
   `.convex.cloud` is the client API host. Wrong host = 404 and confusion.
2. **CORS is not automatic.** The page is on a Sites domain, so every request is
   cross-origin. Every response needs `Access-Control-Allow-Origin`, **and you
   need an explicit `OPTIONS` route for preflight** or the browser never sends
   the POST. This is the single most likely way to lose time on the backend.

> Context7 MCP was not reachable this session, so the snippets below are from
> knowledge. Sanity-check against `docs.convex.dev/functions/http-actions` on
> first run rather than debugging blind.

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const http = httpRouter();

http.route({ path: "/ask", method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: cors })) });

http.route({ path: "/ask", method: "POST", handler: httpAction(async (ctx, req) => {
  const { text } = await req.json();
  // process.env.OPENAI_API_KEY — set via `npx convex env set`
  return new Response(JSON.stringify({ speech, dest }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
})});

export default http;
```

---

## 3. The rule that makes 4 agents work

**No two agents write the same file.** Every cross-agent dependency is a frozen
signature, written as a throwing stub before anyone starts. An agent blocked on
another agent uses the stub and keeps going.

| Files | Owner |
|---|---|
| `index.html`, `styles.css`, `src/app.js`, `src/api.js` | **A1** |
| `src/avatar.js`, `src/voice.js`, `assets/jingle.mp3` | **A2** |
| `src/map.js`, `assets/map.svg`, `data/venue.json` | **A3** |
| `convex/**`, `tools/pull-jambase.mjs` | **A4** |

`convex/http.ts` is a single router file, so it gets a single owner. **A4 is the
backend agent.** A1 and A2 never open it — they call the endpoints.

### Frozen HTTP contracts — A4 implements, A1/A2 consume

```
POST /ask       { text }              → { speech: string, dest: string|null }
POST /tts       { text }              → audio/mpeg bytes
GET  /nextshow?artist=The%20Strokes   → { artist, date, venue, city, ticketUrl, provider } | null
```

### Frozen module interfaces

```js
// src/api.js — A1 (thin fetch wrappers, so the base URL lives in one place)
export async function ask(text)
export async function tts(text)      // → blob URL
export async function nextShow(artist)

// src/avatar.js — A2
export function initAvatar(el)
export function setState(s)          // 'idle' | 'listening' | 'speaking' | 'singing'

// src/voice.js — A2
export async function initVoice()    // MUST run inside a click handler (autoplay policy)
export async function speak(text)    // tts() → audio; sets avatar state; resolves on end
export async function sing()         // plays the original jingle; resolves on end
export function startMic(onTranscript)

// src/map.js — A3
export async function initMap(containerEl)
export function route(fromId, toId)  // → { minutes } ; draws polyline, highlights destination
export function highlight(id)
export function clearRoute()
export function nearest(type, fromId) // type: 'water'|'restroom'|'merch'|'exit'
```

### DOM contract — A1 writes, everyone queries

`#map` · `#avatar` · `#mic` · `#input` · `#send` · `#card` · `#wake` ·
`.qa[data-dest]` (Stage / Water / Restroom / Merch / Exit)

### `data/venue.json` — A3 owns, A1 reads

```jsonc
{
  "points": {
    "south-gate": { "x": 210, "y": 470, "type": "gate",  "label": "South Gate" },
    "lands-end":  { "x": 305, "y": 300, "type": "stage", "label": "Lands End Stage" },
    "water-1":    { "x": 260, "y": 390, "type": "water", "label": "Water" }
  },
  "edges": [["south-gate","water-1"], ["water-1","lands-end"]],
  "walk_seconds_per_unit": 0.6
}
```

---

## 4. Phase 0 — 15:30–15:45 (lead, not an agent)

**Convex first. It has a login round-trip and everything else waits on the URL.**

1. `npm init -y && npm i convex && npx convex dev`
   First run opens a browser to authenticate and creates the project.
   **Do this before anything else** — it's the only step with a human in the loop.
2. `npx convex env set OPENAI_API_KEY …` and `npx convex env set JAMBASE_TOKEN …`
3. Record the `.convex.site` deployment URL into `src/api.js` as `BASE`.
4. `index.html` with the DOM ids above; throwing stubs for the four `src/*.js`
   modules; hand-written `data/venue.json` with 3 points.
5. `pip install pymupdf` — the only PDF→SVG path on this machine
   (`pdftocairo`, `inkscape`, `mutool` all missing). A3 needs it.
6. `.gitignore`: `.env.local`, `node_modules`, `.convex`

**Human tasks, in parallel:**
- OpenAI API key and JamBase Bearer token in hand before step 2
- Ask Anav/Apoorv about Sites → Convex CORS, if they know it

---

## 5. The four agents — 15:45–16:45

Sixty minutes each. Checkpoints are not suggestions — three agents are blocked
on other agents' first deliverable.

### A1 — App shell + integration
**Owns:** `index.html`, `styles.css`, `src/app.js`, `src/api.js`

1. **T+10: ship the shell.** Everyone is blocked on the DOM ids. Ship it ugly,
   style it after. Full-screen `#map`, floating `#avatar`, large `#mic`,
   `#input` always visible, five `.qa` buttons, `#card` at the bottom.
2. `#wake` gate button → `initVoice()` + `initAvatar()`. The AudioContext must
   be born inside a click handler or the first audio is silently dropped.
3. **Intent routing — keyword first, `/ask` second.** Match the seven StageMate
   commands with a keyword table (stage / bathroom / water / merch / leave /
   when / next show). No network, deterministic on stage. Anything unmatched
   falls through to `POST /ask`. **The scripted demo never calls the LLM.**
4. `src/api.js` — three `fetch` wrappers, base URL in one constant. Wrap each in
   try/catch with a spoken fallback line. A dead endpoint must never produce
   silence.
5. Wire it: `route()` → `speak()` → `#card` render.
6. **T+15: deploy a hello-world to OpenAI Sites** and confirm a `fetch` to
   Convex succeeds from that origin. This is the CORS canary — find out now,
   not at 17:00.

### A2 — Avatar + voice + singing
**Owns:** `src/avatar.js`, `src/voice.js`, `assets/jingle.mp3`

1. Four visual states: idle, listening, speaking, singing. CSS or Lottie,
   whichever is faster. **Stylized, not a likeness.**
2. `speak()` calls `POST /tts`, gets mp3 bytes, `URL.createObjectURL`, plays,
   sets avatar state, resolves on `ended`.
3. `sing()` plays a short **original** cue, 3–5 seconds. Write the line
   yourself: *"Follow the glowing line, Lands End is right on time."* Record it,
   generate it, or hum it into a phone. **Ship the file by T+20 — this is the
   one asset with no fallback.**
4. `startMic()` via `webkitSpeechRecognition`, continuous off, interim on.
   Chrome only, fine for a demo. **Never let the mic block anything** — the text
   input stays visible at all times.
5. Until A4's `/tts` is live, play a local mp3 through the same code path. Do
   not sit idle waiting on the backend.

### A3 — Map + routing
**Owns:** `src/map.js`, `assets/map.svg`, `data/venue.json`

1. **Convert the map first, 15-minute timebox.** `pip install pymupdf`, then
   `page.get_svg_image()` on `Outside Lands Map.pdf`. Inline the result.
   **If it hasn't converted in 15 minutes, stop and hand-place points over a PNG
   render** (`convert` is installed). The route line is what sells this, not
   vector fidelity.
2. Hand-place coordinates for South Gate, Lands End Stage, and one each of
   water / restroom / merch / exit along the route. **Six points is the whole
   demo.** More only if ahead.
3. `route()` draws an SVG polyline along `edges`, computes walking minutes from
   pixel distance, highlights the destination pin.
4. `nearest()` is a linear scan filtered by type. Six points — no spatial index,
   no pathfinding library.
5. Use the festival's own palette for pins and the route line. Free credibility.
6. **A3 has no backend dependency.** Never blocked; if ahead, add points.

### A4 — Convex backend + artist data
**Owns:** `convex/**`, `tools/pull-jambase.mjs`

1. **T+15: all three endpoints live, returning hardcoded values.** A1 and A2 are
   blocked on the contract, not the logic. Ship the stubs, then fill them in.
   Hardcode a real Strokes show so `/nextshow` is demo-correct from minute one.
2. **CORS + `OPTIONS` routes on every endpoint, from the very first deploy.**
   See §2. Do not leave this for later — it fails at the browser, not the server,
   and it looks like a dead endpoint.
3. `/ask` → GPT-5.6, returns `{speech, dest}`. Instruct JSON only; strip
   markdown fences defensively; try/catch the parse and fall back to speaking
   the raw text.
4. `/tts` → OpenAI TTS, returns `audio/mpeg`. Generic warm voice, rate slightly
   below default. **Not an imitation of anyone.**
5. `/nextshow` reads a Convex **table**, never JamBase live. `tools/pull-jambase.mjs`
   does a v3 events search (**Bearer token in the `Authorization` header**,
   paginated) and seeds the table once. Live JamBase calls at 6pm are a known
   way to die on stage.
6. **Only after 1–5 are green:** cache `/tts` responses in a table keyed by a
   hash of the text. First call generates, the rest are instant, and every
   scripted line is warm by demo time. Ten lines, real payoff, genuinely the
   right use of the database.

---

## 6. Timeline

| Time | |
|---|---|
| 15:30–15:45 | Phase 0 — Convex login + deploy + env, stubs, pymupdf |
| 15:45–16:45 | Four agents. Checkpoints: **A4 endpoints T+15** · A1 shell T+10, Sites+CORS canary T+15 · A2 jingle T+20 · A3 map T+15 |
| 16:45–17:05 | Lead integrates. Agents don't merge well. |
| 17:05–17:15 | Buffer. Cut, don't fix. |
| **17:15** | **HARD LOCK. Record the backup video regardless of state.** |
| 17:15–18:00 | Rehearse the pitch out loud, three times. |

## 7. Cut order if behind

TTS cache table → amenities beyond water → `/ask` LLM fallback (keyword only) →
mic (type instead) → converted SVG (PNG + pins) → live JamBase pull (seed the
table by hand).

**Never cut:** the route drawing, the sung cue, the ticket card. Those are the
three beats of the demo.

**Minimum shippable:** avatar visible and animating · answers one typed question
aloud · draws South Gate → Lands End with a walk time · sings the cue once ·
shows one ticket card.

If behind at 17:15, demo the minimum and say nothing about the rest.

## 8. Live risks

| Risk | Owner | State |
|---|---|---|
| Convex login round-trip blocks everything | lead | **first action in Phase 0** |
| CORS / missing `OPTIONS` preflight | A4 | headers on the first deploy; A1 runs the canary at T+15 |
| Wrong host (`.convex.cloud` vs `.convex.site`) | A4 | see §2 |
| No API keys in env yet | human | **blocks A4 — resolve by 15:45** |
| No PDF→SVG tool installed | A3 | `pip install pymupdf`, 15-min timebox, PNG fallback |
| Autoplay blocks first audio | A2 | AudioContext born inside the `#wake` handler |
| Mic misfires on stage | A2 | text input always visible; type it |
| JamBase rate limit at 6pm | A4 | Convex table only, zero live calls |
| Convex cold start adds latency | A4 | TTS cache table warms every scripted line |
| Jingle asset never gets made | A2 | **no fallback — ship it by T+20** |
| 110 minutes, not 4 hours | all | stub-first checkpoints; cut order above |
