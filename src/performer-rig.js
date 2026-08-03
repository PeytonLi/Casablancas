const SVG_NS = "http://www.w3.org/2000/svg";

const TRACK_PROFILES = [
  { emotion: "confident", bpm: 128, brow: -1, eye: 0.96, smile: 0.1 },
  { emotion: "playful", bpm: 132, brow: 1.2, eye: 1.08, smile: 0.8 },
  { emotion: "intense", bpm: 124, brow: -3, eye: 0.82, smile: -0.25 },
  { emotion: "euphoric", bpm: 136, brow: 2.4, eye: 1.14, smile: 1 },
];

const DANCE_MOVE_COUNT = 5;

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

function baseDancePose(trackIndex, beat, half, hit) {
  if (trackIndex === 1) {
    return {
      hip: Math.sin(half) * 5.2,
      bounce: -hit * 5.5,
      torso: Math.sin(half + 0.4) * 4.5,
      head: Math.sin(beat + 0.2) * 4.8,
      armLeft: -7 + Math.sin(beat) * 15,
      armRight: 8 - Math.sin(beat + 0.5) * 15,
      forearmLeft: 10 + Math.sin(half) * 18,
      forearmRight: -10 - Math.sin(half + 0.4) * 18,
      legLeft: Math.sin(half) * 4,
      legRight: -Math.sin(half) * 4,
    };
  }

  if (trackIndex === 2) {
    return {
      hip: Math.sin(beat) * 2.6,
      bounce: -hit * 7,
      torso: -4 + Math.sin(half) * 2.2,
      head: Math.sin(beat) * 2.5,
      armLeft: 9 + Math.sin(beat) * 7,
      armRight: -9 - Math.sin(beat) * 7,
      forearmLeft: -19 + hit * 12,
      forearmRight: 19 - hit * 12,
      legLeft: hit * 5,
      legRight: (1 - hit) * -5,
    };
  }

  if (trackIndex === 3) {
    return {
      hip: Math.sin(half) * 6.5,
      bounce: -hit * 8,
      torso: Math.sin(half) * 5,
      head: Math.sin(half + 0.7) * 5.2,
      armLeft: -28 + Math.sin(beat) * 12,
      armRight: 28 - Math.sin(beat + 0.35) * 12,
      forearmLeft: -18 + Math.cos(beat) * 16,
      forearmRight: 18 - Math.cos(beat + 0.35) * 16,
      legLeft: Math.sin(half) * 5,
      legRight: -Math.sin(half) * 5,
    };
  }

  return {
    hip: Math.sin(half) * 4.2,
    bounce: -hit * 3.5,
    torso: Math.sin(half + 0.3) * 3,
    head: Math.sin(beat + 0.5) * 2.8,
    armLeft: 3 + Math.sin(half) * 8,
    armRight: -3 - Math.sin(half + 0.4) * 8,
    forearmLeft: Math.sin(beat) * 8,
    forearmRight: -Math.sin(beat + 0.4) * 8,
    legLeft: Math.sin(half) * 2.8,
    legRight: -Math.sin(half) * 2.8,
  };
}

function danceAccent(trackIndex, move, beat, half, hit) {
  const wave = Math.sin(half);
  const snap = Math.sin(beat);
  const counter = Math.cos(half);
  const punch = Math.cos(beat);
  const accents = [
    [
      // 360 / confident: runway walk
      { hip: wave * 5, bounce: -hit * 2, torso: -wave * 2, head: wave * 1.5, armLeft: -8 + snap * 7, armRight: 8 - snap * 7, forearmLeft: 12 + punch * 5, forearmRight: -12 - punch * 5, legLeft: wave * 7, legRight: -wave * 7 },
      // Shoulder roll with hands held high
      { hip: counter * 3, bounce: -hit * 3, torso: snap * 6, head: -snap * 4.5, armLeft: -27 + wave * 6, armRight: 27 - wave * 6, forearmLeft: -31 + snap * 8, forearmRight: 31 - snap * 8, legLeft: -counter * 4, legRight: counter * 4 },
      // Low body roll
      { hip: wave * 7, bounce: 2 - hit * 5, torso: -7 + counter * 5, head: 4 - counter * 3, armLeft: 18 + snap * 5, armRight: -18 - snap * 5, forearmLeft: -22 + wave * 10, forearmRight: 22 - wave * 10, legLeft: 5 + snap * 2, legRight: -5 - snap * 2 },
      // Sharp power hits
      { hip: snap * 4, bounce: -hit * 7, torso: snap * 8, head: -snap * 6, armLeft: -12 + punch * 20, armRight: 12 - punch * 20, forearmLeft: -35 + hit * 18, forearmRight: 35 - hit * 18, legLeft: snap * 6, legRight: -snap * 6 },
      // Side point and hair-toss silhouette
      { hip: counter * 6, bounce: -hit * 3, torso: -counter * 6, head: counter * 8, armLeft: -40 + snap * 8, armRight: 33 + snap * 5, forearmLeft: -28 + punch * 8, forearmRight: -36 - punch * 7, legLeft: counter * 7, legRight: -counter * 4 },
    ],
    [
      // Von dutch / playful: alternating arm pumps
      { hip: wave * 5, bounce: -hit * 4, torso: snap * 4, head: -snap * 6, armLeft: snap * 24, armRight: -snap * 24, forearmLeft: 19 - punch * 13, forearmRight: -19 + punch * 13, legLeft: wave * 6, legRight: -wave * 6 },
      // Peekaboo face frame
      { hip: counter * 4, bounce: -hit * 2, torso: -wave * 7, head: snap * 10, armLeft: -31 + snap * 6, armRight: 31 - snap * 6, forearmLeft: -48 + hit * 12, forearmRight: 48 - hit * 12, legLeft: -counter * 5, legRight: counter * 5 },
      // Overhead bounce
      { hip: snap * 3, bounce: -hit * 9, torso: -snap * 4, head: snap * 3, armLeft: -52 + wave * 8, armRight: 52 - wave * 8, forearmLeft: -23 + punch * 10, forearmRight: 23 - punch * 10, legLeft: snap * 7, legRight: -snap * 7 },
      // Disco point
      { hip: wave * 7, bounce: -hit * 3, torso: wave * 6, head: -wave * 7, armLeft: -9 + snap * 7, armRight: 48 + snap * 7, forearmLeft: 23 - punch * 8, forearmRight: -42 - punch * 7, legLeft: wave * 8, legRight: -wave * 4 },
      // Skipping kick with open arms
      { hip: counter * 5, bounce: -hit * 7, torso: counter * 5, head: -counter * 4, armLeft: -35 + snap * 14, armRight: 35 - snap * 14, forearmLeft: 24 + punch * 8, forearmRight: -24 - punch * 8, legLeft: 4 + hit * 7, legRight: -4 - hit * 7 },
    ],
    [
      // Apple / intense: heavy stomp
      { hip: snap * 3, bounce: -hit * 9, torso: -5 + punch * 3, head: -punch * 4, armLeft: 16 - hit * 10, armRight: -16 + hit * 10, forearmLeft: -28 + snap * 9, forearmRight: 28 - snap * 9, legLeft: hit * 9, legRight: -hit * 6 },
      // Cross-body punches
      { hip: wave * 4, bounce: -hit * 4, torso: snap * 9, head: -snap * 6, armLeft: -29 + punch * 14, armRight: 29 - punch * 14, forearmLeft: -46 + hit * 13, forearmRight: 46 - hit * 13, legLeft: -wave * 6, legRight: wave * 6 },
      // Low crouched prowl
      { hip: counter * 5, bounce: 5 - hit * 3, torso: -11 + wave * 4, head: 6 - wave * 3, armLeft: 27 + snap * 7, armRight: -27 - snap * 7, forearmLeft: -16 + counter * 8, forearmRight: 16 - counter * 8, legLeft: 7 + snap * 3, legRight: -7 - snap * 3 },
      // Mechanical body hits
      { hip: snap * 6, bounce: -hit * 6, torso: snap * 10, head: -snap * 8, armLeft: snap * 25, armRight: -snap * 25, forearmLeft: -22 + punch * 20, forearmRight: 22 - punch * 20, legLeft: snap * 8, legRight: -snap * 8 },
      // Marching kick and diagonal guard
      { hip: wave * 3, bounce: -hit * 7, torso: -wave * 7, head: wave * 5, armLeft: -38 + snap * 9, armRight: 19 - snap * 8, forearmLeft: -34 + punch * 8, forearmRight: 39 - punch * 10, legLeft: 5 + hit * 9, legRight: -5 - hit * 9 },
    ],
    [
      // Club classics / euphoric: hands-up anthem bounce
      { hip: wave * 4, bounce: -hit * 8, torso: -snap * 4, head: snap * 5, armLeft: -52 + snap * 7, armRight: 52 - snap * 7, forearmLeft: -27 + punch * 10, forearmRight: 27 - punch * 10, legLeft: wave * 7, legRight: -wave * 7 },
      // Two-foot jump illusion
      { hip: snap * 3, bounce: -hit * 13, torso: -wave * 5, head: wave * 6, armLeft: -34 + hit * 13, armRight: 34 - hit * 13, forearmLeft: -38 + snap * 11, forearmRight: 38 - snap * 11, legLeft: hit * 9, legRight: -hit * 9 },
      // Sweeping festival sway
      { hip: wave * 9, bounce: -hit * 4, torso: wave * 8, head: -wave * 8, armLeft: -23 + snap * 23, armRight: 23 - snap * 23, forearmLeft: -43 + counter * 9, forearmRight: 43 - counter * 9, legLeft: wave * 8, legRight: -wave * 8 },
      // Star-pose body hits
      { hip: snap * 6, bounce: -hit * 8, torso: snap * 10, head: -snap * 9, armLeft: -48 + punch * 10, armRight: 48 - punch * 10, forearmLeft: 20 - hit * 12, forearmRight: -20 + hit * 12, legLeft: snap * 9, legRight: -snap * 9 },
      // Turning arms and heel steps
      { hip: counter * 8, bounce: -hit * 6, torso: -counter * 9, head: counter * 10, armLeft: -41 + wave * 18, armRight: 16 + wave * 18, forearmLeft: -29 + punch * 14, forearmRight: -41 - punch * 14, legLeft: counter * 9, legRight: -counter * 9 },
    ],
  ];

  const accent = accents[trackIndex][move];
  return {
    hip: accent.hip ?? 0,
    bounce: accent.bounce ?? 0,
    torso: accent.torso ?? 0,
    head: accent.head ?? 0,
    armLeft: accent.armLeft ?? 0,
    armRight: accent.armRight ?? 0,
    forearmLeft: accent.forearmLeft ?? 0,
    forearmRight: accent.forearmRight ?? 0,
    legLeft: accent.legLeft ?? 0,
    legRight: accent.legRight ?? 0,
  };
}

function dancePose(trackIndex, time) {
  const profile = TRACK_PROFILES[trackIndex];
  const beat = time * (profile.bpm / 60) * Math.PI * 2;
  const half = beat * 0.5;
  const hit = Math.abs(Math.sin(beat));
  const phraseSeconds = (60 / profile.bpm) * 8;
  const phrasePosition = time / phraseSeconds;
  const move = Math.floor(phrasePosition) % DANCE_MOVE_COUNT;
  const previousMove = (move + DANCE_MOVE_COUNT - 1) % DANCE_MOVE_COUNT;
  const transition = smoothstep((phrasePosition % 1) / 0.16);
  const previousAccent = danceAccent(trackIndex, previousMove, beat, half, hit);
  const currentAccent = danceAccent(trackIndex, move, beat, half, hit);
  const accent = blendPose(previousAccent, currentAccent, transition);
  const base = baseDancePose(trackIndex, beat, half, hit);

  return Object.fromEntries(Object.keys(base).map((key) => [key, base[key] + accent[key]]));
}

function blendPose(previous, current, amount) {
  return Object.fromEntries(Object.keys(current).map((key) => [key, mix(previous[key], current[key], amount)]));
}

function makeFallbackController(container) {
  container.innerHTML = FALLBACK_MARKUP;
  container.classList.add("using-fallback");
  return {
    setPerforming(performing) { container.classList.toggle("fallback-performing", performing); },
    setTrack(index) { container.dataset.fallbackTrack = String(index); },
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
    let hairFollow = 0;
    let previousHip = 0;
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

      performanceAmount = damp(performanceAmount, performingTarget, performingTarget ? 4.8 : 2.6, delta);
      trackBlend = clamp(trackBlend + delta * 2.8, 0, 1);
      const oldPose = dancePose(previousTrack, elapsed);
      const newPose = dancePose(currentTrack, elapsed);
      const dance = blendPose(oldPose, newPose, smoothstep(trackBlend));
      const profile = TRACK_PROFILES[currentTrack];

      const breath = Math.sin(elapsed * 1.72) * 0.012;
      const idleShift = Math.sin(elapsed * 0.73) * 2.15;
      const idleHead = Math.sin(elapsed * 0.51 + 0.8) * 1.35;
      const amount = performanceAmount * motionScale;
      const reaction = clamp((reactionUntil - now) / 620, 0, 1);
      const reactionCurve = Math.sin(reaction * Math.PI);
      const hip = idleShift * (1 - performanceAmount * 0.55) + dance.hip * amount;
      const bounce = dance.bounce * amount;
      const torsoRotation = dance.torso * amount + reactionCurve * reactionDirection * 5;
      const headRotation = idleHead + dance.head * amount - reactionCurve * reactionDirection * 9;
      const hipVelocity = (hip - previousHip) / Math.max(delta, 0.001);
      previousHip = hip;
      hairFollow = damp(hairFollow, clamp(-hipVelocity * 0.035 - headRotation * 0.28, -8, 8), 5.2, delta);

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
        x: hip * 0.42,
        y: bounce + reactionCurve * -2,
        rotation: torsoRotation,
        scaleX: 1 + breath * 0.35,
        scaleY: 1 + breath + amount * 0.004,
      });
      apply(parts.head, {
        x: hip * 0.28 + reactionCurve * reactionDirection * 2,
        y: bounce * 0.78 + posture,
        rotation: headRotation,
      });
      apply(parts.hairBack, { x: hip * 0.2, y: bounce * 0.65, rotation: hairFollow * 0.48 });
      apply(parts.hairLeft, { rotation: hairFollow * 0.8 + Math.sin(elapsed * 1.1) * 1.3 });
      apply(parts.hairRight, { rotation: hairFollow * 0.72 - Math.sin(elapsed * 1.05) * 1.1 });
      apply(parts.hairFrontLeft, { rotation: hairFollow * 0.38 });
      apply(parts.hairFrontRight, { rotation: hairFollow * 0.33 });

      apply(parts.armLeft, { x: hip * 0.25, y: bounce * 0.72, rotation: dance.armLeft * amount - reactionCurve * 18 });
      apply(parts.armRight, { x: hip * 0.25, y: bounce * 0.72, rotation: dance.armRight * amount + reactionCurve * 13 });
      apply(parts.forearmLeft, { rotation: dance.forearmLeft * amount - reactionCurve * 24 });
      apply(parts.forearmRight, { rotation: dance.forearmRight * amount + reactionCurve * 18 });
      apply(parts.legLeft, { x: hip * 0.24, y: bounce * 0.35, rotation: dance.legLeft * amount });
      apply(parts.legRight, { x: hip * 0.24, y: bounce * 0.35, rotation: dance.legRight * amount });
      apply(parts.lowerLegLeft, { rotation: -dance.legLeft * amount * 0.55 });
      apply(parts.lowerLegRight, { rotation: -dance.legRight * amount * 0.55 });
      apply(parts.belt, { x: hip * 0.3, y: bounce * 0.25, rotation: torsoRotation * 0.36 });
      apply(parts.strapLeft, { rotation: hairFollow * 0.45 + dance.legLeft * amount * 0.7 });
      apply(parts.strapRight, { rotation: hairFollow * 0.38 + dance.legRight * amount * 0.7 });
      apply(parts.groundShadow, { x: hip * 0.18, scaleX: 1 - Math.abs(bounce) * 0.012, scaleY: 1 - Math.abs(bounce) * 0.02 });

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
