# Charley Performance Polish Design

## Goal

Polish the existing mobile performer without replacing the working 29-part SVG rig. The finished demo should show visibly better dancing, offer eight radio selections, and expose one compact **Ask Charley** interaction ready for the existing agent endpoint.

## Scope

### Dance quality

- Keep the current illustrated performer and 29 independently animated parts.
- Preserve five distinct moves per dance profile.
- Improve motion through anticipation, recovery, planted-foot weight transfer, hip and shoulder counter-rotation, curved arm timing, secondary hair and clothing follow-through, and smoother phrase-to-phrase blending.
- Hoist choreography data out of the animation loop and avoid per-frame pose allocations so the added polish remains smooth on iPhone.
- Accept audio pulse timing as a soft phase/intensity input while retaining elapsed-time choreography as the fallback.
- Keep idle breathing, blinking, gaze, touch reaction, track emotion, and reduced-motion behavior.
- Lip sync remains functional but receives no additional polish in this pass.

### Radio

- Expand from four to eight selections: `360`, `Von dutch`, `Apple`, `Club classics`, `B2b`, `Talk talk`, `Guess`, and `365`.
- Replace parallel track arrays and static HTML options with one canonical catalog in `src/music.js`.
- Each catalog entry owns its title, file name, BPM, emotion, dance profile, and original built-in arrangement.
- Generate tuner buttons from `getTracks()` so the UI cannot drift from the playback catalog.
- Keep the existing horizontal tuner, immediate playback, local-audio priority, built-in fallback, and 18-second automatic advance.

### Ask Charley

- Replace the passive `Artist mode` header label with one compact **Ask Charley** button.
- The button opens a small sheet above the bottom navigation.
- The sheet contains a close control, one question field, one Send button, and an `aria-live` answer/status region.
- Submitting calls a single `askCharley(question)` integration seam that targets the existing `/ask` contract and expects `{ speech, dest }`.
- Do not invent fake knowledge. If the endpoint is unavailable, keep the question visible and show a concise connection status.
- Escape closes the sheet; opening focuses the input; empty submissions remain disabled.
- The sheet must not stop playback, reset the avatar, or take over the full screen.

## Architecture

- `src/music.js`: canonical eight-track catalog, arrangements, source handling, and public track metadata.
- `src/app.js`: creates tuner controls from catalog data; maps each selection to its emotion and dance profile; owns Ask Charley open, close, submit, and response state.
- `src/performer-rig.js`: retains the rig API, adds a pulse input, and improves pose interpolation, body mechanics, secondary springs, and animation-loop allocation. New tracks reuse one of four established emotion/dance profiles through explicit catalog metadata.
- `index.html`: keeps structural containers only, including an empty tuner list and compact Ask Charley sheet.
- `src/styles.css`: preserves the black, brat-green, chrome mobile language and adds only the header button and sheet styles.

## Data Flow

1. `getTracks()` returns the complete public catalog.
2. `app.js` renders track buttons and selects the first track.
3. A tap or tuner gesture updates track UI, emotion, rig profile, and playback without interrupting the dance transition.
4. Music pulses softly correct dance phase and intensity; lost or suspended audio falls back to the rig's internal clock.
5. Missing local audio starts the entry's built-in original arrangement; local licensed audio still takes priority.
6. Ask Charley submit disables the form while awaiting `/ask`, then renders `speech`; a returned `dest` may be passed to the existing map flow in a later integration pass.

## Error Handling

- Audio failure never stops the visual performance.
- Invalid catalog entries fail automated catalog validation.
- Ask Charley network or parse failure returns the sheet to an editable state and shows a short connection message.
- The sheet never fabricates an answer and never blocks navigation or playback.
- If the primary SVG rig fails, the existing animated fallback remains active.

## Testing

- Catalog test: eight unique IDs/files, valid BPM/profile/emotion, complete arrangement shapes.
- Browser test: first and last tuner options center correctly and selecting all eight never opens a file picker.
- Rig test: 29 parts remain present, five distinct move samples occur, track changes blend without an idle reset, and reduced motion remains animated but restrained.
- Ask Charley test: open, focus, empty-submit guard, pending state, error recovery, Escape close, and playback continuity.
- Visual QA at 390 x 844: no horizontal overflow, no clipped sheet, readable controls, and the avatar remains the dominant visual.

## Non-goals

- No Rive or Live2D replacement.
- No avatar redraw.
- No new lip-sync system.
- No full chatbot screen, conversation history, voice cloning, or production agent orchestration.
- No changes to map routing or show-data ownership beyond exposing the future `dest` seam.
