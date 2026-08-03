# Plan 001: Harden A1/A2 interaction reliability

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report; do not improvise. Commit the finished
> work in the isolated worktree. Do not update `plans/README.md`; the reviewer
> maintains it.
>
> **Drift check (run first)**:
> `git diff --stat 6ddd93c..HEAD -- src/app.js src/api.js src/voice.js index.html test/a2.test.mjs package.json`
> Expected before execution: no output. If these files drifted, stop.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, tests, dx
- **Planned at**: commit `6ddd93c`, 2026-08-02

## Why this matters

A1 and A2 work on the happy path, but failures are represented ambiguously.
`speak()` hides errors, so A1 guesses failure from elapsed time; failed map
routes still advance the user's location; and concurrent UI/microphone events
can race over shared location, card, and audio state. These are high-impact demo
risks on a noisy or slow festival network. The fix must keep the plain HTML/ES
module architecture and add no runtime dependency.

## Current state

- `src/app.js` owns intent handling, navigation state, cards, and browser speech.
- `src/api.js` owns the single validated Convex HTTP base and fetch wrappers.
- `src/voice.js` owns ElevenLabs playback, jingle playback, and speech recognition.
- `index.html` contains the two live regions and all interactive controls.
- `test/a2.test.mjs` uses Node's built-in test runner and small browser fakes.

Current failure contract (`src/voice.js:22-34`):

```js
export async function speak(text) {
  if (!text?.trim()) return;
  let url;
  try {
    url = await tts(text.trim());
    await play(url, "speaking");
  } catch (error) {
    console.warn("Speech playback failed.", error);
    setState("idle");
  } finally {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
```

Current heuristic (`src/app.js:61-70`):

```js
const started = performance.now();
try {
  await speak(text);
  if (performance.now() - started < 250) await browserSpeak(text);
} catch (error) {
  await browserSpeak(text);
}
```

Current route commit (`src/app.js:91-105`):

```js
const result = await drawRoute(destination);
location = destination;
const walk = walkLabel(result.minutes);
```

Current request wrapper (`src/api.js:31-34`) has no deadline:

```js
const response = await fetch(`${apiBase()}${path}`, options);
if (!response.ok) throw new Error(`${path} request failed (${response.status}).`);
```

Conventions to preserve:

- Plain ES modules, semicolons, double quotes, no frontend build step.
- Native browser/Node APIs before dependencies.
- User-visible failures must retain typed-input and browser-speech fallbacks.
- API keys remain server-side; do not read or modify `.env` files.
- Rights guardrails remain: generic voice, stylized avatar, original jingle.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm ci` | exit 0 |
| Existing tests | `node --test test/a2.test.mjs` | 1 pass, 0 failures before changes |
| Syntax | `node --check src/app.js && node --check src/api.js && node --check src/voice.js` | exit 0 |
| Full tests after step 6 | `npm test` | all tests pass |
| Dependency audit | `npm audit --omit=dev` | 0 vulnerabilities |

## Scope

**In scope** (only these files may change):

- `src/app.js`
- `src/api.js`
- `src/voice.js`
- `index.html`
- `test/a2.test.mjs`
- `test/api.test.mjs` (create)
- `package.json`

**Out of scope**:

- `src/avatar.js` and `styles.css`; reuse the existing `setState` interface.
- `src/map.js`, `data/**`, and `assets/**`.
- `convex/**` and all backend behavior.
- `.env`, `.env.local`, deployment configuration, or API keys.
- New dependencies, framework migration, service workers, or caching.

## Git workflow

- Branch: `codex/a1-a2-reliability`.
- Commit once after all criteria pass using conventional commit style, for
  example `fix: harden voice and interaction fallbacks`.
- Do not push, merge, or open a PR.

## Steps

### Step 1: Make playback success explicit

In `src/voice.js`, make `play(url, state)` resolve `true` only when audio ends
normally and `false` for `audio.onerror` or a rejected `audio.play()` promise.
Always clear handlers and restore the avatar to `idle`. Make `speak(text)` return
`false` for empty input or any TTS/playback failure, return `true` after normal
playback, and still revoke blob URLs in `finally`. `sing()` may return the
boolean but must remain non-throwing so a missing jingle cannot replace a
successful route card with a generic app failure.

In `src/app.js`, delete the `performance.now()` heuristic. `say(text)` must call
browser speech exactly when `await speak(text)` is false.

**Verify**: `rg "performance\.now|started <|started =" src/app.js` returns no
matches; `node --check src/app.js && node --check src/voice.js` exits 0.

### Step 2: Keep browser fallback visually consistent

Import `setState` alongside `initAvatar` in `src/app.js`. In `browserSpeak`, set
the avatar to `speaking` immediately before calling `speechSynthesis.speak` and
restore `idle` exactly once on end or error. If browser speech is unavailable,
leave or restore `idle` and resolve immediately.

Remove `aria-live="polite"` from `#avatar` in `index.html`; the card remains the
single polite live region, while the avatar keeps its existing accessible label.

**Verify**: `rg -n 'id="avatar" aria-live' index.html` returns no matches, and
`rg -n 'setState\("speaking"\)|setState\("idle"\)' src/app.js` returns both.

### Step 3: Commit navigation state only after successful routes

Change `drawRoute(destination)` to return `null` when the map is unavailable,
`route()` returns no result, or routing throws. Treat a successful route as an
object with a finite `minutes` value.

Update `directions`, `stage`, and the unmatched `/ask` destination path so
`location` changes only after successful routing. On failure, render and speak
truthful copy saying the map cannot draw the route; do not claim a glowing line
exists. The stage action should still identify Lands End and play the original
jingle after the fallback speech.

**Verify**: `rg -n 'location =' src/app.js` shows assignments only inside
successful route branches plus the initial `south-gate` declaration.

### Step 4: Serialize UI work and deduplicate microphone sessions

In `src/app.js`, add one module-level `busy` flag. `handle()` must return early
when already busy, set busy before asynchronous work, disable send, mic, and all
quick-action buttons, set `card.ariaBusy = "true"`, and restore every control and
remove the busy state in `finally`. Do not disable the always-visible text input.

In `src/voice.js`, keep one module-level active recognition instance. Repeated
`startMic()` calls while it is active must return that instance instead of
starting another. Clear it on error/end. Guard final submission with
`!submitted` so the callback runs at most once even if the browser emits multiple
final result events.

**Verify**: `node --check src/app.js && node --check src/voice.js` exits 0.

### Step 5: Bound and validate frontend API calls

In `src/api.js`, apply a native `AbortSignal.timeout(12000)` when callers did not
provide a signal. Preserve all caller options. Translate timeout failure into a
clear error mentioning the endpoint and timeout; do not retry.

Validate `/ask.dest` against exactly `null`, `lands-end`, `water`, `restroom`,
`merch`, or `exit`. Validate a non-null `/nextshow` object has string `artist`,
`date`, `venue`, `city`, `ticketUrl`, and `provider` fields. Keep URL protocol
validation in `src/app.js`.

**Verify**: `node --check src/api.js` exits 0.

### Step 6: Add regression coverage and a single test command

Extend `test/a2.test.mjs` to cover:

- successful `speak()` returns `true`;
- a failed TTS response or rejected playback returns `false` and resets idle;
- two final recognition events invoke the callback once;
- calling `startMic()` twice while active returns the same recognition object.

Create `test/api.test.mjs` using Node's built-in `node:test` and mocked `fetch` to
cover valid responses, invalid destination rejection, invalid show rejection,
and timeout/error translation. Do not contact live services.

Add `"test": "node --test test/*.test.mjs"` to `package.json`. Do not add a test
framework or modify `package-lock.json` merely for a script change.

**Verify**: `npm test` exits 0 with all new cases passing.

## Test plan

- Follow the fake-browser style already in `test/a2.test.mjs`.
- Tests must assert returned booleans, exact callback count, shared recognition
  identity, destination enum rejection, show-shape rejection, and timeout error.
- Run `npm test`; no test may call Convex, ElevenLabs, OpenAI, or JamBase.
- Reviewer will separately run a browser smoke pass for stage, water, rapid
  double-click, and forced TTS failure behavior.

## Done criteria

- [ ] `npm ci` exits 0 in the isolated worktree.
- [ ] `npm test` exits 0 and covers the named regressions.
- [ ] Syntax checks for `src/app.js`, `src/api.js`, and `src/voice.js` exit 0.
- [ ] `npm audit --omit=dev` reports zero vulnerabilities.
- [ ] `rg "performance\.now" src/app.js` has no matches.
- [ ] `#avatar` is not an ARIA live region; `#card` remains one.
- [ ] No files outside the Scope list changed.
- [ ] Work is committed on `codex/a1-a2-reliability` and not pushed or merged.

## STOP conditions

Stop and report instead of improvising if:

- The drift check reports an in-scope change after commit `6ddd93c`.
- A fix requires changing `src/map.js`, `src/avatar.js`, or `convex/**`.
- Testing requires a new dependency or live API credential.
- Existing A2 tests fail before any source edit.
- Any verification still fails after two reasonable attempts.

## Maintenance notes

- Keep the 12-second deadline aligned with backend latency expectations; tune it
  only from measured canary results.
- If future UX should interrupt rather than reject concurrent actions, replace
  the busy guard deliberately with abortable last-action-wins behavior and test
  audio, route, and card cancellation together.
- Preserve `speak()`'s boolean contract; timing-based failure detection must not
  return.

