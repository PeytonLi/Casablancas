import {
  destroyMap,
  focusPlace,
  initMap,
  navigateToNearestRestroom,
  navigateToPlace,
  resetMapExperience,
  restartNavigation,
  searchPlaces,
  setCategoryFilter,
  startNavigation,
  toggleNavigation,
} from "./map.js?v=route-zoom-1";
import { CHARLIE_GREETING, createAskCharleyClient } from "./ask-charley.js";
import { createCharlieVoicePlayer } from "./charlie-voice.js";
import {
  getAudioLevel,
  getTracks,
  hasTrackSource,
  prepareTrackSources,
  startTrack,
  stopTrack,
} from "./music.js?v=radio-catalog-1";
import { createPerformerRig } from "./performer-rig.js";
import { initShowsView } from "./shows.js";
import { OFFICIAL_PREVIEW } from "./official-preview.js";

const tracks = getTracks();
const app = document.querySelector("#app");
const avatar = document.querySelector("#avatar");
const rigContainer = document.querySelector("#avatar-rig");
const lyric = document.querySelector("#lyric");
const trackList = document.querySelector("#track-list");
trackList.replaceChildren(...tracks.map((track, index) => {
  const button = document.createElement("button");
  button.id = `track-${index}`;
  button.className = `track-option${index === 0 ? " selected" : ""}`;
  button.type = "button";
  button.dataset.track = String(index);
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", String(index === 0));
  const label = document.createElement("span");
  label.textContent = track.title;
  button.append(label);
  return button;
}));
const trackButtons = [...document.querySelectorAll("[data-track]")];
const visualizer = document.querySelector("#visualizer");
const mapView = document.querySelector("#map-view");
const showsView = document.querySelector("#shows-view");
const mapContainer = document.querySelector("#map");
const routeHeading = document.querySelector("#route-heading");
const routeTime = document.querySelector("#route-time");
const routeCopy = document.querySelector("#route-copy");
const routeDistance = document.querySelector("#route-distance");
const routeDestination = document.querySelector(".navigation-metrics small");
const turnPath = document.querySelector("#turn-path");
const navigationStatus = document.querySelector("#navigation-status");
const navigationPrimary = document.querySelector("#navigation-primary");
const navigationRestart = document.querySelector("#navigation-restart");
const mapError = document.querySelector("#map-error");
const mapRetry = document.querySelector("#map-retry");
const mapSearch = document.querySelector("#map-search");
const mapSearchResults = document.querySelector("#map-search-results");
const mapCategoryChips = [...document.querySelectorAll("[data-map-category]")];
const mapPlaceCard = document.querySelector("#map-place-card");
const mapPlaceCategory = document.querySelector("#map-place-category");
const mapPlaceName = document.querySelector("#map-place-name");
const mapPlaceDescription = document.querySelector("#map-place-description");
const mapPlaceNavigate = document.querySelector("#map-place-navigate");
const mapPlaceClose = document.querySelector("#map-place-close");
const navButtons = [...document.querySelectorAll(".nav-button")];
const viewButtons = [...document.querySelectorAll("[data-view-target]")];
const toast = document.querySelector("#toast");
const askCharleyOpen = document.querySelector("#ask-charley-open");
const askCharleySheet = document.querySelector("#ask-charley-sheet");
const askCharleyClose = document.querySelector("#ask-charley-close");
const askCharleyQuestions = [...document.querySelectorAll("[data-charlie-question]")];
const askCharleyStatus = document.querySelector("#ask-charley-status");
const officialPreviewButton = document.querySelector("#official-360-preview");
const officialPreviewAudio = new Audio(OFFICIAL_PREVIEW.previewUrl);
officialPreviewAudio.preload = "none";
officialPreviewAudio.volume = 0.82;

let selectedTrack = 0;
let performanceActive = false;
let mapReady;
let toastTimer;
let playbackGeneration = 0;
let navigationState = "preview";
let selectedPlaceId = null;
let activeDestinationId = null;
let tunerSettleTimer;
let tunerSyncTimer;
let tunerSyncing = false;
let officialPreviewTimer;
let wheelLocked = false;
let pointerStartX = 0;
let pointerStartScroll = 0;
let tunerDragging = false;
let suppressTrackClick = false;
let askCharleyPending = false;

const rig = createPerformerRig(rigContainer, { getAudioLevel });
const askCharley = createAskCharleyClient();
const charlieVoice = createCharlieVoicePlayer();
const showsController = initShowsView(showsView);

for (let index = 0; index < 48; index += 1) {
  const bar = document.createElement("i");
  const height = 0.16 + ((Math.sin(index * 1.71) + 1) / 2) * 0.74;
  bar.style.setProperty("--h", height.toFixed(2));
  bar.style.setProperty("--delay", `${-(index % 9) * 47}ms`);
  visualizer.append(bar);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

function updateAskCharleyState() {
  askCharleyQuestions.forEach((button) => {
    button.disabled = askCharleyPending;
  });
}

async function speakCharlie(text) {
  try {
    await charlieVoice.speak(text);
  } catch {
    if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.03;
      window.speechSynthesis.speak(utterance);
    }
  }
}

function resetMapInterface() {
  selectedPlaceId = null;
  activeDestinationId = null;
  mapPlaceCard.hidden = true;
  mapSearch.value = "";
  mapSearchResults.replaceChildren();
  mapSearchResults.hidden = true;
  mapCategoryChips.forEach((chip) => {
    const selected = chip.dataset.mapCategory === "all";
    chip.classList.toggle("selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  setCategoryFilter("all");
  resetMapExperience();
  syncNavigationState("preview");
  routeHeading.textContent = "Head northeast";
  routeCopy.textContent = "Follow the Polo Field path toward Sutro Stage.";
  routeDestination.textContent = "to Sutro Stage";
  routeTime.textContent = "7 min";
  routeDistance.textContent = "0.4 mi";
  syncManeuver("straight");
}

function showDestinationRoute(place, description) {
  activeDestinationId = place.id;
  navigationStatus.textContent = "Navigating to";
  routeHeading.textContent = place.name;
  routeCopy.textContent = description ?? place.shortDescription ?? "Follow the highlighted route.";
  routeDestination.textContent = `to ${place.name}`;
  routeTime.textContent = `${place.routeEtaMinutes} min`;
  routeDistance.textContent = formatDistance(place.routeDistanceMeters);
  navigationPrimary.textContent = "Recenter route";
  navigationPrimary.disabled = false;
  mapPlaceCard.hidden = true;
}

async function openAskCharley() {
  await showView("home");
  resetMapInterface();
  stopOfficialPreview();
  stopPerformance();
  askCharleySheet.hidden = false;
  askCharleyOpen.setAttribute("aria-expanded", "true");
  askCharleyStatus.textContent = CHARLIE_GREETING;
  void speakCharlie(CHARLIE_GREETING);
  window.requestAnimationFrame(() => askCharleyQuestions[0]?.focus());
}

function closeAskCharley() {
  askCharleySheet.hidden = true;
  askCharleyOpen.setAttribute("aria-expanded", "false");
  askCharleyOpen.focus();
}

function formatDistance(meters) {
  const miles = meters / 1609.344;
  if (miles >= 0.1) return `${miles.toFixed(1)} mi`;
  return `${Math.max(0, Math.round((meters * 3.28084) / 10) * 10)} ft`;
}

function syncNavigationState(state) {
  navigationState = state;
  const labels = {
    preview: ["Route preview", "Start walking"],
    running: ["Walking to Sutro", "Pause"],
    paused: ["Navigation paused", "Resume"],
    arrived: ["You have arrived", "Walk again"],
  };
  const [status, action] = labels[state] ?? labels.preview;
  navigationStatus.textContent = status;
  navigationPrimary.textContent = action;
}

function syncManeuver(maneuver = "straight") {
  const paths = {
    straight: "M16 27V5m-7 7 7-7 7 7",
    left: "M26 25V14a5 5 0 0 0-5-5H9m5-5-5 5 5 5",
    right: "M6 25V14a5 5 0 0 1 5-5h12m-5-5 5 5-5 5",
    arrive: "M9 27V5m0 2h13l-3 5 3 5H9",
  };
  turnPath.setAttribute("d", paths[maneuver] ?? paths.straight);
}

function showPlace(place, { focus = true } = {}) {
  if (!place) return;
  selectedPlaceId = place.id;
  mapPlaceCategory.textContent = place.category;
  mapPlaceName.textContent = place.name;
  mapPlaceDescription.textContent = place.shortDescription ?? "Festival destination";
  mapPlaceCard.hidden = false;
  mapSearchResults.hidden = true;
  if (focus) focusPlace(place.id);
}

function renderPlaceResults(query = "") {
  const matches = searchPlaces(query).slice(0, 8);
  mapSearchResults.replaceChildren();
  for (const place of matches) {
    const button = document.createElement("button");
    button.className = "map-search-result";
    button.type = "button";
    button.setAttribute("role", "option");
    const icon = document.createElement("i");
    icon.textContent = place.category === "stage" ? "S" : place.category.slice(0, 1).toUpperCase();
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = place.name;
    const category = document.createElement("small");
    category.textContent = place.category;
    copy.append(name, category);
    button.append(icon, copy);
    button.addEventListener("click", () => showPlace(place));
    mapSearchResults.append(button);
  }
  mapSearchResults.hidden = matches.length === 0;
}

function updatePlaybackUi(playing) {
  performanceActive = playing;
  app.dataset.playing = String(playing);
  app.classList.toggle("mode-performing", playing);
  app.classList.toggle("mode-idle", !playing);
  avatar.dataset.state = playing ? "performing" : "idle";
  rig.setPerforming(playing);

  trackButtons.forEach((button, index) => {
    const title = tracks[index].title;
    const active = playing && index === selectedTrack;
    button.classList.toggle("playing", active);
    button.setAttribute("aria-label", active ? `Pause ${title}` : `Play ${title}`);
  });
}

function updateTrackUi(index) {
  selectedTrack = (index + tracks.length) % tracks.length;
  app.dataset.emotion = tracks[selectedTrack].emotion;
  rig.setTrack(tracks[selectedTrack].danceProfile);
  trackList.setAttribute("aria-activedescendant", `track-${selectedTrack}`);

  trackButtons.forEach((button, buttonIndex) => {
    const selected = buttonIndex === selectedTrack;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

function centerTrack(index, behavior = "smooth") {
  const button = trackButtons[index];
  if (!button) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior;
  const target = button.offsetLeft - (trackList.clientWidth - button.offsetWidth) / 2;
  tunerSyncing = true;
  trackList.scrollTo({ left: target, behavior: motion });
  window.clearTimeout(tunerSyncTimer);
  // Release after smooth scrolling actually goes quiet. The longer fallback
  // covers browsers that do not emit a final scroll event.
  tunerSyncTimer = window.setTimeout(() => {
    tunerSyncing = false;
  }, motion === "smooth" ? 900 : 40);
}

function nearestTunerTrack() {
  const center = trackList.scrollLeft + trackList.clientWidth / 2;
  return trackButtons.reduce((closestIndex, button, index) => {
    const buttonCenter = button.offsetLeft + button.offsetWidth / 2;
    const closestButton = trackButtons[closestIndex];
    const closestCenter = closestButton.offsetLeft + closestButton.offsetWidth / 2;
    return Math.abs(buttonCenter - center) < Math.abs(closestCenter - center) ? index : closestIndex;
  }, 0);
}

function onMusicPulse({ step, level, downbeat, vocal, word }) {
  rig.setPulse({ step, level, downbeat });
  rig.setVocal(vocal, word, step);
  lyric.textContent = "";
}

function nextAvailableTrack(fromIndex) {
  for (let offset = 1; offset <= tracks.length; offset += 1) {
    const candidate = (fromIndex + offset) % tracks.length;
    if (hasTrackSource(candidate)) return candidate;
  }
  return (fromIndex + 1) % tracks.length;
}

function updateOfficialPreviewUi(playing) {
  officialPreviewButton.setAttribute("aria-pressed", String(playing));
  officialPreviewButton.setAttribute(
    "aria-label",
    playing
      ? "Pause the official preview of 360 by Charli xcx"
      : "Play an official preview of 360 by Charli xcx",
  );
  officialPreviewButton.querySelector("small").textContent = playing ? "Playing preview" : "Official preview";
}

function stopOfficialPreview() {
  window.clearTimeout(officialPreviewTimer);
  officialPreviewAudio.pause();
  officialPreviewAudio.currentTime = 0;
  updateOfficialPreviewUi(false);
}

async function toggleOfficialPreview() {
  if (!officialPreviewAudio.paused) {
    stopOfficialPreview();
    return;
  }

  stopPerformance();
  officialPreviewAudio.currentTime = 0;
  try {
    await officialPreviewAudio.play();
    updateOfficialPreviewUi(true);
    officialPreviewTimer = window.setTimeout(stopOfficialPreview, OFFICIAL_PREVIEW.durationMs);
  } catch {
    stopOfficialPreview();
    showToast("The official preview could not play. Try again.");
  }
}

async function startPerformance() {
  if (app.dataset.view !== "home") return;
  stopOfficialPreview();
  const generation = ++playbackGeneration;
  const playingTrack = selectedTrack;
  updatePlaybackUi(true);

  let started;
  try {
    started = await startTrack(selectedTrack, onMusicPulse, () => {
      if (generation !== playbackGeneration) return;
      const nextTrack = nextAvailableTrack(playingTrack);
      updateTrackUi(nextTrack);
      centerTrack(selectedTrack);
      startPerformance();
    });
  } catch (error) {
    if (generation !== playbackGeneration) return;
    showToast("Audio is unavailable, but the performance continues.");
    return;
  }

  if (generation !== playbackGeneration || app.dataset.view !== "home") {
    stopTrack();
    return;
  }
  if (!started?.ok) showToast("Performance active while audio reconnects.");
}

function stopPerformance() {
  playbackGeneration += 1;
  stopTrack();
  rig.setVocal(false);
  lyric.textContent = "";
  updatePlaybackUi(false);
}

async function chooseTrack(index, start = true) {
  const nextTrack = (index + tracks.length) % tracks.length;
  const changed = selectedTrack !== nextTrack;
  updateTrackUi(index);
  centerTrack(selectedTrack);
  if (!start) return;
  // Scroll-settle and keyboard synchronization can select the already-active
  // track. Only requestTrack handles an intentional same-track pause; these
  // synchronization events must not kill or restart the performance.
  if (!changed && performanceActive) return;
  await startPerformance();
}

function requestTrack(index, { toggleActive = true } = {}) {
  const nextTrack = (index + tracks.length) % tracks.length;
  if (nextTrack === selectedTrack && performanceActive && toggleActive) {
    stopPerformance();
    return;
  }
  chooseTrack(nextTrack, true);
}

trackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (suppressTrackClick) return;
    const index = Number(button.dataset.track);
    requestTrack(index);
  });

  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (Number(button.dataset.track) + direction + tracks.length) % tracks.length;
    trackButtons[nextIndex].focus();
    requestTrack(nextIndex, { toggleActive: false });
  });
});

trackList.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === "ArrowRight" ? 1 : -1;
  requestTrack(selectedTrack + direction, { toggleActive: false });
});

trackList.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) return;
  event.preventDefault();
  if (wheelLocked) return;
  wheelLocked = true;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  requestTrack(selectedTrack + (delta > 0 ? 1 : -1), { toggleActive: false });
  window.setTimeout(() => {
    wheelLocked = false;
  }, 260);
}, { passive: false });

trackList.addEventListener("scroll", () => {
  if (tunerSyncing) {
    window.clearTimeout(tunerSyncTimer);
    tunerSyncTimer = window.setTimeout(() => {
      tunerSyncing = false;
    }, 140);
    return;
  }
  if (tunerDragging) return;
  window.clearTimeout(tunerSettleTimer);
  tunerSettleTimer = window.setTimeout(() => {
    const nextTrack = nearestTunerTrack();
    if (nextTrack !== selectedTrack) requestTrack(nextTrack, { toggleActive: false });
    else centerTrack(selectedTrack);
  }, 110);
}, { passive: true });

trackList.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  pointerStartX = event.clientX;
  pointerStartScroll = trackList.scrollLeft;
  tunerDragging = true;
  suppressTrackClick = false;
  trackList.setPointerCapture(event.pointerId);
});

trackList.addEventListener("pointermove", (event) => {
  if (!tunerDragging || event.pointerType === "touch") return;
  const delta = event.clientX - pointerStartX;
  if (Math.abs(delta) > 4) suppressTrackClick = true;
  trackList.scrollLeft = pointerStartScroll - delta;
});

function finishTunerDrag(event) {
  if (!tunerDragging) return;
  tunerDragging = false;
  if (trackList.hasPointerCapture(event.pointerId)) trackList.releasePointerCapture(event.pointerId);
  // A simple tap will immediately dispatch the option's click event. Let that
  // single event own playback toggling; snapping here as well starts and then
  // instantly pauses the same track.
  if (!suppressTrackClick) return;
  const nextTrack = nearestTunerTrack();
  if (nextTrack !== selectedTrack) requestTrack(nextTrack, { toggleActive: false });
  else centerTrack(selectedTrack);
  window.setTimeout(() => {
    suppressTrackClick = false;
  }, 0);
}

trackList.addEventListener("pointerup", finishTunerDrag);
trackList.addEventListener("pointercancel", finishTunerDrag);

async function showView(view) {
  const target = ["home", "map", "shows"].includes(view) ? view : "home";
  if (target !== "home") stopOfficialPreview();
  if (target !== "home") stopPerformance();
  if (target !== "home" && !askCharleySheet.hidden) closeAskCharley();
  if (target !== "map" && navigationState === "running") toggleNavigation();
  app.dataset.view = target;
  mapView.hidden = target !== "map";
  showsView.hidden = target !== "shows";

  navButtons.forEach((button) => {
    const selected = button.dataset.viewTarget === target;
    button.classList.toggle("selected", selected);
    if (selected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  if (target === "map") {
    navigationPrimary.disabled = true;
    navigationRestart.disabled = true;
    try {
      mapError.hidden = true;
      mapReady ??= initMap(mapContainer);
      await mapReady;
      resetMapInterface();
      navigationPrimary.disabled = false;
      navigationRestart.disabled = false;
    } catch (error) {
      mapReady = null;
      mapError.hidden = false;
      showToast(error instanceof Error ? error.message : "The navigation map could not load.");
      return false;
    }
  }
  return true;
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.viewTarget));
});

officialPreviewButton.addEventListener("click", toggleOfficialPreview);
officialPreviewAudio.addEventListener("ended", stopOfficialPreview);
officialPreviewAudio.addEventListener("error", () => {
  if (officialPreviewButton.getAttribute("aria-pressed") === "true") {
    stopOfficialPreview();
    showToast("The official preview could not play. Try again.");
  }
});

showsView.addEventListener("showroute", async (event) => {
  const stageId = event.detail?.stageId;
  if (!stageId) return;
  const mapLoaded = await showView("map");
  if (!mapLoaded) return;
  const place = navigateToPlace(stageId);
  if (!place) {
    showToast("That stage is not mapped yet.");
    return;
  }
  showDestinationRoute(place);
});

async function askCharlieQuestion(question) {
  if (askCharleyPending || !question) return;

  askCharleyPending = true;
  updateAskCharleyState();
  askCharleyStatus.textContent = "Asking Charlie…";

  try {
    const reply = await askCharley.ask(question);
    askCharleySheet.dataset.destination = reply.dest;
    askCharleyStatus.textContent = reply.speech;
    await speakCharlie(reply.speech);

    if (reply.dest === "lands-end-restrooms") {
      const mapLoaded = await showView("map");
      if (!mapLoaded) return;
      const place = navigateToNearestRestroom();
      if (place) {
        showDestinationRoute(place, "Follow the highlighted route to the nearest restroom.");
      }
    } else if (reply.dest === "shows") {
      await showView("shows");
    }
  } catch (error) {
    askCharleyStatus.textContent = error instanceof Error ? error.message : "Charlie is reconnecting.";
  } finally {
    askCharleyPending = false;
    updateAskCharleyState();
  }
}

askCharleyOpen.addEventListener("click", openAskCharley);
askCharleyClose.addEventListener("click", closeAskCharley);
askCharleyQuestions.forEach((button) => {
  button.addEventListener("click", () => askCharlieQuestion(button.dataset.charlieQuestion));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !askCharleySheet.hidden) closeAskCharley();
});

navigationPrimary.addEventListener("click", () => {
  if (activeDestinationId) {
    const place = navigateToPlace(activeDestinationId);
    if (place) showDestinationRoute(place);
    return;
  }
  if (navigationState === "preview" || navigationState === "arrived") startNavigation();
  else toggleNavigation();
});

navigationRestart.addEventListener("click", () => {
  activeDestinationId = null;
  restartNavigation();
  navigationPrimary.disabled = false;
});

mapRetry.addEventListener("click", async () => {
  mapError.hidden = true;
  navigationPrimary.disabled = true;
  navigationRestart.disabled = true;
  try {
    destroyMap();
    mapReady = initMap(mapContainer);
    await mapReady;
    navigationPrimary.disabled = false;
    navigationRestart.disabled = false;
  } catch (error) {
    mapReady = null;
    mapError.hidden = false;
    showToast(error instanceof Error ? error.message : "The navigation map could not load.");
  }
});

mapSearch.addEventListener("input", () => renderPlaceResults(mapSearch.value));
mapSearch.addEventListener("focus", () => renderPlaceResults(mapSearch.value));

mapCategoryChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const category = chip.dataset.mapCategory;
    mapCategoryChips.forEach((candidate) => {
      const selected = candidate === chip;
      candidate.classList.toggle("selected", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
    setCategoryFilter(category);
    renderPlaceResults(category === "all" ? "" : category);
  });
});

mapPlaceClose.addEventListener("click", () => {
  selectedPlaceId = null;
  mapPlaceCard.hidden = true;
});

mapPlaceNavigate.addEventListener("click", () => {
  if (!selectedPlaceId) return;
  const place = navigateToPlace(selectedPlaceId);
  if (!place) return;
  showDestinationRoute(place);
});

mapContainer.addEventListener("placeselected", (event) => showPlace(event.detail, { focus: false }));

mapContainer.addEventListener("navigationframe", (event) => {
  const frame = event.detail;
  routeHeading.textContent = frame.instruction?.title ?? "Continue to Sutro Stage";
  routeCopy.textContent = frame.instruction?.detail
    ?? frame.instruction?.instruction
    ?? frame.instruction?.text
    ?? frame.instruction
    ?? "Continue toward Sutro Stage.";
  syncManeuver(frame.instruction?.maneuver);
  routeTime.textContent = `${Math.max(1, frame.etaMinutes)} min`;
  routeDistance.textContent = formatDistance(frame.remainingDistanceMeters);
});

mapContainer.addEventListener("navigationstate", (event) => {
  const state = event.detail?.state ?? "preview";
  syncNavigationState(state);
  if (state === "arrived") {
    routeHeading.textContent = "Sutro Stage is ahead";
    routeCopy.textContent = "You made it. The stage entrance is directly ahead.";
    routeTime.textContent = "Arrived";
    routeDistance.textContent = "0 ft";
    syncManeuver("arrive");
  } else if (state === "preview") {
    routeHeading.textContent = "Head northeast";
    routeCopy.textContent = "Follow the Polo Field path toward Sutro Stage.";
    syncManeuver("straight");
  }
});

mapContainer.addEventListener("navigationerror", (event) => {
  mapError.hidden = false;
  showToast(event.detail?.message ?? "The navigation map could not load.");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  if (performanceActive) stopPerformance();
  stopOfficialPreview();
});

window.addEventListener("beforeunload", () => {
  stopOfficialPreview();
  stopPerformance();
  showsController.destroy();
  destroyMap();
  rig.destroy();
});

updateTrackUi(0);
updatePlaybackUi(false);
updateOfficialPreviewUi(false);
syncNavigationState("preview");
prepareTrackSources();
window.requestAnimationFrame(() => centerTrack(0, "auto"));
