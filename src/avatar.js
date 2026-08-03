export const AVATAR_STATES = Object.freeze([
  "idle-pose",
  "dial-preview",
  "performance-loading",
  "performance-enter",
  "performance-playing",
  "performance-paused",
  "performance-exit",
  "stopping",
]);

export function reduceAvatar(state, event) {
  if (event.type === "PREVIEW" && ["idle-pose", "dial-preview"].includes(state.mode)) {
    return Object.freeze({ ...state, mode: "dial-preview", songIndex: event.songIndex });
  }
  if (event.type === "RELEASE" && state.mode === "dial-preview") {
    return Object.freeze({ mode: "performance-loading", songIndex: state.songIndex, energy: 20 });
  }
  if (event.type === "MEDIA_READY" && state.mode === "performance-loading") return Object.freeze({ ...state, mode: "performance-enter" });
  if (event.type === "ENTERED" && state.mode === "performance-enter") return Object.freeze({ ...state, mode: "performance-playing" });
  if (event.type === "TOGGLE_PAUSE" && state.mode === "performance-playing") return Object.freeze({ ...state, mode: "performance-paused" });
  if (event.type === "TOGGLE_PAUSE" && state.mode === "performance-paused") return Object.freeze({ ...state, mode: "performance-playing" });
  if (event.type === "ENERGY" && ["performance-playing", "performance-paused"].includes(state.mode)) return Object.freeze({ ...state, energy: Math.max(0, Math.min(100, event.value)) });
  if (event.type === "ENDED") return Object.freeze({ ...state, mode: "performance-exit" });
  if (event.type === "EXITED" || event.type === "CHOOSE") return Object.freeze({ mode: "idle-pose", songIndex: state.songIndex, energy: 20 });
  if (event.type === "MEDIA_ERROR") return Object.freeze({ mode: "idle-pose", songIndex: state.songIndex, energy: 20, error: "TRY ANOTHER" });
  return state;
}

export function createAvatarMachine(onChange) {
  let state = Object.freeze({ mode: "idle-pose", songIndex: 0, energy: 20 });
  const subscribers = new Set();

  if (typeof onChange === "function") subscribers.add(onChange);

  return Object.freeze({
    getState: () => state,
    send(event) {
      const previousState = state;
      const nextState = reduceAvatar(state, event);

      if (nextState !== previousState) {
        state = nextState;
        subscribers.forEach((subscriber) => subscriber(state, previousState, event));
      }

      return state;
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  });
}
