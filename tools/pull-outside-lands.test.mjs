import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildSchedule,
  fetchOfficialSchedule,
  normalizeGrouping,
  renderScheduleModule,
  validateSchedule,
  writeScheduleSnapshot,
} from "./pull-outside-lands.mjs";

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

function makeGrouping({ id, day, showId, artist, startTime = "12:00", stage = "Sutro" }) {
  return {
    id,
    name: day,
    slug: day.toLowerCase(),
    schedules: [{
      grid: { stages: [{
        name: stage,
        shows: [{
          id: showId,
          name: artist,
          start: `${day}T${startTime}:00.000-07:00`,
          end: `${day}T${String(Number(startTime.slice(0, 2)) + 1).padStart(2, "0")}:${startTime.slice(3)}:00.000-07:00`,
          stage,
        }],
      }] },
    }],
  };
}

const completeGroupings = [
  makeGrouping({ id: 1567, day: "2026-08-07", showId: 1, artist: "Friday Artist" }),
  makeGrouping({ id: 1568, day: "2026-08-08", showId: 2, artist: "The Strokes", startTime: "20:35", stage: "Lands End" }),
  makeGrouping({ id: 1569, day: "2026-08-09", showId: 3, artist: "Sunday Artist" }),
];

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

test("normalizeGrouping maps Dolores-prefixed branded stage variants", () => {
  for (const stageName of ["Dolores’ x OASIS", "Dolores' x Hot Goth GF", "Dolores x Polyglamorous"]) {
    const branded = structuredClone(grouping);
    branded.schedules[0].grid.stages[0].name = stageName;
    branded.schedules[0].grid.stages[0].shows[0].stage = stageName;

    assert.equal(normalizeGrouping(branded)[0].stageId, "dolores", stageName);
  }
});

test("validateSchedule refuses an empty result", () => {
  assert.throws(() => validateSchedule({ eventDates: ["2026-08-07", "2026-08-08", "2026-08-09"], sets: [] }), /empty/i);
});

test("buildSchedule deduplicates upstream show ids", () => {
  const schedule = buildSchedule([grouping, grouping], { updatedAt: "2026-08-02T23:00:00.000Z" });
  assert.equal(schedule.sets.length, 1);
  assert.equal(schedule.updatedAt, "2026-08-02T23:00:00.000Z");
});

test("normalizeGrouping rejects a malformed upstream show", () => {
  const malformed = structuredClone(grouping);
  delete malformed.schedules[0].grid.stages[0].shows[0].end;

  assert.throws(() => normalizeGrouping(malformed), /malformed show/i);
});

test("normalizeGrouping rejects impossible timestamp components", () => {
  const malformed = structuredClone(grouping);
  malformed.schedules[0].grid.stages[0].shows[0].start = "2026-08-07T25:00:00.000-07:00";
  malformed.schedules[0].grid.stages[0].shows[0].end = "2026-08-07T26:00:00.000-07:00";

  assert.throws(() => normalizeGrouping(malformed), /malformed show.*start/i);
});

test("normalizeGrouping rejects an end instant that does not follow start", () => {
  const malformed = structuredClone(grouping);
  malformed.schedules[0].grid.stages[0].shows[0].start = "2026-08-07T20:00:00.000-07:00";
  malformed.schedules[0].grid.stages[0].shows[0].end = "2026-08-07T21:00:00.000+00:00";

  assert.throws(() => normalizeGrouping(malformed), /malformed show.*end must follow start/i);
});

test("buildSchedule rejects duplicate ids with conflicting data", () => {
  const conflicting = structuredClone(grouping);
  conflicting.schedules[0].grid.stages[0].shows[0].name = "Different Artist";

  assert.throws(
    () => buildSchedule([grouping, conflicting], { updatedAt: "2026-08-02T23:00:00.000Z" }),
    /duplicate conflicting show id osl-16494/i,
  );
});

test("validateSchedule rejects a snapshot missing a festival day", () => {
  const schedule = buildSchedule(completeGroupings.slice(0, 2), {
    updatedAt: "2026-08-02T23:00:00.000Z",
  });

  assert.throws(() => validateSchedule(schedule), /missing festival day 2026-08-09/i);
});

test("validateSchedule rejects impossible normalized times", () => {
  const schedule = buildSchedule(completeGroupings, {
    updatedAt: "2026-08-02T23:00:00.000Z",
  });
  schedule.sets[0].startTime = "25:00";
  schedule.sets[0].endTime = "26:00";

  assert.throws(() => validateSchedule(schedule), /malformed show.*invalid time/i);
});

test("fetchOfficialSchedule sends the widget request contract for all three groupings", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const id = Number(new URL(url).pathname.split("/").at(-1));
    return {
      ok: true,
      status: 200,
      async json() {
        return structuredClone(completeGroupings.find((item) => item.id === id));
      },
    };
  };

  const schedule = await fetchOfficialSchedule({
    fetchImpl,
    updatedAt: "2026-08-02T23:00:00.000Z",
  });

  assert.deepEqual(calls.map((call) => call.url), [
    "https://dsfestlands26.dostff.co/api/v1/schedule_groupings/1567?preview_token=null",
    "https://dsfestlands26.dostff.co/api/v1/schedule_groupings/1568?preview_token=null",
    "https://dsfestlands26.dostff.co/api/v1/schedule_groupings/1569?preview_token=null",
  ]);
  for (const call of calls) {
    assert.deepEqual(call.options.headers, {
      Origin: "https://sfoutsidelands.com",
      Referer: "https://sfoutsidelands.com/schedule/",
      "User-Agent": "Casablanca-Schedule-Importer/0.1",
    });
  }
  assert.deepEqual(schedule.sets.map((set) => set.artist), [
    "Friday Artist",
    "The Strokes",
    "Sunday Artist",
  ]);
});

test("fetchOfficialSchedule rejects a non-success response", async () => {
  const fetchImpl = async (url) => ({
    ok: !url.includes("/1568?"),
    status: url.includes("/1568?") ? 503 : 200,
    async json() {
      const id = Number(new URL(url).pathname.split("/").at(-1));
      return structuredClone(completeGroupings.find((item) => item.id === id));
    },
  });

  await assert.rejects(
    fetchOfficialSchedule({ fetchImpl, updatedAt: "2026-08-02T23:00:00.000Z" }),
    /request 1568 failed with status 503/i,
  );
});

test("renderScheduleModule exports a deeply frozen snapshot", async () => {
  const schedule = validateSchedule(buildSchedule(completeGroupings, {
    updatedAt: "2026-08-02T23:00:00.000Z",
  }));
  const source = renderScheduleModule(schedule);
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const { OUTSIDE_LANDS_2026 } = await import(moduleUrl);

  assert.deepEqual(OUTSIDE_LANDS_2026, schedule);
  assert.equal(Object.isFrozen(OUTSIDE_LANDS_2026), true);
  assert.equal(Object.isFrozen(OUTSIDE_LANDS_2026.sets), true);
  assert.equal(Object.isFrozen(OUTSIDE_LANDS_2026.sets[0]), true);
});

test("writeScheduleSnapshot leaves the previous file untouched when validation fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "outside-lands-importer-"));
  const outputPath = join(directory, "outside-lands-2026.js");
  await writeFile(outputPath, "last verified snapshot\n", "utf8");

  try {
    await assert.rejects(
      writeScheduleSnapshot({ eventDates: ["2026-08-07", "2026-08-08", "2026-08-09"], sets: [] }, { outputPath }),
      /empty/i,
    );
    assert.equal(await readFile(outputPath, "utf8"), "last verified snapshot\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
