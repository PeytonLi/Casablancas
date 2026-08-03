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
  { id: "e", artist: "Later Set", day: "2026-08-07", startTime: "19:20", endTime: "20:20", stageId: "sutro", stageName: "Sutro", featured: false },
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

test("recommendGap returns a candidate when both stage walks are mapped", () => {
  assert.equal(recommendGap(["d", "e"], sets, places)?.id, "c");
});

test("recommendGap rejects a candidate with an unmapped stage", () => {
  const unmapped = {
    ...sets.find((set) => set.id === "c"),
    id: "unmapped-candidate",
    artist: "Unmapped Candidate",
    stageId: null,
    stageName: "Unknown Stage",
  };
  const selected = sets.filter((set) => ["d", "e"].includes(set.id));

  assert.equal(recommendGap(["d", "e"], [...selected, unmapped], places), null);
});

test("recommendGap rejects a candidate when the departure stage is unmapped", () => {
  const unmappedNext = {
    ...sets.find((set) => set.id === "e"),
    id: "unmapped-next",
    stageId: "unknown-stage",
    stageName: "Unknown Stage",
  };
  const current = sets.find((set) => set.id === "d");
  const candidate = sets.find((set) => set.id === "c");

  assert.equal(recommendGap(["d", "unmapped-next"], [current, candidate, unmappedNext], places), null);
});

test("recommendGap accepts a 90-minute raw gap and rejects 91 minutes", () => {
  const atNinety = { ...sets.find((set) => set.id === "e"), id: "at-ninety", startTime: "19:30" };
  const atNinetyOne = { ...atNinety, id: "at-ninety-one", startTime: "19:31" };
  assert.equal(recommendGap(["d", "at-ninety"], [...sets, atNinety], places)?.id, "c");
  assert.equal(recommendGap(["d", "at-ninety-one"], [...sets, atNinetyOne], places), null);
});
