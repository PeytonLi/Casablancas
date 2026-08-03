export const DETENT_ANGLES = Object.freeze([-48, 0, 48]);

const quarterNotes = (bpm, duration) => {
  const seconds = 60 / bpm;
  const timestamps = [];

  for (let at = seconds; at <= duration; at += seconds) {
    timestamps.push(Number(at.toFixed(6)));
  }

  return timestamps;
};

const freezePerformance = (performance) => Object.freeze({
  ...performance,
  colors: Object.freeze([...performance.colors]),
  lyrics: Object.freeze(performance.lyrics.map((fragment) => Object.freeze({ ...fragment }))),
  beats: Object.freeze(performance.beats.map((beat) => Object.freeze({ ...beat }))),
  effects: Object.freeze(performance.effects.map((effect) => Object.freeze({ ...effect }))),
});

const createPerformance = ({ bpm, duration, lyric, effectKind, ...performance }) => {
  const timestamps = quarterNotes(bpm, duration);
  const [firstLine, secondLine] = lyric.split(" / ");
  const halfway = Number((duration / 2).toFixed(3));

  return freezePerformance({
    ...performance,
    bpm,
    duration,
    lyric,
    lyrics: [
      { start: 0, end: halfway, text: firstLine },
      { start: halfway, end: duration, text: secondLine },
    ],
    beats: timestamps.map((at, index) => ({ at, strength: index % 4 === 0 ? 1 : 0.8 })),
    effects: timestamps
      .filter((_, index) => (index + 1) % 4 === 0)
      .map((at) => ({ at, duration: 0.18, kind: effectKind, strength: 0.9 })),
  });
};

export const PERFORMANCES = Object.freeze([
  createPerformance({
    id: "static-heart",
    number: "01",
    title: "STATIC HEART",
    bpm: 128,
    duration: 4.25,
    lyric: "Follow the glowing line / Lands End is right on time",
    colors: ["#ff304f", "#fff3f5"],
    pose: "/public/poses/pose-2.webp",
    video: "/public/performances/static-heart.mp4",
    effectKind: "flash",
  }),
  createPerformance({
    id: "afterimage",
    number: "02",
    title: "AFTERIMAGE",
    bpm: 104,
    duration: 4.9,
    lyric: "Fog turns gold / when the low lights bloom",
    colors: ["#794cff", "#2d7dff"],
    pose: "/public/poses/pose-3.webp",
    video: "/public/performances/afterimage.mp4",
    effectKind: "haze",
  }),
  createPerformance({
    id: "neon-fever",
    number: "03",
    title: "NEON FEVER",
    bpm: 140,
    duration: 3.85,
    lyric: "Left, right / red lights ignite",
    colors: ["#adff2f", "#ff2ea6"],
    pose: "/public/poses/pose-5.webp",
    video: "/public/performances/neon-fever.mp4",
    effectKind: "strobe",
  }),
]);

export function getPerformance(idOrIndex) {
  if (typeof idOrIndex === "number") return PERFORMANCES[idOrIndex];
  return PERFORMANCES.find((performance) => performance.id === idOrIndex);
}
