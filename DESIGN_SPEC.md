# Casablancas mobile performance design spec

Accepted base concept: `/Users/ranax/.codex/generated_images/019fc493-a6ee-7881-ab68-8fed7fb09d61/exec-9aeb1fbb-f903-4cb1-807a-73fe64f062e1.png`

Accepted player simplification reference: `/var/folders/t9/qj2kksm15f78yn378qpv9k740000gn/T/codex-clipboard-2f845826-f2c6-4d2f-a2f2-24964703578b.png`

Performer implementation: `src/performer-rig.js` layered SVG puppet.

## Locked surface

- One continuous phone canvas, with the whole Home interaction visible at once.
- Full-body stylized digital pop performer on a black light-bar stage, built from independently animated SVG layers rather than a flat image.
- One minimal horizontal radio-tuner rail with four track labels: `360`, `Von dutch`, `Apple`, and `Club classics`.
- Tapping, swiping, dragging, scrolling, or using the arrow keys tunes between songs. Selecting a title immediately plays its licensed local audio file and starts its matching performance; tapping the active title pauses it.
- When a track ends, the tuner advances to the next available licensed track and keeps the performance moving.
- Performance state drives body movement, light bars, waveform motion, and mouth movement.
- Bottom navigation remains available for `Home`, `Map`, and `Shows`; the route is kept inside the Map view.
- Map view reuses the official Outside Lands map and the South Gate to Lands End route.

## Allowed visible copy

`CASABLANCAS` · `Artist mode` · `360` · `Von dutch` · `Apple` · `Club classics` · `Home` · `Map` · `Shows`

## Design system

- Background: true near-black `#050708`.
- Primary accent: brat green `#95e000` / `#a8ff00`.
- Hardware: a thin neutral frequency scale, fixed needle, and restrained outlines; no oversized chrome dial.
- Typography: Space Grotesk for product chrome and Inter for supporting copy.
- Container model: one continuous canvas; no dashboard card grid and no chatbot panel.
- Motion: independent head, torso, upper/lower arms, thighs, lower legs, eyes, pupils, eyebrows, five mouth shapes, hair sections, belt straps, light-bar hits, waveform beats, and five choreography phrases per song.
- Icons: custom code-native SVG outlines with round joins and consistent 1.45-1.6 px stroke.

## Media treatment

- The performer is a code-native vector puppet. Idle breathing, weight shifts, blinks, gaze, hair follow-through, touch reactions, four emotions, and four dance styles remain active without raster imagery.
- Lip synchronization uses analyser amplitude from the playing audio and closes naturally on downbeats and quieter phrases.
- No photoreal celebrity copy, voice cloning, bundled commercial recordings, album art, or copyrighted lyrics.
- Track titles act as the entire player UI. Licensed files can live in `public/audio/`, and a missing song opens the device audio picker instead of substituting a synthetic beat.

## Responsive model

- Native verification viewport: `390 x 844`.
- On a desktop, the same surface is centered in a restrained device-like frame.
- At narrow widths, typography and controls scale without changing section order or hiding the horizontal tuner rail.
