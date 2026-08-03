# Outside Lands Shows Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Shows screen with the complete verified 2026 Outside Lands schedule, a persistent personal plan, deterministic conflict/gap intelligence, and a safe handoff to the existing festival map.

**Architecture:** A checked-in normalized schedule is the runtime source of truth; a development-only importer refreshes it from the official Outside Lands schedule widget. Pure planning logic stays in `src/show-planner.js`, DOM and persistence stay in `src/shows.js`, and `src/app.js` only initializes the view and handles `showroute` events.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node.js built-in test runner, browser `localStorage`, existing MapLibre map integration, no new runtime dependencies.

## Global Constraints

- Preserve the existing near-black, white, and acid-green Casablancas visual system.
- Primary verification viewport is exactly `390 × 844`.
- Runtime schedule rendering must work without network access.
- Official schedule source is `https://sfoutsidelands.com/schedule/`.
- Festival ticket source is `https://sfoutsidelands.com/tickets/`.
- Festival time zone is `America/Los_Angeles`.
- Do not claim live GPS, production routing, live crowd data, or real-time schedule scraping.
- Do not add accounts, cloud sync, friend invites, notifications, calendar export, or an LLM recommender.
- Do not alter performer behavior, audio behavior, or the existing deterministic navigation route.
- Preserve all unrelated user changes and keep task ownership to the files listed below.

## File Structure

- Create `data/outside-lands-2026.js`: generated, normalized schedule snapshot and source metadata.
- Create `tools/pull-outside-lands.mjs`: official widget importer, normalizer, validator, and atomic snapshot writer.
- Create `tools/pull-outside-lands.test.mjs`: importer normalization and safety tests.
- Create `src/show-planner.js`: pure filtering, ordering, walking, conflict, leave-by, save sanitization, and gap recommendation logic.
- Create `tests/show-planner.test.mjs`: planner unit tests.
- Create `src/shows.js`: Shows view controller, rendering, persistence, actions, and `showroute` event.
- Modify `index.html`: semantic Shows controls and render outlets.
- Modify `src/styles.css`: schedule rail, planner, action, responsive, reduced-motion, and empty-state styles.
- Modify `src/app.js`: initialize/destroy Shows and bridge route events to the Map.
- Modify `package.json`: add schedule refresh and new checks/tests.
- Create `docs/qa/casablancas-shows-mobile.png`: final `390 × 844` evidence.
- Create `docs/qa/casablancas-shows-desktop.png`: final desktop evidence.

---

### Task 1: Pure Schedule Planner

**Files:**
- Create: `src/show-planner.js`
- Create: `tests/show-planner.test.mjs`

**Interfaces:**
- Consumes: schedule set objects with `id`, `artist`, `day`, `startTime`, `endTime`, `stageId`, `stageName`, and `featured`; place objects from `data/festival-places.js`.
- Produces:
  - `filterSchedule(sets, { day, query, stageId }) -> FestivalSet[]`
  - `estimateWalkMinutes(fromStageId, toStageId, places) -> number | null`
  - `sanitizeSavedIds(value, sets) -> string[]`
  - `analyzePlan(savedIds, sets, places) -> { sets, transitions, conflicts }`
  - `recommendGap(savedIds, sets, places) -> Set | null`
  - `formatClock(time) -> string`

- [ ] **Step 1: Write failing filtering, walk, conflict, persistence, and recommendation tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePlan,
  estimateWalkMinutes,
  filterSchedule,
  recommendGap,
  sanitizeSavedIds,
} from "../src/show-planner.js";

const places = [
  { id: "lands-end", coordinates: [-122.494, 37.7717] },
  { id: "sutro", coordinates: [-122.4917, 37.7712] },
];

const sets = [
  { id: "a", artist: "Charli xcx", day: "2026-08-07", startTime: "20:40", endTime: "22:00", stageId: "lands-end", stageName: "Lands End", featured: true },
  { id: "b", artist: "The xx", day: "2026-08-07", startTime: "20:30", endTime: "21:40", stageId: "sutro", stageName: "Sutro", featured: false },
  { id: "c", artist: "Nearby Find", day: "2026-08-07", startTime: "18:20", endTime: "19:00", stageId: "lands-end", stageName: "Lands End", featured: false },
  { id: "d", artist: "Earlier Set", day: "2026-08-07", startTime: "17:00", endTime: "18:00", stageId: "lands-end", stageName: "Lands End", featured: false },
  { id: "e", artist: "Later Set", day: "2026-08-07", startTime: "19:40", endTime: "20:20", stageId: "sutro", stageName: "Sutro", featured: false },
];

test("filterSchedule combines day, artist query, and stage", () => {
  assert.deepEqual(filterSchedule(sets, { day: "2026-08-07", query: "charli", stageId: "lands-end" }).map((set) => set.id), ["a"]);
});

test("estimateWalkMinutes is deterministic and has a two-minute minimum", () => {
  assert.equal(estimateWalkMinutes("lands-end", "lands-end", places), 2);
  assert.equal(Number.isInteger(estimateWalkMinutes("lands-end", "sutro", places)), true);
  assert.equal(estimateWalkMinutes("unknown", "sutro", places), null);
});

test("analyzePlan flags overlap and recommends keeping the featured set", () => {
  const plan = analyzePlan(["b", "a"], sets, places);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].reason, "overlap");
  assert.equal(plan.conflicts[0].keepId, "a");
  assert.equal(plan.conflicts[0].removeId, "b");
});

test("sanitizeSavedIds removes duplicates and unknown ids without reordering", () => {
  assert.deepEqual(sanitizeSavedIds(["b", "missing", "b", 42, "a"], sets), ["b", "a"]);
});

test("recommendGap returns the feasible same-stage candidate", () => {
  assert.equal(recommendGap(["d", "e"], sets, places)?.id, "c");
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test tests/show-planner.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/show-planner.js`.

- [ ] **Step 3: Implement the pure planner**

```js
const MINUTES_PER_DAY = 24 * 60;

function minutes(time) {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
}

function haversineMeters([fromLng, fromLat], [toLng, toLat]) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLng - fromLng);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat))
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateWalkMinutes(fromStageId, toStageId, places) {
  const from = places.find((place) => place.id === fromStageId);
  const to = places.find((place) => place.id === toStageId);
  if (!from || !to) return null;
  const meters = haversineMeters(from.coordinates, to.coordinates);
  return Math.max(2, Math.ceil((meters * 1.35) / 1.2 / 60));
}
```

Implement the remaining exported functions with these exact rules:

- Sort by `day`, then `startTime`, then `artist` using `localeCompare`.
- Artist search is trimmed and case-insensitive.
- `stageId === "all"` disables the stage filter.
- A transition conflicts with reason `overlap` when `next.startTime < current.endTime`.
- A transition conflicts with reason `travel` when its nonnegative gap is less than `walkMinutes + 3`.
- Conflict priority keeps a featured set over a non-featured set; ties keep the saved ID with the lower index in `savedIds`.
- `leaveBy` is the next set's start minus `walkMinutes + 3`, formatted as `HH:mm`.
- Gap recommendations examine consecutive saved sets on the same day with a 30–90 minute raw gap, reject conflicting candidates, prefer the current stage, then smallest walk, earliest start, and artist alphabetically.
- Return `null` for a recommendation when no candidate is feasible.
- Keep the module free of DOM, storage, Convex, and MapLibre references.

- [ ] **Step 4: Run the planner tests**

Run: `node --test tests/show-planner.test.mjs`

Expected: PASS for every planner test.

- [ ] **Step 5: Commit planner behavior**

```bash
git add src/show-planner.js tests/show-planner.test.mjs
git commit -m "Build Outside Lands show planner"
```

---

### Task 2: Official Schedule Importer and Verified Snapshot

**Files:**
- Create: `tools/pull-outside-lands.mjs`
- Create: `tools/pull-outside-lands.test.mjs`
- Create: `data/outside-lands-2026.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: DoStuff grouping JSON at `https://dsfestlands26.dostff.co/api/v1/schedule_groupings/{1567,1568,1569}?preview_token=null`, exposed by the official Outside Lands schedule page.
- Produces:
  - `normalizeGrouping(grouping) -> FestivalSet[]`
  - `buildSchedule(groupings, { updatedAt }) -> Schedule`
  - `validateSchedule(schedule) -> Schedule`
  - `renderScheduleModule(schedule) -> string`
  - `fetchOfficialSchedule({ fetchImpl, updatedAt }) -> Schedule`
  - `OUTSIDE_LANDS_2026` with `version`, `eventName`, `eventDates`, `timeZone`, `updatedAt`, `sourceUrl`, and `sets`.

- [ ] **Step 1: Write failing importer tests with a minimal official-shape fixture**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { buildSchedule, normalizeGrouping, validateSchedule } from "./pull-outside-lands.mjs";

const grouping = {
  id: 1567,
  name: "Friday",
  slug: "friday",
  schedules: [{
    grid: { stages: [{
      name: "Lands End",
      shows: [{ id: 16494, name: "Charli xcx", start: "2026-08-07T20:40:00.000-07:00", end: "2026-08-07T22:00:00.000-07:00", stage: "Lands End" }],
    }] },
  }],
};

test("normalizeGrouping emits a stable mapped featured set", () => {
  assert.deepEqual(normalizeGrouping(grouping), [{
    id: "osl-16494",
    artist: "Charli xcx",
    day: "2026-08-07",
    startTime: "20:40",
    endTime: "22:00",
    stageId: "lands-end",
    stageName: "Lands End",
    sourceUrl: "https://sfoutsidelands.com/schedule/",
    featured: true,
  }]);
});

test("validateSchedule refuses an empty result", () => {
  assert.throws(() => validateSchedule({ eventDates: ["2026-08-07", "2026-08-08", "2026-08-09"], sets: [] }), /empty/i);
});

test("buildSchedule deduplicates upstream show ids", () => {
  const schedule = buildSchedule([grouping, grouping], { updatedAt: "2026-08-02T23:00:00.000Z" });
  assert.equal(schedule.sets.length, 1);
  assert.equal(schedule.updatedAt, "2026-08-02T23:00:00.000Z");
});
```

- [ ] **Step 2: Run the importer test and verify failure**

Run: `node --test tools/pull-outside-lands.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `tools/pull-outside-lands.mjs`.

- [ ] **Step 3: Implement normalization, validation, fetching, and safe generation**

```js
const GROUPING_IDS = [1567, 1568, 1569];
const WIDGET_ORIGIN = "https://dsfestlands26.dostff.co";
const OFFICIAL_SCHEDULE_URL = "https://sfoutsidelands.com/schedule/";
const STAGE_IDS = new Map([
  ["lands end", "lands-end"],
  ["sutro", "sutro"],
  ["twin peaks", "twin-peaks"],
  ["panhandle", "panhandle"],
  ["soma", "soma"],
  ["dolores'", "dolores"],
  ["dolores’", "dolores"],
  ["cocktail magic", "cocktail-magic"],
]);

export function normalizeGrouping(grouping) {
  return (grouping.schedules ?? []).flatMap((schedule) =>
    (schedule.grid?.stages ?? []).flatMap((stage) =>
      (stage.shows ?? []).map((show) => ({
        id: `osl-${show.id}`,
        artist: String(show.name).trim(),
        day: show.start.slice(0, 10),
        startTime: show.start.slice(11, 16),
        endTime: show.end.slice(11, 16),
        stageId: STAGE_IDS.get(String(show.stage ?? stage.name).trim().toLowerCase()) ?? null,
        stageName: String(show.stage ?? stage.name).trim(),
        sourceUrl: OFFICIAL_SCHEDULE_URL,
        featured: /^(charli xcx|the strokes)$/i.test(String(show.name).trim()),
      })),
    ),
  );
}
```

The CLI must:

- send `Origin: https://sfoutsidelands.com`, `Referer: https://sfoutsidelands.com/schedule/`, and `User-Agent: Casablanca-Schedule-Importer/0.1`;
- fetch all three grouping IDs;
- reject non-2xx responses, malformed shows, duplicate conflicting IDs, missing festival days, or an empty set list;
- sort by day, start time, stage, and artist;
- render a JavaScript module using `JSON.stringify(schedule, null, 2)` and `deepFreeze` at module load;
- write to a sibling temporary file and rename it to `data/outside-lands-2026.js` only after validation succeeds;
- execute only when `import.meta.url === pathToFileURL(process.argv[1]).href`;
- print the set count and `updatedAt`, never the full upstream payload.

- [ ] **Step 4: Run importer tests**

Run: `node --test tools/pull-outside-lands.test.mjs`

Expected: PASS.

- [ ] **Step 5: Generate the complete current snapshot and verify headline sets**

Run: `node tools/pull-outside-lands.mjs`

Expected: prints a nonzero set count for three days and writes `data/outside-lands-2026.js`.

Run: `node -e "import('./data/outside-lands-2026.js').then(({OUTSIDE_LANDS_2026:s}) => console.log(s.eventDates, s.sets.length, s.sets.filter(x => x.featured).map(x => [x.artist,x.day,x.startTime,x.stageName])))"`

Expected: three event dates, a nonzero set count, and verified rows for both `Charli xcx` and `The Strokes`.

- [ ] **Step 6: Add scripts and syntax coverage**

```json
{
  "scripts": {
    "refresh:schedule": "node tools/pull-outside-lands.mjs",
    "test": "node --test tests/*.test.mjs convex/*.test.mjs tools/*.test.mjs"
  }
}
```

Append `node --check src/show-planner.js`, `node --check src/shows.js`, `node --check data/outside-lands-2026.js`, and `node --check tools/pull-outside-lands.mjs` to the existing `check` script without removing existing checks.

- [ ] **Step 7: Commit the official data pipeline**

```bash
git add tools/pull-outside-lands.mjs tools/pull-outside-lands.test.mjs data/outside-lands-2026.js package.json
git commit -m "Connect official Outside Lands schedule"
```

---

### Task 3: Shows Working Surface

**Files:**
- Create: `src/shows.js`
- Modify: `index.html`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `OUTSIDE_LANDS_2026`, `FESTIVAL_PLACES`, and all exports from `src/show-planner.js`.
- Produces: `initShowsView(root, options) -> { refresh(), destroy() }` and bubbling `showroute` events with `{ stageId, setId }`.

- [ ] **Step 1: Replace the static Shows markup with semantic outlets**

```html
<section id="shows-view" class="secondary-view shows-view" hidden aria-label="Outside Lands 2026 schedule">
  <header class="shows-header">
    <div><span>Outside Lands 2026</span><h2>Shows</h2></div>
    <a class="shows-ticket-link" href="https://sfoutsidelands.com/tickets/" target="_blank" rel="noreferrer">Tickets</a>
    <button class="view-close" type="button" data-view-target="home" aria-label="Close shows">×</button>
  </header>
  <div class="shows-toolbar">
    <div id="shows-days" class="shows-days" aria-label="Festival day"></div>
    <label class="shows-search"><span class="sr-only">Search artists</span><input id="shows-search" type="search" placeholder="Search artists" autocomplete="off" /></label>
    <label class="shows-stage-label"><span class="sr-only">Filter by stage</span><select id="shows-stage"></select></label>
  </div>
  <section id="shows-plan" class="shows-plan" aria-labelledby="shows-plan-title">
    <div><span>My plan</span><strong id="shows-plan-title">Build your day</strong></div>
    <div id="shows-plan-content"></div>
  </section>
  <div id="shows-list" class="shows-list" aria-label="Festival sets"></div>
  <footer class="shows-source"><span id="shows-updated"></span><a href="https://sfoutsidelands.com/schedule/" target="_blank" rel="noreferrer">Official schedule</a></footer>
  <div id="shows-live" class="sr-only" aria-live="polite"></div>
</section>
```

- [ ] **Step 2: Implement the view controller with deterministic state and persistence**

```js
import { OUTSIDE_LANDS_2026 } from "../data/outside-lands-2026.js";
import { FESTIVAL_PLACES } from "../data/festival-places.js";
import { analyzePlan, filterSchedule, formatClock, recommendGap, sanitizeSavedIds } from "./show-planner.js";

export const SHOWS_STORAGE_KEY = "casablancas:outside-lands-2026:saved";

export function initShowsView(root, {
  schedule = OUTSIDE_LANDS_2026,
  places = FESTIVAL_PLACES,
  storage = globalThis.localStorage,
} = {}) {
  if (!root) throw new TypeError("initShowsView requires a root element.");
  // Bind once, render from local state, return refresh/destroy.
}
```

Controller behavior:

- Default to Friday (`eventDates[0]`), `stageId: "all"`, and empty search.
- Parse storage with `JSON.parse`; on error use `[]`; sanitize against schedule IDs and write the clean list on the next save.
- Render real day buttons with `aria-pressed`, a stage select derived from the current snapshot, and a time rail sorted by the planner.
- Render featured sets with `data-featured="true"` and a visible `Featured` label.
- Compare the injected/current Los Angeles calendar day and clock with each set: label an active interval `Now`, the earliest future set on the selected day `Next`, completed intervals `Ended`, and all remaining future rows `Later`.
- Use one expanded row at a time; buttons are `Save`, `Route me there`, and `Official schedule`.
- Disable routing when `stageId` is `null` or absent from `FESTIVAL_PLACES`, with `title="Stage location is not mapped yet"`.
- Saving toggles the ID, persists the ordered ID array, refreshes the list and My Plan, and announces the result.
- My Plan renders saved sets for the selected day, leave-by transitions, inline conflict reason, a `Keep {artist}` action that removes `conflict.removeId`, and a non-destructive `Keep both` action that collapses the suggestion.
- `Surprise me nearby` saves the deterministic recommendation returned by `recommendGap`.
- Routing dispatches `new CustomEvent("showroute", { bubbles: true, detail: { stageId, setId } })`.
- `destroy()` removes every listener registered by the controller.
- If snapshot validation fails at runtime, render `Schedule unavailable` and retain the official schedule link.

- [ ] **Step 3: Replace poster styles with the schedule rail and planner styles**

```css
.shows-view {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 0;
  overflow: hidden;
  background: #080b0d;
}

.shows-list {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.show-row {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  border-top: 1px solid rgba(255, 255, 255, 0.11);
}

.show-row[data-featured="true"] {
  box-shadow: inset 3px 0 0 var(--acid-bright);
}
```

Complete the CSS using existing variables and typography. Requirements:

- 44px minimum tap targets;
- thin dividers instead of a card grid;
- horizontally scrollable day controls without page overflow;
- a compact acid-green My Plan summary;
- inline expanded actions and conflicts;
- a 180ms day-list opacity/translate transition;
- a short save confirmation sweep;
- `@media (prefers-reduced-motion: reduce)` that removes both motions;
- a desktop layout that stays inside the existing phone shell;
- remove obsolete `.show-poster` and `.show-copy` rules only after their markup is gone.

- [ ] **Step 4: Run syntax and existing tests before integration**

Run: `node --check src/shows.js && npm test`

Expected: syntax passes and all tests are green.

- [ ] **Step 5: Commit the Shows surface**

```bash
git add src/shows.js index.html src/styles.css
git commit -m "Build Outside Lands Shows hub"
```

---

### Task 4: Application and Map Handoff Integration

**Files:**
- Modify: `src/app.js`
- Test: `tests/show-planner.test.mjs`

**Interfaces:**
- Consumes: `initShowsView(showsView)` and bubbling `showroute` detail `{ stageId, setId }`.
- Produces: Shows initializes once; route actions open Map, wait for MapLibre initialization, and call `focusPlace(stageId)`.

- [ ] **Step 1: Import and initialize the Shows controller**

```js
import { initShowsView } from "./shows.js";

const showsController = initShowsView(showsView);
```

Place initialization after all required DOM constants exist and before the first call to `showView`.

- [ ] **Step 2: Add the route bridge without duplicating map initialization**

```js
showsView.addEventListener("showroute", async (event) => {
  const stageId = event.detail?.stageId;
  if (!stageId) return;
  await showView("map");
  const place = focusPlace(stageId);
  if (!place) {
    showToast("That stage is not mapped yet.");
    return;
  }
  showToast(`${place.name} selected on the map.`);
});
```

Do not call `navigateToPlace` here because the existing route is a curated demo and must not be represented as production directions to every stage.

- [ ] **Step 3: Destroy Shows alongside existing controllers**

```js
window.addEventListener("beforeunload", () => {
  stopPerformance();
  showsController.destroy();
  destroyMap();
  rig.destroy();
});
```

- [ ] **Step 4: Run focused and full automated verification**

Run: `npm run check`

Expected: every JavaScript syntax check passes.

Run: `npm test`

Expected: frontend, Convex, JamBase, importer, navigation, and planner tests pass.

- [ ] **Step 5: Commit integration**

```bash
git add src/app.js
git commit -m "Connect Shows planning to festival map"
```

---

### Task 5: Browser Verification and Final Polish

**Files:**
- Modify only if verification finds a scoped defect: `index.html`, `src/styles.css`, `src/shows.js`, `src/app.js`
- Create: `docs/qa/casablancas-shows-mobile.png`
- Create: `docs/qa/casablancas-shows-desktop.png`

**Interfaces:**
- Consumes: completed browser experience.
- Produces: verified mobile and desktop evidence with no known regression in Home or Map.

- [ ] **Step 1: Start the static app**

Run: `npm run dev`

Expected: server listens on `http://127.0.0.1:4173`.

- [ ] **Step 2: Verify the complete phone loop at `390 × 844`**

Perform these exact actions:

1. Open Shows.
2. Confirm Friday, Saturday, and Sunday each render nonempty schedules.
3. Search `Charli` and confirm Charli xcx, verified time, and Lands End appear.
4. Clear search, save Charli xcx, save a conflicting Friday set, and confirm the inline conflict names both sets.
5. Use the suggested keep action, reload, and confirm the saved plan persists.
6. Save two sets with a 30–90 minute gap and use Surprise me nearby.
7. Tap Route me there and confirm Map opens with the matching stage place card.
8. Return to Shows and open the official schedule and ticket links in new tabs.
9. Confirm keyboard focus, 44px actions, no horizontal overflow, and readable conflict text.

- [ ] **Step 3: Verify Home and Map regressions**

1. Play and pause one performer track.
2. Open Map, start walking, pause, and restart.
3. Return Home and confirm navigation selection state is correct.

- [ ] **Step 4: Capture evidence**

Capture Shows at `390 × 844` to `docs/qa/casablancas-shows-mobile.png` with My Plan and one visible conflict. Capture the centered desktop phone surface to `docs/qa/casablancas-shows-desktop.png`.

- [ ] **Step 5: Run final verification from a clean prompt**

Run: `npm run check && npm test && git diff --check`

Expected: all commands exit `0`.

- [ ] **Step 6: Commit only scoped polish and evidence**

```bash
git add index.html src/styles.css src/shows.js src/app.js docs/qa/casablancas-shows-mobile.png docs/qa/casablancas-shows-desktop.png
git commit -m "Verify Outside Lands Shows experience"
```

Do not create an empty commit when verification requires no source changes and screenshot evidence is already tracked.
