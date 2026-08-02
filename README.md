# Casablancas

Casablancas is a voice-powered Outside Lands guide built around The Strokes. It answers festival questions, draws walking routes, finds nearby amenities, plays an original jingle, and links to the band's next show.

## How it works

```text
Static browser app
  ├─ local keyword routing → map, amenities, and scripted demo
  └─ Convex HTTP actions
       ├─ /ask      → OpenAI
       ├─ /tts      → ElevenLabs
       └─ /nextshow → Convex shows table / JamBase fallback
```

The frontend is plain HTML, CSS, and ES modules. API keys stay in Convex and are never sent to the browser.

## Quick start

Requirements: Node.js, npm, and a Convex account.

```bash
npm install
npx convex dev
```

The first `convex dev` run authenticates, links a development deployment, uploads the backend, and generates Convex types. Keep it running while developing.

Set the server-side secrets interactively so they do not appear in shell history:

```bash
npx convex env set OPENAI_API_KEY
npx convex env set ELEVENLABS_API_KEY
```

Update `globalThis.CASABLANCAS_CONFIG.apiBase` near the bottom of `index.html` if your deployment differs. HTTP actions must use the `https://<deployment>.convex.site` hostname, not `.convex.cloud`.

In a second terminal, serve the repository with any static file server:

```bash
npx --yes serve .
```

Open the displayed local URL and select **Enable sound** before starting the demo.

## Environment variables

| Variable | Location | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Convex environment | Unmatched guide questions through `/ask` |
| `ELEVENLABS_API_KEY` | Convex environment | Guide speech through `/tts` |
| `JAMBASE_API_TOKEN` | Local `.env` | Pull upcoming shows for seeding |
| `CONVEX_SITE_URL` | Local `.env.local` | Run the deployed endpoint canary |

Both `.env` files are ignored by Git. The ElevenLabs voice ID is configured in `convex/http.ts`; only use a voice you are authorized to deploy.

## Seed upcoming shows

Add `JAMBASE_API_TOKEN` to the ignored local `.env`, then run:

```bash
npm run pull:jambase -- --seed
```

Without seeded data, `/nextshow` returns the built-in JamBase listing for The Strokes.

## Tests

```bash
node --test test/a2.test.mjs
node tools/pull-jambase.mjs --self-test
node --env-file=.env.local test/phase0-canary.mjs
```

The canary requires a deployed backend and `CONVEX_SITE_URL=https://<deployment>.convex.site` in `.env.local`. It exercises CORS and all three HTTP endpoints, including a billable TTS request.

## API contracts

| Method | Path | Request | Response |
|---|---|---|---|
| `POST` | `/ask` | `{ "text": "..." }` | `{ "speech": string, "dest": string \| null }` |
| `POST` | `/tts` | `{ "text": "..." }` | MP3 audio |
| `GET` | `/nextshow?artist=The%20Strokes` | — | Show object or `null` |

Every route supports cross-origin browser requests. `/ask` and `/tts` limit text to 500 characters.

## Project structure

```text
index.html, styles.css  Static application shell
src/                    App wiring, API client, avatar, voice, and map
convex/                 HTTP routes, schema, and show queries
data/venue.json         Demo points and walking graph
assets/                 Festival map and original jingle
tools/pull-jambase.mjs  JamBase import and Convex seed script
test/                   Voice contract test and deployed canary
CASABLANCAS.md          Product requirements and execution plan
```

## Deploy

Deploy the backend, set the production environment variables, update `apiBase` to the production `.convex.site` URL, then publish the static files to OpenAI Sites:

```bash
npx convex deploy
npx convex env set --prod OPENAI_API_KEY
npx convex env set --prod ELEVENLABS_API_KEY
```

Run the phase-zero canary against production before sharing the site.
