import { createDanceMotion } from "./dance-motion.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const TRACK_PROFILES = [
  { emotion: "confident", bpm: 116, brow: -1, eye: 0.96, smile: 0.1 },
  { emotion: "playful", bpm: 150, brow: 1.2, eye: 1.08, smile: 0.8 },
  { emotion: "intense", bpm: 104, brow: -3, eye: 0.82, smile: -0.25 },
  { emotion: "euphoric", bpm: 136, brow: 2.4, eye: 1.14, smile: 1 },
];

const RIG_MARKUP = `
  <svg class="rig-svg" viewBox="0 0 260 430" xmlns="${SVG_NS}" aria-hidden="true">
    <defs>
      <linearGradient id="rig-skin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0b08d"/>
        <stop offset="0.55" stop-color="#d88b6a"/>
        <stop offset="1" stop-color="#a95848"/>
      </linearGradient>
      <linearGradient id="rig-leather" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b2e34"/>
        <stop offset="0.42" stop-color="#0c0e12"/>
        <stop offset="0.72" stop-color="#24272d"/>
        <stop offset="1" stop-color="#050608"/>
      </linearGradient>
      <linearGradient id="rig-chrome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#555d62"/>
        <stop offset="0.28" stop-color="#f6fbfb"/>
        <stop offset="0.55" stop-color="#7a8388"/>
        <stop offset="0.8" stop-color="#eff5f5"/>
        <stop offset="1" stop-color="#3a4145"/>
      </linearGradient>
      <radialGradient id="rig-eye" cx="45%" cy="38%" r="70%">
        <stop offset="0" stop-color="#f8f7ed"/>
        <stop offset="1" stop-color="#bfc6c3"/>
      </radialGradient>
    </defs>

    <ellipse data-part="ground-shadow" cx="130" cy="405" rx="72" ry="9" fill="#000" opacity=".58"/>

    <g data-part="hair-back">
      <path d="M77 60C78 20 102 5 130 7c36-1 57 20 57 58 2 32-4 70-17 101l-23-17-18 11-24-12-26 18C68 126 69 88 77 60Z" fill="#08090b" stroke="#34383d" stroke-width="2"/>
      <path d="M86 52c-10 30-8 70 2 102M104 28C90 66 95 112 105 150M132 18c-8 38-2 87 4 139M157 27c13 36 12 79 3 126M174 46c8 32 3 70-7 105" fill="none" stroke="#454950" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <path data-part="hair-strand-left" d="M91 42C71 86 78 127 64 161" fill="none" stroke="#15181c" stroke-width="8" stroke-linecap="round"/>
      <path data-part="hair-strand-right" d="M170 39c22 43 13 89 25 126" fill="none" stroke="#15181c" stroke-width="7" stroke-linecap="round"/>
    </g>

    <g data-part="leg-left">
      <path d="M101 216c-8 29-12 60-12 92l31 1 10-91Z" fill="url(#rig-leather)" stroke="#555b60" stroke-width="1.5"/>
      <path d="M96 229c7 12 15 18 28 21M92 272c8 7 17 10 31 9" fill="none" stroke="#666d72" stroke-width="1" opacity=".52"/>
      <g data-part="lower-leg-left">
        <path d="M89 301c-2 31-1 60 2 87h28l2-82Z" fill="url(#rig-leather)" stroke="#555b60" stroke-width="1.5"/>
        <path d="M88 373 78 401c-2 7 2 11 10 11h39l-7-29Z" fill="#090b0e" stroke="#70777a" stroke-width="1.5"/>
        <path d="M80 404h47v8H83c-6 0-8-3-3-8Z" fill="#181c20" stroke="#9aa1a4" stroke-width="1"/>
        <path d="m93 378 22 17m-23-9 24 17" stroke="#767d82" stroke-width="1.2"/>
      </g>
    </g>

    <g data-part="leg-right">
      <path d="M131 218l10 91 31-1c0-33-4-63-13-92Z" fill="url(#rig-leather)" stroke="#555b60" stroke-width="1.5"/>
      <path d="M136 250c13-3 21-9 28-21M138 281c13 1 22-2 30-9" fill="none" stroke="#666d72" stroke-width="1" opacity=".52"/>
      <g data-part="lower-leg-right">
        <path d="M140 306l2 82h28c3-27 4-56 2-87Z" fill="url(#rig-leather)" stroke="#555b60" stroke-width="1.5"/>
        <path d="m141 383-7 29h39c8 0 12-4 10-11l-10-28Z" fill="#090b0e" stroke="#70777a" stroke-width="1.5"/>
        <path d="M134 404h47c5 5 3 8-3 8h-44Z" fill="#181c20" stroke="#9aa1a4" stroke-width="1"/>
        <path d="m147 395 22-17m-23 25 24-17" stroke="#767d82" stroke-width="1.2"/>
      </g>
    </g>

    <g data-part="torso">
      <path d="M112 91h36l5 31-23 14-23-14Z" fill="url(#rig-skin)" stroke="#8f4f42" stroke-width="1"/>
      <path d="M92 120c8-13 21-19 38-19s31 6 39 19l-7 103c-21 12-44 12-65 0Z" fill="url(#rig-leather)" stroke="#737a7e" stroke-width="1.7"/>
      <path d="M130 102v120M101 131c9 7 19 10 29 10s20-3 30-10" fill="none" stroke="#858d91" stroke-width="1.25" opacity=".75"/>
      <path d="m96 166 15-12 19 13 19-13 15 12-4 43-30 11-30-11Z" fill="#111419" stroke="#383e43" stroke-width="1"/>
      <path d="M103 189h54" stroke="#95e000" stroke-width="2" opacity=".92"/>
      <g data-part="belt">
        <path d="M97 211c22 8 44 8 66 0l1 13c-23 9-46 9-69 0Z" fill="#090b0d" stroke="url(#rig-chrome)" stroke-width="1.4"/>
        <rect x="122" y="212" width="16" height="13" rx="2" fill="none" stroke="#cdd4d5" stroke-width="2"/>
        <path data-part="strap-left" d="M108 221c-4 35-6 59-4 80" fill="none" stroke="#252a2e" stroke-width="5"/>
        <path data-part="strap-right" d="M152 221c4 35 6 59 4 80" fill="none" stroke="#252a2e" stroke-width="5"/>
      </g>
    </g>

    <g data-part="arm-left">
      <path d="M96 123c-12 4-19 17-20 36l5 65 21-2 8-62Z" fill="url(#rig-leather)" stroke="#656c71" stroke-width="1.4"/>
      <circle cx="90" cy="218" r="4" fill="url(#rig-chrome)"/>
      <g data-part="forearm-left">
        <path d="m81 214 1 50 17 1 3-48Z" fill="url(#rig-leather)" stroke="#656c71" stroke-width="1.4"/>
        <path d="M82 261c-3 11-2 20 4 27 4 4 10 1 10-4l3-21Z" fill="url(#rig-skin)" stroke="#8f4f42" stroke-width="1"/>
        <path d="M85 267v13m4-14v15m4-14v12" stroke="#713d37" stroke-width=".8"/>
      </g>
    </g>

    <g data-part="arm-right">
      <path d="M164 123c12 4 19 17 20 36l-5 65-21-2-8-62Z" fill="url(#rig-leather)" stroke="#656c71" stroke-width="1.4"/>
      <circle cx="170" cy="218" r="4" fill="url(#rig-chrome)"/>
      <g data-part="forearm-right">
        <path d="m179 214-1 50-17 1-3-48Z" fill="url(#rig-leather)" stroke="#656c71" stroke-width="1.4"/>
        <path d="M178 261c3 11 2 20-4 27-4 4-10 1-10-4l-3-21Z" fill="url(#rig-skin)" stroke="#8f4f42" stroke-width="1"/>
        <path d="M175 267v13m-4-14v15m-4-14v12" stroke="#713d37" stroke-width=".8"/>
      </g>
    </g>

    <g data-part="head">
      <path d="M98 57c2-25 16-38 33-38 20 0 33 15 32 40l-4 31c-5 21-17 31-29 31s-25-10-30-31Z" fill="url(#rig-skin)" stroke="#8f4f42" stroke-width="1.3"/>
      <path d="M97 65c-7-28 7-52 34-53 23 0 39 18 34 49-7-10-12-22-13-34-15 12-33 17-52 16Z" fill="#0b0c0e"/>
      <path d="M100 45c-1 17 1 30 6 43M159 43c1 18-1 34-5 47" fill="none" stroke="#2f3338" stroke-width="5" stroke-linecap="round"/>
      <path d="M129 68c-2 8-3 14-1 18 2 2 5 2 8 0" fill="none" stroke="#995a4c" stroke-width="1.2" stroke-linecap="round"/>

      <g data-part="eye-left">
        <path d="M105 67q9-9 19 0-9 10-19 0Z" fill="url(#rig-eye)" stroke="#271b1a" stroke-width="1.4"/>
        <g data-part="pupil-left"><ellipse cx="115" cy="67" rx="3.2" ry="4.2" fill="#201510"/><circle cx="116" cy="65.5" r=".8" fill="#fff"/></g>
        <path data-part="lid-left" d="M105 67q9-9 19 0" fill="none" stroke="#171315" stroke-width="3.2" stroke-linecap="round"/>
      </g>
      <g data-part="eye-right">
        <path d="M137 67q9-9 19 0-9 10-19 0Z" fill="url(#rig-eye)" stroke="#271b1a" stroke-width="1.4"/>
        <g data-part="pupil-right"><ellipse cx="147" cy="67" rx="3.2" ry="4.2" fill="#201510"/><circle cx="148" cy="65.5" r=".8" fill="#fff"/></g>
        <path data-part="lid-right" d="M137 67q9-9 19 0" fill="none" stroke="#171315" stroke-width="3.2" stroke-linecap="round"/>
      </g>

      <path data-part="brow-left" d="M104 56q10-6 20-1" fill="none" stroke="#2a1714" stroke-width="3.2" stroke-linecap="round"/>
      <path data-part="brow-right" d="M137 55q10-5 20 1" fill="none" stroke="#2a1714" stroke-width="3.2" stroke-linecap="round"/>

      <g data-part="mouth">
        <path data-viseme="rest" d="M119 94q11 6 22 0-11 13-22 0Z" fill="#783c43" stroke="#5a2931" stroke-width="1"/>
        <ellipse data-viseme="A" cx="130" cy="96" rx="7.5" ry="6" fill="#451c27" stroke="#b65e6b" stroke-width="1.5" opacity="0"/>
        <path data-viseme="E" d="M118 95q12-5 24 0-12 8-24 0Z" fill="#f0d8cc" stroke="#9c4c58" stroke-width="1.2" opacity="0"/>
        <ellipse data-viseme="O" cx="130" cy="96" rx="4.7" ry="6.8" fill="#491d27" stroke="#bd6670" stroke-width="1.5" opacity="0"/>
        <path data-viseme="M" d="M119 95q11 4 22 0M121 97q9 3 18 0" fill="none" stroke="#783c43" stroke-width="2" stroke-linecap="round" opacity="0"/>
      </g>

      <circle cx="97" cy="79" r="4" fill="none" stroke="url(#rig-chrome)" stroke-width="2"/>
      <circle cx="163" cy="79" r="4" fill="none" stroke="url(#rig-chrome)" stroke-width="2"/>
      <path data-part="hair-front-left" d="M110 18C91 41 101 75 91 111" fill="none" stroke="#101215" stroke-width="12" stroke-linecap="round"/>
      <path data-part="hair-front-right" d="M149 18c17 27 9 58 20 91" fill="none" stroke="#101215" stroke-width="10" stroke-linecap="round"/>
    </g>

    <g data-part="reaction-burst" opacity="0" fill="#a8ff00">
      <path d="M189 104c.3 5 2.7 7.4 7.7 7.7-5 .3-7.4 2.7-7.7 7.7-.3-5-2.7-7.4-7.7-7.7 5-.3 7.4-2.7 7.7-7.7Z"/>
      <circle cx="201" cy="128" r="3"/>
      <path d="M69 125c.2 3.8 2 5.6 5.8 5.8-3.8.2-5.6 2-5.8 5.8-.2-3.8-2-5.6-5.8-5.8 3.8-.2 5.6-2 5.8-5.8Z"/>
    </g>
  </svg>
`;

const FALLBACK_MARKUP = `
  <div class="rig-fallback" aria-hidden="true">
    <i class="fallback-hair"></i><i class="fallback-head"></i><i class="fallback-body"></i>
    <i class="fallback-arm left"></i><i class="fallback-arm right"></i>
    <i class="fallback-leg left"></i><i class="fallback-leg right"></i>
  </div>
`;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function damp(current, target, speed, delta) {
  return current + (target - current) * (1 - Math.exp(-speed * delta));
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothstep(value) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function makeFallbackController(container) {
  container.innerHTML = FALLBACK_MARKUP;
  container.classList.add("using-fallback");
  return {
    setPerforming(performing) { container.classList.toggle("fallback-performing", performing); },
    setTrack(index) { container.dataset.fallbackTrack = String(index); },
    setPulse() {},
    setVocal(vocal) { container.classList.toggle("fallback-vocal", vocal); },
    react() { container.classList.remove("fallback-react"); requestAnimationFrame(() => container.classList.add("fallback-react")); },
    getState() { return { fallback: true }; },
    destroy() {},
  };
}

export function createPerformerRig(container, { getAudioLevel = () => 0 } = {}) {
  if (!(container instanceof Element)) throw new TypeError("createPerformerRig requires a DOM element.");

  try {
    container.innerHTML = RIG_MARKUP;
    container.classList.remove("using-fallback");
    const svg = container.querySelector(".rig-svg");
    if (!svg) throw new Error("The SVG rig did not initialize.");

    const part = (name) => {
      const element = svg.querySelector(`[data-part="${name}"]`);
      if (!element) throw new Error(`Missing rig part: ${name}`);
      return element;
    };

    const parts = {
      hairBack: part("hair-back"),
      hairLeft: part("hair-strand-left"),
      hairRight: part("hair-strand-right"),
      hairFrontLeft: part("hair-front-left"),
      hairFrontRight: part("hair-front-right"),
      torso: part("torso"),
      head: part("head"),
      armLeft: part("arm-left"),
      armRight: part("arm-right"),
      forearmLeft: part("forearm-left"),
      forearmRight: part("forearm-right"),
      legLeft: part("leg-left"),
      legRight: part("leg-right"),
      lowerLegLeft: part("lower-leg-left"),
      lowerLegRight: part("lower-leg-right"),
      belt: part("belt"),
      strapLeft: part("strap-left"),
      strapRight: part("strap-right"),
      eyeLeft: part("eye-left"),
      eyeRight: part("eye-right"),
      lidLeft: part("lid-left"),
      lidRight: part("lid-right"),
      pupilLeft: part("pupil-left"),
      pupilRight: part("pupil-right"),
      browLeft: part("brow-left"),
      browRight: part("brow-right"),
      mouth: part("mouth"),
      burst: part("reaction-burst"),
      groundShadow: part("ground-shadow"),
    };

    const origins = {
      hairBack: "130px 56px",
      hairLeft: "91px 42px",
      hairRight: "170px 39px",
      hairFrontLeft: "110px 18px",
      hairFrontRight: "149px 18px",
      torso: "130px 215px",
      head: "130px 106px",
      armLeft: "96px 125px",
      armRight: "164px 125px",
      forearmLeft: "91px 218px",
      forearmRight: "169px 218px",
      legLeft: "113px 218px",
      legRight: "147px 218px",
      lowerLegLeft: "105px 305px",
      lowerLegRight: "155px 305px",
      belt: "130px 218px",
      strapLeft: "108px 221px",
      strapRight: "152px 221px",
      eyeLeft: "115px 67px",
      eyeRight: "147px 67px",
      lidLeft: "115px 67px",
      lidRight: "147px 67px",
      browLeft: "114px 56px",
      browRight: "147px 56px",
      mouth: "130px 95px",
      burst: "130px 120px",
      groundShadow: "130px 405px",
    };

    for (const [name, element] of Object.entries(parts)) {
      element.style.transformBox = "view-box";
      element.style.transformOrigin = origins[name] ?? "center";
      element.style.willChange = "transform";
    }

    const visemes = [...svg.querySelectorAll("[data-viseme]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motions = TRACK_PROFILES.map((_, index) => createDanceMotion(index));
    const motionPulse = { step: 0, level: 0, downbeat: false };
    let destroyed = false;
    let frameId;
    let lastTime = performance.now();
    let elapsed = 0;
    let performingTarget = 0;
    let performanceAmount = 0;
    let currentTrack = 0;
    let previousTrack = 0;
    let trackBlend = 1;
    let vocalUntil = 0;
    let visemeSeed = 0;
    let nextBlink = lastTime + 1700 + Math.random() * 1900;
    let blinkStarted = 0;
    let gazeTarget = 0;
    let gaze = 0;
    let nextGaze = lastTime + 900;
    let reactionUntil = 0;
    let reactionDirection = 1;
    let backHairFollow = 0;
    let frontHairFollow = 0;
    let strapFollow = 0;
    let previousRootX = 0;
    let pulseTarget = 0;
    let pulseLevel = 0;
    let pulseStep = 0;
    let pulseDownbeatUntil = 0;
    let lastPulseAt = 0;
    let phaseCorrection = 0;
    let currentViseme = "rest";

    function apply(element, { x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = {}) {
      element.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
    }

    function showViseme(name) {
      if (name === currentViseme) return;
      currentViseme = name;
      for (const shape of visemes) {
        shape.style.opacity = shape.dataset.viseme === name ? "1" : "0";
      }
    }

    function animate(now) {
      if (destroyed) return;
      const delta = clamp((now - lastTime) / 1000, 0.001, 0.05);
      lastTime = now;
      elapsed += delta;
      const reduced = reducedMotion.matches;
      const motionScale = reduced ? 0.24 : 1;
      const secondaryScale = reduced ? 0.18 : 1;
      const idleScale = reduced ? 0.22 : 1;
      const reactionScale = reduced ? 0.2 : 1;

      performanceAmount = damp(performanceAmount, performingTarget, performingTarget ? 4.8 : 2.6, delta);
      trackBlend = clamp(trackBlend + delta * 2.8, 0, 1);
      if (!lastPulseAt || now - lastPulseAt > 240) pulseTarget = 0;
      pulseLevel = damp(pulseLevel, pulseTarget, pulseTarget > pulseLevel ? 13 : 5.5, delta);
      motionPulse.step = pulseStep;
      motionPulse.level = pulseLevel;
      motionPulse.downbeat = now < pulseDownbeatUntil;
      const motionTime = elapsed + phaseCorrection;
      const oldPose = motions[previousTrack].sample(motionTime, motionPulse);
      const newPose = motions[currentTrack].sample(motionTime, motionPulse);
      const poseBlend = smoothstep(trackBlend);
      const danceHip = mix(oldPose.hip, newPose.hip, poseBlend);
      const dancePelvis = mix(oldPose.pelvis, newPose.pelvis, poseBlend);
      const danceBounce = mix(oldPose.bounce, newPose.bounce, poseBlend);
      const danceTorso = mix(oldPose.torso, newPose.torso, poseBlend);
      const danceShoulderLeft = mix(oldPose.shoulderLeft, newPose.shoulderLeft, poseBlend);
      const danceShoulderRight = mix(oldPose.shoulderRight, newPose.shoulderRight, poseBlend);
      const danceHead = mix(oldPose.head, newPose.head, poseBlend);
      const danceArmLeft = mix(oldPose.armLeft, newPose.armLeft, poseBlend);
      const danceArmRight = mix(oldPose.armRight, newPose.armRight, poseBlend);
      const danceForearmLeft = mix(oldPose.forearmLeft, newPose.forearmLeft, poseBlend);
      const danceForearmRight = mix(oldPose.forearmRight, newPose.forearmRight, poseBlend);
      const danceLegLeft = mix(oldPose.legLeft, newPose.legLeft, poseBlend);
      const danceLegRight = mix(oldPose.legRight, newPose.legRight, poseBlend);
      const danceLowerLegLeft = mix(oldPose.lowerLegLeft, newPose.lowerLegLeft, poseBlend);
      const danceLowerLegRight = mix(oldPose.lowerLegRight, newPose.lowerLegRight, poseBlend);
      const profile = TRACK_PROFILES[currentTrack];

      const breath = Math.sin(elapsed * 1.25) * 0.012;
      const idleShift = Math.sin(elapsed * 0.73) * 2.15 * idleScale;
      const idleHead = Math.sin(elapsed * 0.51 + 0.8) * 1.35 * idleScale;
      const amount = performanceAmount * motionScale;
      const reaction = clamp((reactionUntil - now) / 620, 0, 1);
      const reactionCurve = Math.sin(reaction * Math.PI) * reactionScale;
      const rootX = idleShift * (1 - performanceAmount * 0.55) + dancePelvis * amount;
      const bounce = danceBounce * amount;
      const torsoRotation = (danceTorso + danceHip * 0.18) * amount + reactionCurve * reactionDirection * 5;
      const headRotation = idleHead + danceHead * amount + torsoRotation * 0.1 - reactionCurve * reactionDirection * 9;
      const rootVelocity = (rootX - previousRootX) / Math.max(delta, 0.001);
      previousRootX = rootX;
      const secondaryTarget = clamp(-rootVelocity * 0.035 - headRotation * 0.28, -8, 8) * secondaryScale;
      backHairFollow = damp(backHairFollow, secondaryTarget, 4.1, delta);
      frontHairFollow = damp(frontHairFollow, secondaryTarget * 0.72, 7.4, delta);
      strapFollow = damp(strapFollow, clamp(-rootVelocity * 0.02, -6, 6) * secondaryScale, 3.2, delta);

      if (now >= nextGaze) {
        gazeTarget = (Math.random() * 2 - 1) * 2.5;
        nextGaze = now + 1000 + Math.random() * 1800;
      }
      if (reaction > 0) gazeTarget = reactionDirection * 3;
      gaze = damp(gaze, gazeTarget, 3, delta);

      let blinkScale = 1;
      if (now >= nextBlink && !blinkStarted) blinkStarted = now;
      if (blinkStarted) {
        const blinkProgress = (now - blinkStarted) / 145;
        blinkScale = blinkProgress < 0.5 ? 1 - blinkProgress * 1.9 : 0.05 + (blinkProgress - 0.5) * 1.9;
        if (blinkProgress >= 1) {
          blinkStarted = 0;
          blinkScale = 1;
          nextBlink = now + 1800 + Math.random() * 3000;
        }
      }

      const posture = currentTrack === 2 ? -2.5 : currentTrack === 3 ? 1.8 : 0;
      apply(parts.torso, {
        x: rootX * 0.42,
        y: bounce + reactionCurve * -2,
        rotation: torsoRotation,
        scaleX: 1 + breath * 0.35,
        scaleY: 1 + breath + amount * 0.004,
      });
      apply(parts.head, {
        x: rootX * 0.28 + reactionCurve * reactionDirection * 2,
        y: bounce * 0.78 + posture,
        rotation: headRotation,
      });
      apply(parts.hairBack, { x: rootX * 0.2, y: bounce * 0.65, rotation: backHairFollow * 0.48 });
      apply(parts.hairLeft, { rotation: backHairFollow * 0.8 + Math.sin(elapsed * 1.1) * 1.3 * secondaryScale });
      apply(parts.hairRight, { rotation: backHairFollow * 0.72 - Math.sin(elapsed * 1.05) * 1.1 * secondaryScale });
      apply(parts.hairFrontLeft, { rotation: frontHairFollow * 0.48 });
      apply(parts.hairFrontRight, { rotation: frontHairFollow * 0.42 });

      apply(parts.armLeft, { x: rootX * 0.25, y: bounce * 0.72, rotation: (danceArmLeft + danceShoulderLeft) * amount - reactionCurve * 18 });
      apply(parts.armRight, { x: rootX * 0.25, y: bounce * 0.72, rotation: (danceArmRight + danceShoulderRight) * amount + reactionCurve * 13 });
      apply(parts.forearmLeft, { rotation: danceForearmLeft * amount - reactionCurve * 24 });
      apply(parts.forearmRight, { rotation: danceForearmRight * amount + reactionCurve * 18 });
      apply(parts.legLeft, { x: rootX * 0.24, y: bounce * 0.35, rotation: danceLegLeft * amount });
      apply(parts.legRight, { x: rootX * 0.24, y: bounce * 0.35, rotation: danceLegRight * amount });
      apply(parts.lowerLegLeft, { rotation: danceLowerLegLeft * amount });
      apply(parts.lowerLegRight, { rotation: danceLowerLegRight * amount });
      apply(parts.belt, { x: rootX * 0.3, y: bounce * 0.25, rotation: torsoRotation * 0.36 + danceHip * amount * 0.28 });
      apply(parts.strapLeft, { rotation: strapFollow * 0.55 + danceLegLeft * amount * 0.7 });
      apply(parts.strapRight, { rotation: strapFollow * 0.46 + danceLegRight * amount * 0.7 });
      apply(parts.groundShadow, { x: rootX * 0.18, scaleX: 1 - Math.abs(bounce) * 0.012, scaleY: 1 - Math.abs(bounce) * 0.02 });

      apply(parts.eyeLeft, { scaleY: clamp(blinkScale * profile.eye, 0.04, 1.2) });
      const wink = reaction > 0.35 && reactionDirection < 0 ? 0.18 : 1;
      apply(parts.eyeRight, { scaleY: clamp(blinkScale * profile.eye * wink, 0.04, 1.2) });
      apply(parts.pupilLeft, { x: gaze, y: Math.sin(elapsed * 0.41) * 0.35 });
      apply(parts.pupilRight, { x: gaze, y: Math.sin(elapsed * 0.41) * 0.35 });
      apply(parts.browLeft, { y: profile.brow, rotation: -profile.smile * 3 - (currentTrack === 2 ? 5 : 0) });
      apply(parts.browRight, { y: profile.brow, rotation: profile.smile * 3 + (currentTrack === 2 ? 5 : 0) });
      apply(parts.mouth, {
        y: -profile.smile * 0.35,
        rotation: -profile.smile * 0.5,
        scaleX: 1 + profile.smile * 0.065,
        scaleY: 1 - profile.smile * 0.025,
      });

      const vocal = now < vocalUntil && performanceAmount > 0.1;
      if (vocal) {
        const level = clamp(getAudioLevel() * 8.5, 0, 1);
        const sequence = ["M", "A", "E", "O", "A", "E"];
        const index = Math.floor(now / 76 + visemeSeed) % sequence.length;
        showViseme(level < 0.025 ? "M" : sequence[index]);
      } else {
        showViseme("rest");
      }

      parts.burst.style.opacity = String(reactionCurve * 0.95);
      apply(parts.burst, { x: reactionDirection * 5, y: -reactionCurve * 7, rotation: reactionDirection * reactionCurve * 14, scaleX: 0.8 + reactionCurve * 0.45, scaleY: 0.8 + reactionCurve * 0.45 });
      frameId = requestAnimationFrame(animate);
    }

    function react(event) {
      const bounds = svg.getBoundingClientRect();
      reactionDirection = event && event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
      reactionUntil = performance.now() + 650;
      nextBlink = performance.now() + 520;
    }

    svg.addEventListener("pointerdown", react);
    frameId = requestAnimationFrame(animate);

    return {
      setPerforming(performing) {
        performingTarget = performing ? 1 : 0;
      },
      setTrack(index) {
        const nextTrack = ((index % TRACK_PROFILES.length) + TRACK_PROFILES.length) % TRACK_PROFILES.length;
        if (nextTrack === currentTrack) return;
        previousTrack = currentTrack;
        currentTrack = nextTrack;
        trackBlend = 0;
      },
      setPulse({ step = 0, level = 0, downbeat = false } = {}) {
        const now = performance.now();
        pulseStep = Number.isFinite(step) ? Math.trunc(step) : 0;
        pulseTarget = clamp(Number.isFinite(level) ? level * 2.4 : 0, 0, 1);
        lastPulseAt = now;
        pulseDownbeatUntil = downbeat ? now + 170 : now;

        const beatsPerSecond = TRACK_PROFILES[currentTrack].bpm / 60;
        const currentBarBeat = ((elapsed + phaseCorrection) * beatsPerSecond) % 4;
        const targetBarBeat = (((pulseStep % 16) + 16) % 16) / 4;
        let beatError = targetBarBeat - currentBarBeat;
        if (beatError > 2) beatError -= 4;
        if (beatError < -2) beatError += 4;
        phaseCorrection = clamp(
          phaseCorrection + clamp(beatError / beatsPerSecond, -0.08, 0.08) * 0.28,
          -0.18,
          0.18,
        );
      },
      setVocal(vocal, _word, step = 0) {
        if (vocal) {
          vocalUntil = performance.now() + 175;
          visemeSeed = step;
        } else {
          vocalUntil = Math.min(vocalUntil, performance.now() + 34);
        }
      },
      react,
      getState() {
        return {
          fallback: false,
          performing: performingTarget === 1,
          performanceAmount,
          pulseLevel,
          track: currentTrack,
          emotion: TRACK_PROFILES[currentTrack].emotion,
          viseme: currentViseme,
          parts: Object.keys(parts).length,
          reducedMotion: reducedMotion.matches,
        };
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frameId);
        svg.removeEventListener("pointerdown", react);
      },
    };
  } catch (error) {
    console.warn("SVG performer rig fell back to the lightweight animated puppet.", error);
    return makeFallbackController(container);
  }
}
