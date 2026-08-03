# Outside Lands Shows Hub — Design

## Outcome

Replace the static Shows placeholder with a reliable 2026 Outside Lands schedule and personal festival planner. A fan can find a set, save it, see whether the plan is physically possible, and open the existing Map at the correct stage.

The judge-facing loop is:

1. Open Shows and find Charli xcx.
2. Save the set, then save an overlapping or travel-tight set.
3. See the conflict and choose the suggested resolution.
4. Read the leave-by time and tap **Route me there**.
5. Arrive in the existing Map view with the destination stage focused.

## Source strategy

Use a hybrid source model:

- The runtime source of truth is a normalized, checked-in snapshot of the official 2026 schedule from `https://sfoutsidelands.com/schedule/`.
- A development-time importer can refresh that snapshot from the official schedule. It is never required during the live demo.
- Every schedule surface identifies Outside Lands as the source and links to the official schedule.
- The existing JamBase/Convex `/nextshow` endpoint remains separate and powers an optional **Next tour date** section. JamBase data must not be presented as festival set-time data.
- If the official source cannot be refreshed, the last verified snapshot remains usable and displays its `updatedAt` date.

This avoids a runtime dependency on an undocumented festival feed while keeping the data refreshable and source-bounded.

## Schedule model

Each normalized festival set contains:

```js
{
  id: String,
  artist: String,
  day: "YYYY-MM-DD",
  startTime: "HH:mm",
  endTime: "HH:mm",
  stageId: String,
  stageName: String,
  sourceUrl: "https://sfoutsidelands.com/schedule/",
  featured: Boolean
}
```

Times use the `America/Los_Angeles` festival time zone. IDs are stable across refreshes. `stageId` must match `data/festival-places.js`; an unmapped stage can still be shown but cannot offer directions.

The snapshot also includes:

- `version`
- `eventName`
- `eventDates`
- `timeZone`
- `updatedAt`
- `sourceUrl`

## Shows experience

### Schedule

The Shows view is a full-height working surface, not a poster or card dashboard.

- A compact Friday / Saturday / Sunday switcher sits below the title.
- Search filters by artist; a stage control filters by venue.
- Charli xcx and The Strokes receive the acid-green featured treatment without changing chronological order.
- The main schedule is a vertical time rail. Each row shows time, artist, stage, saved state, and whether the set is happening now, next, or later.
- Opening a row reveals three actions: **Save**, **Route me there**, and **Official schedule**.
- A single festival-level **Tickets** link opens the official Outside Lands ticket page. Individual set rows do not imply separate tickets.

### My Plan

Saved set IDs are stored in `localStorage`. My Plan displays saved sets in chronological order and calculates:

- direct time overlap;
- the gap between consecutive sets;
- estimated walking time between their mapped stages;
- a leave-by time for the next saved set.

Walking time is deterministic: calculate straight-line distance between stage coordinates from `data/festival-places.js`, multiply it by `1.35` to approximate park paths, divide by a `1.2 m/s` walking speed, round up to whole minutes, and enforce a two-minute minimum.

A plan conflict exists when two sets overlap or when the available gap is shorter than the estimated walk plus a three-minute arrival buffer. The resolution keeps the higher-priority featured set; otherwise it keeps the set the fan saved first. The fan can override the suggestion.

### Surprise me nearby

When two consecutive saved sets leave a gap of 30–90 minutes, **Surprise me nearby** recommends one unsaved set that:

- begins after the current saved set;
- leaves enough walking time for the following saved set;
- is at the current stage or the geographically closest mapped stage;
- is not already in conflict with the plan.

The recommendation is deterministic so it behaves consistently in a demo.

### Map handoff

**Route me there** switches to the existing Map view and focuses the matching `stageId`. It does not claim live GPS or production routing. The current one-route navigator may show its curated route only when that route matches the selected destination; otherwise the map shows the destination and a clear **Stage selected** state.

## Module boundaries

- `data/outside-lands-2026.js`: normalized, verified schedule snapshot only.
- `tools/pull-outside-lands.mjs`: development-time official-source importer and validation; writes the normalized snapshot only when explicitly run.
- `src/show-planner.js`: pure filtering, ordering, conflict, walk-estimate, leave-by, and gap-recommendation logic.
- `src/shows.js`: Shows DOM rendering, local persistence, controls, and events.
- `src/app.js`: minimal view orchestration and Map handoff only.
- `index.html`: semantic Shows containers and controls.
- `src/styles.css`: schedule rail, plan state, and responsive presentation.

The schedule planner has no dependency on Convex, MapLibre, or the DOM. `src/shows.js` emits a `showroute` event containing `stageId`; `src/app.js` owns switching views and calling the map API.

## Loading and failure behavior

- The checked-in snapshot renders immediately, so schedule loading has no network spinner.
- An empty or invalid snapshot shows **Schedule unavailable** with the official schedule link.
- A failed JamBase request hides the optional Next tour date section and does not affect festival planning. A JamBase result for the same Outside Lands appearance is also hidden so it does not duplicate a festival set.
- An unknown stage disables **Route me there** and leaves **Official schedule** available.
- Corrupt saved IDs are ignored and removed on the next persistence write.
- Dates and set times never silently fall back to invented values.

## Visual and interaction direction

- Preserve the existing near-black, white, and acid-green Casablancas system.
- Use one continuous chronological rail with thin dividers; cards appear only for the interactive My Plan summary.
- Day changes crossfade the rail; saving a set produces a short green confirmation sweep; conflicts expand inline instead of opening a modal.
- The 390 × 844 phone viewport remains the primary layout. The close control and bottom navigation remain reachable without horizontal overflow.

## Accessibility

- Day and stage filters expose selected state through `aria-pressed` or native controls.
- Schedule rows are real buttons or links with full artist, time, and stage labels.
- Save and conflict changes are announced through one polite live region.
- Conflict meaning is expressed in text, not color alone.
- Reduced Motion removes crossfades and confirmation sweeps.
- External links identify that they open the official Outside Lands or ticket site.

## Verification

- Unit tests cover day/stage/search filtering, time-zone-safe ordering, overlap detection, walk-buffer conflicts, leave-by calculations, deterministic recommendations, and malformed saved data.
- Importer tests use stored fixtures and verify required fields, stable IDs, mapped stage normalization, deduplication, and refusal to overwrite the snapshot with an empty result.
- Browser verification covers day switching, search, save persistence, conflict resolution, Surprise me nearby, external links, and Map handoff.
- Capture one 390 × 844 Shows screenshot and one desktop screenshot.
- Run the existing frontend, navigation, Convex, and JamBase tests to catch regressions.

## Scope boundaries

This iteration does not include accounts, cloud-synced plans, friend invites, push notifications, calendar export, live crowd density, live GPS, live schedule scraping in the browser, artist recommendations from an LLM, or production multi-route navigation.

## Acceptance criteria

- All three official festival days render from a verified local snapshot with source and update date.
- Search, stage filtering, and day switching work at the phone viewport.
- Charli xcx and The Strokes are easy to find and visually featured.
- Saved sets survive a reload.
- My Plan identifies at least one deterministic overlap or travel-time conflict and offers a reversible resolution.
- Surprise me nearby returns a feasible deterministic set when a qualifying gap exists.
- Route actions focus every mapped festival stage without breaking the existing Map experience.
- The official schedule and ticket links are clearly labeled and valid.
- The app remains demoable when all schedule and JamBase network requests fail.
- Existing checks and tests remain green.
