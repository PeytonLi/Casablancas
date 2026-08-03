const ROTATION_FIELDS = Object.freeze([
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
]);

const TRANSLATION_FIELDS = Object.freeze(["pelvis", "bounce"]);

const PROFILES = Object.freeze([
  Object.freeze({ bpm: 128, hip: 4.2, pelvis: 3.1, bounce: 3.5, torso: 3, head: 2.8, arm: 8, forearm: 8, leg: 2.8, armLeft: 3, armRight: -3, forearmLeft: 0, forearmRight: 0 }),
  Object.freeze({ bpm: 132, hip: 5.2, pelvis: 4.4, bounce: 5.5, torso: 4.5, head: 4.8, arm: 15, forearm: 18, leg: 4, armLeft: -7, armRight: 8, forearmLeft: 10, forearmRight: -10 }),
  Object.freeze({ bpm: 124, hip: 2.6, pelvis: 2.4, bounce: 7, torso: 2.2, head: 2.5, arm: 7, forearm: 12, leg: 5, armLeft: 9, armRight: -9, forearmLeft: -19, forearmRight: 19, torsoOffset: -4 }),
  Object.freeze({ bpm: 136, hip: 6.5, pelvis: 5.2, bounce: 8, torso: 5, head: 5.2, arm: 12, forearm: 16, leg: 5, armLeft: -28, armRight: 28, forearmLeft: -18, forearmRight: 18 }),
]);

function freezeAccentRows(rows) {
  for (const row of rows) Object.freeze(row);
  return Object.freeze(rows);
}

// Each function adds one of the original five phrase identities for a profile.
// They live at module scope so sampling never constructs nested accent tables.
const ACCENT_TABLE = freezeAccentRows([
  [
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 5; o.pelvis += k * w * 2; o.bounce -= k * h * 2; o.torso -= k * w * 2; o.head += k * w * 1.5; o.armLeft += k * (-8 + s * 7); o.armRight += k * (8 - s * 7); o.forearmLeft += k * (12 + p * 5); o.forearmRight += k * (-12 - p * 5); o.legLeft += k * w * 7; o.legRight -= k * w * 7; },
    (o, k, _w, s, c, _p, h) => { o.hip += k * c * 3; o.pelvis += k * c * 1.5; o.bounce -= k * h * 3; o.torso += k * s * 6; o.head -= k * s * 4.5; o.armLeft += k * (-27 + c * 6); o.armRight += k * (27 - c * 6); o.forearmLeft += k * (-31 + s * 8); o.forearmRight += k * (31 - s * 8); o.legLeft -= k * c * 4; o.legRight += k * c * 4; },
    (o, k, w, s, c, _p, h) => { o.hip += k * w * 7; o.pelvis += k * w * 3.5; o.bounce += k * (2 - h * 5); o.torso += k * (-7 + c * 5); o.head += k * (4 - c * 3); o.armLeft += k * (18 + s * 5); o.armRight += k * (-18 - s * 5); o.forearmLeft += k * (-22 + w * 10); o.forearmRight += k * (22 - w * 10); o.legLeft += k * (5 + s * 2); o.legRight += k * (-5 - s * 2); },
    (o, k, _w, s, _c, p, h) => { o.hip += k * s * 4; o.pelvis += k * s * 2.2; o.bounce -= k * h * 7; o.torso += k * s * 8; o.head -= k * s * 6; o.armLeft += k * (-12 + p * 20); o.armRight += k * (12 - p * 20); o.forearmLeft += k * (-35 + h * 18); o.forearmRight += k * (35 - h * 18); o.legLeft += k * s * 6; o.legRight -= k * s * 6; },
    (o, k, _w, s, c, p, h) => { o.hip += k * c * 6; o.pelvis += k * c * 3; o.bounce -= k * h * 3; o.torso -= k * c * 6; o.head += k * c * 8; o.armLeft += k * (-40 + s * 8); o.armRight += k * (33 + s * 5); o.forearmLeft += k * (-28 + p * 8); o.forearmRight += k * (-36 - p * 7); o.legLeft += k * c * 7; o.legRight -= k * c * 4; },
  ],
  [
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 5; o.pelvis += k * w * 2.5; o.bounce -= k * h * 4; o.torso += k * s * 4; o.head -= k * s * 6; o.armLeft += k * s * 24; o.armRight -= k * s * 24; o.forearmLeft += k * (19 - p * 13); o.forearmRight += k * (-19 + p * 13); o.legLeft += k * w * 6; o.legRight -= k * w * 6; },
    (o, k, _w, s, c, _p, h) => { o.hip += k * c * 4; o.pelvis += k * c * 2; o.bounce -= k * h * 2; o.torso -= k * c * 7; o.head += k * s * 10; o.armLeft += k * (-31 + s * 6); o.armRight += k * (31 - s * 6); o.forearmLeft += k * (-48 + h * 12); o.forearmRight += k * (48 - h * 12); o.legLeft -= k * c * 5; o.legRight += k * c * 5; },
    (o, k, _w, s, _c, p, h) => { o.hip += k * s * 3; o.pelvis += k * s * 1.5; o.bounce -= k * h * 9; o.torso -= k * s * 4; o.head += k * s * 3; o.armLeft += k * (-52 + s * 8); o.armRight += k * (52 - s * 8); o.forearmLeft += k * (-23 + p * 10); o.forearmRight += k * (23 - p * 10); o.legLeft += k * s * 7; o.legRight -= k * s * 7; },
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 7; o.pelvis += k * w * 3.5; o.bounce -= k * h * 3; o.torso += k * w * 6; o.head -= k * w * 7; o.armLeft += k * (-9 + s * 7); o.armRight += k * (48 + s * 7); o.forearmLeft += k * (23 - p * 8); o.forearmRight += k * (-42 - p * 7); o.legLeft += k * w * 8; o.legRight -= k * w * 4; },
    (o, k, _w, s, c, p, h) => { o.hip += k * c * 5; o.pelvis += k * c * 2.5; o.bounce -= k * h * 7; o.torso += k * c * 5; o.head -= k * c * 4; o.armLeft += k * (-35 + s * 14); o.armRight += k * (35 - s * 14); o.forearmLeft += k * (24 + p * 8); o.forearmRight += k * (-24 - p * 8); o.legLeft += k * (4 + h * 7); o.legRight += k * (-4 - h * 7); },
  ],
  [
    (o, k, _w, s, _c, _p, h) => { o.hip += k * s * 3; o.pelvis += k * s * 1.5; o.bounce -= k * h * 9; o.torso += k * (-5 + h * 3); o.head -= k * h * 4; o.armLeft += k * (16 - h * 10); o.armRight += k * (-16 + h * 10); o.forearmLeft += k * (-28 + s * 9); o.forearmRight += k * (28 - s * 9); o.legLeft += k * h * 9; o.legRight -= k * h * 6; },
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 4; o.pelvis += k * w * 2; o.bounce -= k * h * 4; o.torso += k * s * 9; o.head -= k * s * 6; o.armLeft += k * (-29 + p * 14); o.armRight += k * (29 - p * 14); o.forearmLeft += k * (-46 + h * 13); o.forearmRight += k * (46 - h * 13); o.legLeft -= k * w * 6; o.legRight += k * w * 6; },
    (o, k, w, s, c, _p, h) => { o.hip += k * c * 5; o.pelvis += k * c * 2.5; o.bounce += k * (5 - h * 3); o.torso += k * (-11 + w * 4); o.head += k * (6 - w * 3); o.armLeft += k * (27 + s * 7); o.armRight += k * (-27 - s * 7); o.forearmLeft += k * (-16 + c * 8); o.forearmRight += k * (16 - c * 8); o.legLeft += k * (7 + s * 3); o.legRight += k * (-7 - s * 3); },
    (o, k, _w, s, _c, p, h) => { o.hip += k * s * 6; o.pelvis += k * s * 3; o.bounce -= k * h * 6; o.torso += k * s * 10; o.head -= k * s * 8; o.armLeft += k * s * 25; o.armRight -= k * s * 25; o.forearmLeft += k * (-22 + p * 20); o.forearmRight += k * (22 - p * 20); o.legLeft += k * s * 8; o.legRight -= k * s * 8; },
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 3; o.pelvis += k * w * 1.5; o.bounce -= k * h * 7; o.torso -= k * w * 7; o.head += k * w * 5; o.armLeft += k * (-38 + s * 9); o.armRight += k * (19 - s * 8); o.forearmLeft += k * (-34 + p * 8); o.forearmRight += k * (39 - p * 10); o.legLeft += k * (5 + h * 9); o.legRight += k * (-5 - h * 9); },
  ],
  [
    (o, k, w, s, _c, p, h) => { o.hip += k * w * 4; o.pelvis += k * w * 2; o.bounce -= k * h * 8; o.torso -= k * s * 4; o.head += k * s * 5; o.armLeft += k * (-52 + s * 7); o.armRight += k * (52 - s * 7); o.forearmLeft += k * (-27 + p * 10); o.forearmRight += k * (27 - p * 10); o.legLeft += k * w * 7; o.legRight -= k * w * 7; },
    (o, k, w, s, _c, _p, h) => { o.hip += k * s * 3; o.pelvis += k * s * 1.5; o.bounce -= k * h * 13; o.torso -= k * w * 5; o.head += k * w * 6; o.armLeft += k * (-34 + h * 13); o.armRight += k * (34 - h * 13); o.forearmLeft += k * (-38 + s * 11); o.forearmRight += k * (38 - s * 11); o.legLeft += k * h * 9; o.legRight -= k * h * 9; },
    (o, k, w, _s, c, _p, h) => { o.hip += k * w * 9; o.pelvis += k * w * 4.5; o.bounce -= k * h * 4; o.torso += k * w * 8; o.head -= k * w * 8; o.armLeft += k * (-23 + w * 23); o.armRight += k * (23 - w * 23); o.forearmLeft += k * (-43 + c * 9); o.forearmRight += k * (43 - c * 9); o.legLeft += k * w * 8; o.legRight -= k * w * 8; },
    (o, k, _w, s, _c, p, h) => { o.hip += k * s * 6; o.pelvis += k * s * 3; o.bounce -= k * h * 8; o.torso += k * s * 10; o.head -= k * s * 9; o.armLeft += k * (-48 + p * 10); o.armRight += k * (48 - p * 10); o.forearmLeft += k * (20 - h * 12); o.forearmRight += k * (-20 + h * 12); o.legLeft += k * s * 9; o.legRight -= k * s * 9; },
    (o, k, w, _s, c, p, h) => { o.hip += k * c * 8; o.pelvis += k * c * 4; o.bounce -= k * h * 6; o.torso -= k * c * 9; o.head += k * c * 10; o.armLeft += k * (-41 + w * 18); o.armRight += k * (16 + w * 18); o.forearmLeft += k * (-29 + p * 14); o.forearmRight += k * (-41 - p * 14); o.legLeft += k * c * 9; o.legRight -= k * c * 9; },
  ],
]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function beatEnvelope(beatPosition, delayBeats = 0) {
  const phase = modulo(beatPosition - delayBeats, 1);
  if (phase >= 0.82) {
    const anticipation = (phase - 0.82) / 0.18;
    return -Math.sin(anticipation * Math.PI) * 0.16;
  }
  if (phase < 0.07) return 1 - ((1 - phase / 0.07) ** 3);
  if (phase < 0.16) return 1;
  if (phase < 0.72) {
    const settle = (phase - 0.16) / 0.56;
    return Math.exp(-4.2 * settle) * Math.cos(settle * Math.PI * 2.25);
  }
  return 0;
}

function resetBasePose(pose, profile, beatPosition, radians, halfRadians) {
  const wave = Math.sin(halfRadians);
  const hit = beatEnvelope(beatPosition);
  const shoulderHit = beatEnvelope(beatPosition, profile.bpm / 60 * 0.045);
  const headWave = Math.sin((beatPosition - profile.bpm / 60 * 0.065) * Math.PI * 2);
  const forearmWave = Math.sin((beatPosition - profile.bpm / 60 * 0.085) * Math.PI * 2);

  pose.hip = wave * profile.hip;
  pose.pelvis = Math.sin(halfRadians + 0.32) * profile.pelvis;
  pose.bounce = -Math.max(0, hit) * profile.bounce;
  pose.torso = (profile.torsoOffset ?? 0) + Math.sin(halfRadians + 0.3) * profile.torso;
  pose.shoulderLeft = -pose.torso * 0.34 + shoulderHit * 2.2;
  pose.shoulderRight = pose.torso * 0.34 - shoulderHit * 1.8;
  pose.head = headWave * profile.head;
  pose.armLeft = profile.armLeft + wave * profile.arm;
  pose.armRight = profile.armRight - Math.sin(halfRadians + 0.4) * profile.arm;
  pose.forearmLeft = profile.forearmLeft + forearmWave * profile.forearm;
  pose.forearmRight = profile.forearmRight - Math.sin(radians - profile.bpm / 60 * 0.075 * Math.PI * 2 + 0.4) * profile.forearm;
  pose.legLeft = wave * profile.leg;
  pose.legRight = -wave * profile.leg;
  pose.lowerLegLeft = 0;
  pose.lowerLegRight = 0;
}

function constrainPose(pose) {
  for (const field of ROTATION_FIELDS) pose[field] = clamp(pose[field], -90, 90);
  for (const field of TRANSLATION_FIELDS) pose[field] = clamp(pose[field], -24, 24);
}

export function createDanceMotion(profileIndex = 0) {
  const normalizedIndex = modulo(Number.isFinite(profileIndex) ? Math.trunc(profileIndex) : 0, PROFILES.length);
  const profile = PROFILES[normalizedIndex];
  const pose = {
    hip: 0,
    pelvis: 0,
    bounce: 0,
    torso: 0,
    shoulderLeft: 0,
    shoulderRight: 0,
    head: 0,
    armLeft: 0,
    armRight: 0,
    forearmLeft: 0,
    forearmRight: 0,
    legLeft: 0,
    legRight: 0,
    lowerLegLeft: 0,
    lowerLegRight: 0,
  };

  return Object.freeze({
    sample(timeSeconds = 0, pulse = null) {
      const time = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;
      const beats = time * profile.bpm / 60;
      const radians = beats * Math.PI * 2;
      const halfRadians = radians * 0.5;
      const wave = Math.sin(halfRadians);
      const snap = Math.sin(radians);
      const counter = Math.cos(halfRadians);
      const punch = Math.cos(radians);
      const hit = beatEnvelope(beats);
      const phrasePosition = beats / 8;
      const move = Math.floor(phrasePosition) % 5;
      const previousMove = modulo(move - 1, 5);
      const transition = smoothstep(modulo(phrasePosition, 1) / 0.16);

      resetBasePose(pose, profile, beats, radians, halfRadians);
      ACCENT_TABLE[normalizedIndex][previousMove](pose, 1 - transition, wave, snap, counter, punch, hit);
      ACCENT_TABLE[normalizedIndex][move](pose, transition, wave, snap, counter, punch, hit);

      const level = clamp(Number.isFinite(pulse?.level) ? pulse.level : 0, 0, 1);
      if (level > 0) {
        const impact = level * (pulse?.downbeat ? 1 : 0.62) * (0.42 + Math.max(0, hit) * 0.58);
        const side = (Math.trunc(pulse?.step ?? 0) & 1) === 0 ? 1 : -1;
        pose.bounce -= impact * 4.8;
        pose.pelvis += side * impact * 1.1;
        pose.hip += side * impact * 1.7;
        pose.shoulderLeft += impact * 3.2;
        pose.shoulderRight -= impact * 2.4;
        pose.armLeft -= side * impact * 2.8;
        pose.armRight += side * impact * 1.9;
        pose.forearmLeft += impact * 4.1;
        pose.forearmRight -= impact * 3.3;
        pose.legLeft += side * impact * 1.6;
        pose.legRight -= side * impact * 1.1;
      }

      const compression = Math.max(0, -pose.bounce) * 0.22;
      pose.legLeft += compression * (0.55 + Math.max(0, -wave) * 0.25);
      pose.legRight -= compression * (0.55 + Math.max(0, wave) * 0.25);
      pose.shoulderLeft += -pose.torso * 0.16 + pose.armRight * 0.035;
      pose.shoulderRight += pose.torso * 0.16 - pose.armLeft * 0.035;
      pose.lowerLegLeft = -pose.legLeft * 0.62 - compression * 0.35;
      pose.lowerLegRight = -pose.legRight * 0.62 + compression * 0.35;

      constrainPose(pose);
      return pose;
    },
  });
}
