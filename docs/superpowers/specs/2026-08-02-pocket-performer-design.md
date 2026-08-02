# Pocket Performer — focused design

## Outcome

Build one demoable object: a phone containing a realistic, animated electro-pop performer. The user turns one tactile dial to choose among three original song hooks. Releasing the dial starts a synchronized dance-and-sing performance. During playback, the same dial controls the stage energy: glow, color, camera push, particles, and audio brightness.

This replaces the current portrait-plus-conversation-panel interface. Conversation, map routing, tickets, and the broader StageMate workflow are outside this build.

## Creative direction

- Subject: an original synthetic electro-pop performer with dark hair, strong eyeliner, black stagewear, and a recognizable Charli-XCX-adjacent energy without claiming to be the real person.
- Presentation: premium black phone, black stage, controlled crimson and electric color, direct eye contact, confident movement.
- Technique: 2.5D idle/selection states plus three pre-rendered performance videos. The avatar should feel dimensional, but the browser will not attempt to rig photoreal limbs.
- Tone: intimate pocket concert rather than game, website, dashboard, or FaceTime call.

## Primary screen

The experience is composed as a `390 × 844` phone viewport.

- On desktop, the phone is centered on a near-black background with a restrained reflection beneath it.
- On mobile, the bezel disappears and the performance fills the viewport.
- The avatar owns the upper 72% of the screen.
- The lower 28% contains the current song title, one short state instruction, and a 120px crown-style dial inside a 152px touch target.
- No navigation, cards, welcome panel, permanent transport controls, timeline, or marketing copy.

Visible song labels:

- `01 STATIC HEART`
- `02 AFTERIMAGE`
- `03 NEON FEVER`

Visible state copy:

- Idle: `TURN TO CHOOSE`
- Selecting: `RELEASE TO PLAY`
- Playing: `TURN UP THE ENERGY`
- Paused: `TAP TO RESUME`
- Finished: `TURN FOR ANOTHER`
- Energy words: `LOW GLOW`, `CHARGED`, `PEAK`

## Interaction model

### Choose mode

- Drag around the outer dial ring with pointer, mouse, or touch.
- Three song detents sit at `−48°`, `0°`, and `+48°`.
- An 8° hysteresis band prevents rapid song switching near a midpoint.
- Crossing a detent produces a quiet mechanical tick and a 140ms magnetic snap.
- Overscrolling produces a short rubber-band movement and returns to the nearest valid detent.
- Releasing at a detent locks the song with a deeper 60ms clunk and immediately starts playback.
- The numbered detents are also real tappable buttons.

### Performance mode

- The detent marks dissolve into an energy ring.
- Energy begins at 20%.
- Clockwise relative rotation raises energy; counterclockwise rotation lowers it. The user can re-grip and continue turning.
- 120° of accumulated rotation spans 0–100 energy.
- Tap the dial to pause or resume.
- Hold for 500ms, or tap the song title, to return to choose mode.

Energy mapping, with normalized energy `e`:

- Glow opacity: `e²`
- Saturation: `1 + 0.45e`
- Camera scale: `1 + 0.035e`
- Particle count: `6 + round(22e)`, capped at 30fps
- Foreground drift: 2–6px
- Audio low-pass: 1.8kHz → 18kHz
- Gain: 0.72 → 1.0
- At 100: one-frame white bloom and a firm visual stop

The dial never changes video playback speed because that would break lip synchronization.

Keyboard fallback:

- Arrow keys: select songs or change energy by 5
- Enter: start, pause, or resume
- Home/End: set energy to 0/100
- Escape: return to choose mode

## Avatar and performance media

The browser should not rig realistic arms and legs. Layered photoreal body parts expose joint seams; full-pose crossfades create doubled limbs. The highest-quality demo uses a hybrid:

### Idle and selection

- Six registered `780 × 1688` transparent WebP poses.
- Small 90–120ms pose crossfades hidden inside a light pulse.
- Subtle breathing, phone-tilt parallax, and 2–4px head/body drift.
- No exaggerated movement before the song begins.

### Performance

- Three full-frame `780 × 1688`, 24fps H.264/AAC MP4 files, one per song.
- Each video is 4–7 seconds for the first demo.
- The original vocal and music are baked into the video.
- Camera, avatar scale, stage, and lighting remain registered across every asset.
- The first and final 150–250ms match an idle pose so the browser can crossfade without a jump.
- Each hook includes one brief 10–15% camera push during its strongest sung line.
- Runtime lip-sync is not used during songs. The performance media contains the final synchronized mouth and body animation.

Stage overlays remain code-native above the videos: glow, haze, particles, vignette, beat flash, and subtitles. This lets the dial change the energy without changing the baked choreography.

### Asset inventory

- `stage-back.webp` — opaque `780 × 1688` stage plate
- `stage-mid.webp` — transparent haze and light-depth layer
- `stage-front.webp` — transparent foreground silhouettes/reflections
- `pose-0.webp` through `pose-5.webp` — six registered full-body selection poses
- `static-heart.mp4`, `afterimage.mp4`, `neon-fever.mp4` — three synchronized performances
- `performances.json` — media, lyric, beat, effect, and transition data

### Performance authoring pipeline

1. Generate one approved full-body character and six registered idle/selection poses with Image Gen, using the same face, outfit, camera, and stage coordinates.
2. Render each original audio master locally.
3. Use a song-aware avatar/video renderer such as HeyGen Avatar IV to turn the approved character image plus each original audio master into three short dance-and-sing clips. Avatar IV is the selected authoring route because its documented workflow accepts songs and renders synchronized avatar video; it is not a runtime dependency.
4. Normalize all clips with FFmpeg to the registered `780 × 1688`, 24fps H.264/AAC delivery format and matching neutral entry/exit frames.
5. If the video-authoring account is unavailable, use a local FFmpeg pose-animation clip only to develop the dial and cue system. Do not treat that pose-loop fallback as the final visual demo.

## Three original hooks

The hooks are short, original, and pre-rendered once. No copyrighted music or artist voice is used.

### 01 STATIC HEART

- 128 BPM, 4.25 seconds
- Euphoric festival synth-pop
- Chords: Em–C–G–D
- Original line: `Follow the glowing line / Lands End is right on time`
- Movement: confident side sway, shoulder hit, upward chorus pose
- Color: crimson → white-hot red

### 02 AFTERIMAGE

- 104 BPM, 4.9 seconds
- Dreamy nocturnal synth-pop
- Chords: Am–F–C–G
- Original line: `Fog turns gold / when the low lights bloom`
- Movement: slower turn, hair movement, close camera push
- Color: deep violet → electric blue

### 03 NEON FEVER

- 140 BPM, 3.85 seconds
- Punchy electro chant
- Chords: Dm–Bb–F–C
- Original line: `Left, right / red lights ignite`
- Movement: sharper two-count hits and final freeze
- Color: acid green → hot magenta

### Local audio rendering

- Render deterministic 48kHz stereo tracks with `OfflineAudioContext`.
- Synthesize drums, bass, chords, and pitched formant-vowel lead in code.
- Generate quiet consonant/lyric layers with the installed macOS `say` voice, then align and lightly pitch them with FFmpeg.
- Keep the speech layer at 20–30% volume beneath the pitched vowel carrier so it reads as intentionally synthetic singing.
- Finish with compression and limiting, export WAV for video authoring, then bake AAC into each MP4.

The production pipeline runs locally once; the shipped demo has no dependency on `say`, FFmpeg, or a network music service.

## Cue data

`performances.json` is the source of truth for labels, lyrics, beats, effects, media, and transition poses.

```json
{
  "version": 1,
  "songs": [
    {
      "id": "static-heart",
      "title": "STATIC HEART",
      "bpm": 128,
      "src": "/public/performances/static-heart.mp4",
      "entryPose": 2,
      "exitPose": 4,
      "lyrics": [
        { "start": 0.08, "end": 1.53, "text": "Follow the glowing line" }
      ],
      "beats": [
        { "at": 0.47, "strength": 0.8 },
        { "at": 0.94, "strength": 1.0 }
      ],
      "effects": [
        { "at": 2.4, "duration": 0.18, "kind": "flash", "strength": 0.9 }
      ]
    }
  ]
}
```

All runtime events are driven from `video.currentTime`, never guessed `setTimeout` values. Effective effect intensity is `cue.strength × (0.35 + 0.65 × dialEnergy)`.

## State machine

```text
idle-pose
  -> dial-preview
  -> performance-loading
  -> performance-enter
  -> performance-playing
  -> performance-paused
  -> performance-exit
  -> idle-pose

any active state -> stopping -> idle-pose
```

`avatar.js` is the only state-machine owner. Other modules emit events and never directly change application mode.

## Module boundaries

- `app.js`: bootstrapping and user-event orchestration only
- `avatar.js`: state machine and transition ownership
- `dial-controller.js`: pointer geometry, detents, hysteresis, keyboard input, tap/hold behavior
- `dance-renderer.js`: stage layers, idle poses, media crossfades, responsive sizing
- `performance-player.js`: preload/play/pause/stop and the authoritative media clock
- `cue-player.js`: lyrics, beat, and effect events derived from media time
- `energy-controller.js`: CSS variables, audio filter/gain, camera energy, glow, and particles
- `audio/render-hooks.mjs`: build-time generation of the three original audio masters
- `public/performances/performances.json`: song and cue data

## Loading and failure behavior

- Preload the idle pose and selected performance first; preload the other two after interaction becomes available.
- The dial remains disabled only until the first pose has decoded.
- If a song fails to load, keep the avatar in its idle pose, show `TRY ANOTHER`, and leave the other detents active.
- If audio playback is blocked, the first dial release is the required user gesture and retries playback directly.
- Switching songs stops the current media, resets cues and audio nodes, then crossfades from its exit pose.

## Accessibility

- The three dial numbers are buttons with full song names.
- A small `CONTROLS` action opens a bottom sheet with three 44px song buttons, Play/Pause, a native energy slider, and a lyrics toggle.
- Screen readers announce song changes and energy only at 25-point intervals.
- Reduced Motion removes parallax, particles, camera shake, and large zooms while retaining media playback, brightness changes, and crossfades.
- Text always expresses state; color is never the only signal.

## Demo path

1. The avatar breathes in near-darkness under `TURN TO CHOOSE`.
2. Rotate through the three detents and land on `AFTERIMAGE`.
3. Release. The clunk lands, the hook starts, and the avatar dances and sings.
4. Turn energy past 50. Blue/violet light spreads and the camera moves closer.
5. Turn to 100 on the final line. The stage blooms, particles hit, and the avatar freezes on the exit pose.
6. Hold the dial, snap to `NEON FEVER`, and release into the second performance.

## Verification budget

Keep verification proportional to the demo:

- Syntax check all JavaScript modules.
- Unit-test dial detents/hysteresis and state transitions.
- One browser happy path: choose one song, play, raise energy, pause, return to chooser.
- One phone-size screenshot compared with the approved concept.
- Confirm all three media files decode and begin playback.

No broader regression or cross-browser matrix is required for this demo iteration.
