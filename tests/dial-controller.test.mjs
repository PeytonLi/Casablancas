import test from "node:test";
import assert from "node:assert/strict";
import { shortestAngleDelta, pickDetent, energyFromRotation } from "../src/dial-controller.js";

test("angle deltas cross the wrap boundary", () => {
  assert.equal(shortestAngleDelta(350, 10), 20);
  assert.equal(shortestAngleDelta(10, 350), -20);
});

test("detent hysteresis keeps the current song near a midpoint", () => {
  assert.equal(pickDetent(-24, 0, 8), 0);
  assert.equal(pickDetent(-14, 0, 8), 1);
});

test("120 degrees spans the full energy range", () => {
  assert.equal(energyFromRotation(20, 96), 100);
  assert.equal(energyFromRotation(80, -96), 0);
});
