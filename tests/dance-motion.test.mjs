import assert from "node:assert/strict";
import test from "node:test";

import { createDanceMotion } from "../src/dance-motion.js";

const ROTATION_FIELDS = [
  "hip",
  "torso",
  "shoulderLeft",
  "shoulderRight",
  "head",
  "armLeft",
  "armRight",
  "forearmLeft",
  "forearmRight",
  "legLeft",
  "legRight",
  "lowerLegLeft",
  "lowerLegRight",
];
const TRANSLATION_FIELDS = ["pelvis", "bounce"];
const POSE_FIELDS = [...ROTATION_FIELDS, ...TRANSLATION_FIELDS];

function snapshot(pose) {
  return Object.fromEntries(POSE_FIELDS.map((field) => [field, pose[field]]));
}

function signature(pose) {
  return POSE_FIELDS.map((field) => pose[field].toFixed(3)).join("|");
}

test("sample returns a complete finite pose", () => {
  const pose = createDanceMotion(0).sample(0, null);

  for (const field of POSE_FIELDS) {
    assert.equal(typeof pose[field], "number", `${field} should be numeric`);
    assert.ok(Number.isFinite(pose[field]), `${field} should be finite`);
  }
});

test("five successive eight-beat phrases keep five distinct move identities", () => {
  const motion = createDanceMotion(0);
  const phraseSeconds = (60 / 128) * 8;
  const signatures = Array.from({ length: 5 }, (_, phrase) =>
    signature(motion.sample((phrase + 0.35) * phraseSeconds, null)),
  );

  assert.equal(new Set(signatures).size, 5);
});

test("a strong downbeat deepens the bounce without uniformly scaling the limbs", () => {
  const motion = createDanceMotion(1);
  const withoutPulse = snapshot(motion.sample(1.125, null));
  const withPulse = snapshot(motion.sample(1.125, { step: 8, level: 0.8, downbeat: true }));

  assert.ok(Math.abs(withPulse.bounce) > Math.abs(withoutPulse.bounce));

  const limbFields = ["armLeft", "armRight", "forearmLeft", "forearmRight", "legLeft", "legRight"];
  const pulseDeltas = limbFields.map((field) => (withPulse[field] - withoutPulse[field]).toFixed(4));
  assert.ok(new Set(pulseDeltas).size > 2, "pulse should accent different limbs differently");
});

test("profiles produce different pose signatures at the same time", () => {
  const signatures = Array.from({ length: 4 }, (_, profile) =>
    signature(createDanceMotion(profile).sample(1.375, null)),
  );

  assert.equal(new Set(signatures).size, 4);
});

test("sampled choreography stays inside explicit safe movement bounds", () => {
  for (let profile = 0; profile < 4; profile += 1) {
    const motion = createDanceMotion(profile);
    for (let sampleIndex = 0; sampleIndex < 240; sampleIndex += 1) {
      const pulse = sampleIndex % 16 === 0
        ? { step: sampleIndex, level: 1, downbeat: sampleIndex % 32 === 0 }
        : null;
      const pose = motion.sample(sampleIndex / 30, pulse);

      for (const field of ROTATION_FIELDS) {
        assert.ok(pose[field] >= -90 && pose[field] <= 90, `${field} escaped rotation bounds`);
      }
      for (const field of TRANSLATION_FIELDS) {
        assert.ok(pose[field] >= -24 && pose[field] <= 24, `${field} escaped translation bounds`);
      }
    }
  }
});
