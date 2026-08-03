# Festival Turn-by-Turn Navigation Design

## Goal

Replace the static festival-poster route view with one convincing Google Maps-style walking demo from Lands End Stage to Sutro Stage.

## Locked Demo Loop

1. The map opens on a short route overview with Lands End as the current location and Sutro as the destination.
2. The user taps **Start walking**.
3. A blue location puck moves automatically along a curated path while the camera follows with a slight pitch and route-aligned bearing.
4. The instruction card, remaining distance, and ETA update at predetermined turns.
5. Water and restroom markers appear as secondary context without obscuring the route.
6. On arrival, the camera frames Sutro and the card reads **Sutro Stage is ahead**.
7. Pause/resume and restart keep the hackathon demo controllable.

## Visual Direction

- Use a real geographic Golden Gate Park basemap, not the Outside Lands poster.
- Render the route as a thick Casablancas acid-green line with a darker halo.
- Render the current user as a Google Maps-style blue puck with a heading cone and pulse.
- Use compact floating navigation chrome over a nearly full-screen map: instruction banner at top, ETA card and controls at bottom.
- Retain the existing Casablancas black, white, and acid-green brand language.
- Keep stage and amenity markers sparse and legible.

## Architecture

- Load MapLibre GL JS from a pinned CDN version and use an OpenFreeMap vector style.
- Store the complete deterministic demo route, instruction thresholds, and venue markers in local GeoJSON-compatible data.
- Keep movement and route interpolation in a small pure navigation module; the map renderer consumes navigation frames and owns camera/layer updates.
- Integrate the navigator into the existing Map tab without changing the performer or Shows experiences.
- If vector tiles fail, show an explicit retry state; do not fall back to the poster.

## Scope Boundaries

- One route only: Lands End Stage to Sutro Stage.
- Simulated location only; no claim of live GPS.
- No routing API, search, crowd density, rerouting, offline tiles, or production location permissions.
- Desktop and mobile browser support sufficient for the hackathon demo.

## Acceptance Criteria

- The poster is absent from navigation mode.
- Start, pause/resume, and restart work reliably.
- The puck, bearing, instructions, distance, ETA, camera, and arrival state update together.
- The route follows plausible real Golden Gate Park paths.
- The map fits a 390 x 844 viewport without horizontal overflow or hidden controls.
- Existing automated tests and syntax checks pass; navigation interpolation has focused unit coverage.
