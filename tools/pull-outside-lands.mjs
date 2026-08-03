import { rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GROUPING_IDS = [1567, 1568, 1569];
const WIDGET_ORIGIN = "https://dsfestlands26.dostff.co";
const OFFICIAL_SCHEDULE_URL = "https://sfoutsidelands.com/schedule/";
const EVENT_DATES = ["2026-08-07", "2026-08-08", "2026-08-09"];
const STAGE_IDS = new Map([
  ["lands end", "lands-end"],
  ["sutro", "sutro"],
  ["twin peaks", "twin-peaks"],
  ["panhandle", "panhandle"],
  ["soma", "soma"],
  ["dolores", "dolores"],
  ["cocktail magic", "cocktail-magic"],
]);

function canonicalStageId(stageName) {
  const normalized = stageName.toLowerCase();
  if (/^dolores(?:['’])?(?:\s|$)/.test(normalized)) return "dolores";
  return STAGE_IDS.get(normalized) ?? null;
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Malformed show: ${label} is required`);
  }
  return value.trim();
}

function requireTimestamp(value, label) {
  const timestamp = requireText(value, label);
  const match = timestamp.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?[+-](\d{2}):(\d{2})$/,
  );
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match?.slice(1).map(Number) ?? [];
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const validComponents = match
    && month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth[month - 1]
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59;

  if (!validComponents || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`Malformed show: ${label} must be an ISO timestamp with an offset`);
  }
  return timestamp;
}

function normalizeShow(show, stage) {
  if (!show || (typeof show.id !== "number" && typeof show.id !== "string")) {
    throw new Error("Malformed show: id is required");
  }
  const sourceId = String(show.id).trim();
  if (!sourceId) throw new Error("Malformed show: id is required");

  const artist = requireText(show.name, "name");
  const start = requireTimestamp(show.start, "start");
  const end = requireTimestamp(show.end, "end");
  if (Date.parse(end) <= Date.parse(start)) {
    throw new Error("Malformed show: end must follow start");
  }
  const stageName = requireText(show.stage ?? stage?.name, "stage");

  return {
    id: `osl-${sourceId}`,
    artist,
    day: start.slice(0, 10),
    startTime: start.slice(11, 16),
    endTime: end.slice(11, 16),
    stageId: canonicalStageId(stageName),
    stageName,
    sourceUrl: OFFICIAL_SCHEDULE_URL,
    featured: /^(charli xcx|the strokes)$/i.test(artist),
  };
}

export function normalizeGrouping(grouping) {
  return (grouping?.schedules ?? []).flatMap((schedule) =>
    (schedule?.grid?.stages ?? []).flatMap((stage) =>
      (stage?.shows ?? []).map((show) => normalizeShow(show, stage)),
    ),
  );
}

function compareSets(left, right) {
  return left.day.localeCompare(right.day)
    || left.startTime.localeCompare(right.startTime)
    || left.stageName.localeCompare(right.stageName)
    || left.artist.localeCompare(right.artist);
}

function isClockTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function buildSchedule(groupings, { updatedAt }) {
  const byId = new Map();

  for (const set of (groupings ?? []).flatMap(normalizeGrouping)) {
    const existing = byId.get(set.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(set)) {
      throw new Error(`Duplicate conflicting show id ${set.id}`);
    }
    byId.set(set.id, set);
  }

  return {
    version: 1,
    eventName: "Outside Lands 2026",
    eventDates: [...EVENT_DATES],
    timeZone: "America/Los_Angeles",
    updatedAt,
    sourceUrl: OFFICIAL_SCHEDULE_URL,
    sets: [...byId.values()].sort(compareSets),
  };
}

export function validateSchedule(schedule) {
  if (!schedule || !Array.isArray(schedule.sets)) {
    throw new Error("Schedule sets must be an array");
  }
  if (schedule.sets.length === 0) {
    throw new Error("Schedule is empty");
  }
  if (!Array.isArray(schedule.eventDates)
      || EVENT_DATES.some((day) => !schedule.eventDates.includes(day))) {
    throw new Error("Schedule is missing festival days");
  }

  const seen = new Map();
  for (const set of schedule.sets) {
    if (!set || typeof set !== "object") throw new Error("Malformed show: expected an object");
    if (typeof set.id !== "string" || !/^osl-.+/.test(set.id)) throw new Error("Malformed show: invalid id");
    if (typeof set.artist !== "string" || !set.artist) throw new Error(`Malformed show ${set.id}: invalid artist`);
    if (!EVENT_DATES.includes(set.day)) throw new Error(`Malformed show ${set.id}: invalid day`);
    if (!isClockTime(set.startTime) || !isClockTime(set.endTime)) {
      throw new Error(`Malformed show ${set.id}: invalid time`);
    }
    if (set.endTime <= set.startTime) throw new Error(`Malformed show ${set.id}: end must follow start`);
    if (typeof set.stageName !== "string" || !set.stageName) throw new Error(`Malformed show ${set.id}: invalid stage`);
    if (set.stageId !== null && typeof set.stageId !== "string") throw new Error(`Malformed show ${set.id}: invalid stageId`);
    if (set.sourceUrl !== OFFICIAL_SCHEDULE_URL) throw new Error(`Malformed show ${set.id}: invalid sourceUrl`);
    if (typeof set.featured !== "boolean") throw new Error(`Malformed show ${set.id}: invalid featured flag`);

    const existing = seen.get(set.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(set)) {
      throw new Error(`Duplicate conflicting show id ${set.id}`);
    }
    seen.set(set.id, set);
  }

  for (const day of EVENT_DATES) {
    if (!schedule.sets.some((set) => set.day === day)) {
      throw new Error(`Schedule is missing festival day ${day}`);
    }
  }
  if (schedule.version !== 1
      || schedule.eventName !== "Outside Lands 2026"
      || schedule.timeZone !== "America/Los_Angeles"
      || schedule.sourceUrl !== OFFICIAL_SCHEDULE_URL
      || typeof schedule.updatedAt !== "string"
      || !Number.isFinite(Date.parse(schedule.updatedAt))) {
    throw new Error("Schedule metadata is malformed");
  }

  return schedule;
}

export function renderScheduleModule(schedule) {
  const validated = validateSchedule(schedule);
  const json = JSON.stringify(validated, null, 2);

  return `function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return value;
}

export const OUTSIDE_LANDS_2026 = deepFreeze(${json});
`;
}

export async function fetchOfficialSchedule({
  fetchImpl = globalThis.fetch,
  updatedAt = new Date().toISOString(),
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");

  const groupings = await Promise.all(GROUPING_IDS.map(async (id) => {
    const url = `${WIDGET_ORIGIN}/api/v1/schedule_groupings/${id}?preview_token=null`;
    const response = await fetchImpl(url, {
      headers: {
        Origin: "https://sfoutsidelands.com",
        Referer: OFFICIAL_SCHEDULE_URL,
        "User-Agent": "Casablanca-Schedule-Importer/0.1",
      },
    });
    if (!response?.ok) {
      throw new Error(`Outside Lands schedule request ${id} failed with status ${response?.status ?? "unknown"}`);
    }
    return response.json();
  }));

  return validateSchedule(buildSchedule(groupings, { updatedAt }));
}

export async function writeScheduleSnapshot(schedule, {
  outputPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/outside-lands-2026.js"),
} = {}) {
  const source = renderScheduleModule(schedule);
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, source, "utf8");
  await rename(temporaryPath, outputPath);
  return outputPath;
}

export async function main() {
  const schedule = await fetchOfficialSchedule();
  await writeScheduleSnapshot(schedule);
  console.log(`Imported ${schedule.sets.length} Outside Lands sets (updatedAt ${schedule.updatedAt}).`);
  return schedule;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
