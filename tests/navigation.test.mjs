import assert from "node:assert/strict";
import test from "node:test";

import { bearingBetween, frameAt, prepareRoute } from "../src/navigation.js";

const coordinates = [
  [-122.5000, 37.7000],
  [-122.4990, 37.7000],
  [-122.4990, 37.7010],
];

const steps = [
  { id: "depart", threshold: 0, instruction: "Head east on the path." },
  { id: "turn", threshold: 0.5, instruction: "Turn left and head north." },
  { id: "arrive", threshold: 1, instruction: "You have arrived." },
];

test("interpolates route frames at the exact start and end coordinates", () => {
  const route = prepareRoute(coordinates, steps);

  assert.deepEqual(frameAt(route, 0).coordinate, coordinates[0]);
  assert.deepEqual(frameAt(route, 1).coordinate, coordinates.at(-1));
  assert.equal(frameAt(route, 0).remainingDistanceMeters, route.totalDistanceMeters);
  assert.equal(frameAt(route, 1).remainingDistanceMeters, 0);
  assert.equal(frameAt(route, 1).etaSeconds, 0);
});

test("reduces remaining distance monotonically as route progress advances", () => {
  const route = prepareRoute(coordinates, steps);
  const remaining = [0, 0.2, 0.5, 0.8, 1].map(
    (progress) => frameAt(route, progress).remainingDistanceMeters,
  );

  assert.ok(remaining.every((distance, index) => index === 0 || distance <= remaining[index - 1]));
  assert.ok(remaining[0] > remaining.at(-1));
});

test("selects the latest instruction whose threshold has been reached", () => {
  const route = prepareRoute(coordinates, steps);

  assert.equal(frameAt(route, 0.49).instruction.id, "depart");
  assert.equal(frameAt(route, 0.5).instruction.id, "turn");
  assert.equal(frameAt(route, 1).instruction.id, "arrive");
});

test("returns stable compass bearings for eastbound, northbound, and stationary points", () => {
  assert.ok(Math.abs(bearingBetween(coordinates[0], coordinates[1]) - 90) < 0.01);
  assert.ok(Math.abs(bearingBetween(coordinates[1], coordinates[2])) < 0.01);
  assert.equal(bearingBetween(coordinates[0], coordinates[0]), 0);
});
