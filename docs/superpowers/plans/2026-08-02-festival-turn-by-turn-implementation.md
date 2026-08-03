# Festival Turn-by-Turn Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one polished simulated walking navigation demo from Lands End Stage to Sutro Stage on a real Golden Gate Park basemap.

**Architecture:** A local route-data module describes the GeoJSON path, venue markers, and turn thresholds. A pure navigation engine interpolates frames along the path. The MapLibre renderer owns basemap layers, the moving puck, route camera, and controls, while `src/app.js` only opens and resets the Map view.

**Tech Stack:** Plain HTML/CSS/ES modules, MapLibre GL JS 5.24.0, OpenFreeMap vector style, Node test runner.

## Global Constraints

- One deterministic Lands End Stage to Sutro Stage route only.
- Never display the festival poster in navigation mode.
- Never describe the simulated location as live GPS.
- Preserve the performer and Shows experiences.
- Keep all route data local and require no API key.

---

### Task 1: Route Data

**Files:**
- Create: `data/navigation-route.js`

**Interfaces:**
- Produces: `NAVIGATION_ROUTE`, `VENUE_MARKERS`, and `NAVIGATION_STEPS` immutable exports using `[longitude, latitude]` coordinates.

- [ ] **Step 1:** Define a plausible route between the Lands End/Polo Field area and Sutro/Lindley Meadow using real park-path coordinates.
- [ ] **Step 2:** Add stage, water, and restroom markers plus instruction thresholds covering departure, two turns, approach, and arrival.
- [ ] **Step 3:** Import the module with Node and assert the path has at least eight coordinates, ordered thresholds, and valid longitude/latitude values.

### Task 2: Pure Navigation Engine

**Files:**
- Create: `src/navigation.js`
- Create: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: arrays of `[longitude, latitude]` coordinates and step thresholds.
- Produces: `prepareRoute(coordinates, steps)`, `frameAt(route, progress)`, and `bearingBetween(from, to)`.

- [ ] **Step 1:** Write tests proving start/end interpolation, monotonic remaining distance, threshold-based instruction selection, and stable bearings.
- [ ] **Step 2:** Run `node --test tests/navigation.test.mjs` and confirm the missing exports fail.
- [ ] **Step 3:** Implement haversine segment lengths, distance-based interpolation, bearing, ETA, and instruction selection with no DOM dependency.
- [ ] **Step 4:** Run the focused test and confirm it passes.

### Task 3: MapLibre Navigation Renderer

**Files:**
- Replace: `src/map.js`

**Interfaces:**
- Consumes: `NAVIGATION_ROUTE`, `VENUE_MARKERS`, `NAVIGATION_STEPS`, and navigation frames.
- Produces: `initMap(container)`, `startNavigation()`, `toggleNavigation()`, `restartNavigation()`, and `destroyMap()`.

- [ ] **Step 1:** Initialize MapLibre with the OpenFreeMap bright style centered on the route.
- [ ] **Step 2:** Add route halo/line, destination/amenity symbols, and puck/heading-cone sources and layers.
- [ ] **Step 3:** Animate progress with `requestAnimationFrame`, keeping puck, camera bearing, ETA, distance, and instruction events synchronized.
- [ ] **Step 4:** Stop animation on hidden tabs and expose deterministic pause/resume/restart controls.
- [ ] **Step 5:** Dispatch `navigationframe`, `navigationstate`, and `navigationerror` events from the map container.

### Task 4: Navigation UI Integration

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: renderer controls and its three custom events.
- Produces: accessible instruction banner, map status, Start/Pause/Resume, Restart, and close controls.

- [ ] **Step 1:** Replace destination rail and route summary with a full-map navigation view and branded floating cards.
- [ ] **Step 2:** Add pinned MapLibre CSS/JS resources and a visible tile-load retry state.
- [ ] **Step 3:** Wire Start, Pause/Resume, Restart, close, and renderer events without changing other tabs.
- [ ] **Step 4:** Style the 390 x 844 layout so every control remains visible and the map owns most of the screen.

### Task 5: Integration Verification

**Files:**
- Modify only files required for defects found during verification.

- [ ] **Step 1:** Run `npm test`, `npm run check`, and `git diff --check`.
- [ ] **Step 2:** Exercise overview, start, two turn changes, pause/resume, restart, and arrival in a browser.
- [ ] **Step 3:** Verify at 390 x 844 and default desktop viewport with no console errors or horizontal overflow.
- [ ] **Step 4:** Confirm the performer and Shows tabs still open and function.
