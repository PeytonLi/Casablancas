# Casablanca demo design spec

Concept reference: `/Users/ranax/.codex/generated_images/019fc48d-d81f-72e1-a58f-e06b557b7d14/exec-7277f81f-ac2b-4401-a18a-0fd528ccd747.png`

Standalone portrait: `/Users/ranax/.codex/generated_images/019fc48d-d81f-72e1-a58f-e06b557b7d14/exec-9c0d7c5d-d1e7-4a9e-9810-74cbc2d93700.png`

Verified renders:

- `docs/qa/casablanca-desktop.png` at the concept's native `1505 × 1045` viewport.
- `docs/qa/casablanca-mobile.png` at a `390 × 844` mobile viewport.

## Locked surface

- One full-viewport music studio composition.
- Large photorealistic portrait on the left; one conversation panel on the right.
- Native UI copy: `CASABLANCA`, `Welcome.`, `Ask me anything…`, `Talk`, `Sing an original hook`, and the AI/synthetic-voice disclosure.
- Core states: idle, listening, thinking, speaking, and singing.
- Core path: type or speak a prompt -> receive an audible answer -> perform an original synthetic hook.

## Design system

- Background: true near-black `#070707`, not cream or gray.
- Accent: crimson `#f04444`; restrained use on borders and live state.
- Typography: Manrope/Inter for product UI, Playfair Display for the welcome heading.
- Container model: open portrait canvas plus one purposeful translucent panel. No card grid.
- Motion: subtle breathing portrait; localized jaw movement and red practical-light pulse only while performing.
- Icons: custom 1.5–1.65px outline SVGs with round caps and joins.
