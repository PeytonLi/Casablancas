import { OUTSIDE_LANDS_2026 } from "../data/outside-lands-2026.js";
import { FESTIVAL_PLACES } from "../data/festival-places.js";
import {
  analyzePlan,
  filterSchedule,
  formatClock,
  recommendGap,
  sanitizeSavedIds,
} from "./show-planner.js";

export const SHOWS_STORAGE_KEY = "casablancas:outside-lands-2026:saved";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const OFFICIAL_SCHEDULE_URL = "https://sfoutsidelands.com/schedule/";

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validSchedule(schedule) {
  if (!schedule || typeof schedule !== "object"
    || !Array.isArray(schedule.eventDates) || schedule.eventDates.length === 0
    || !Array.isArray(schedule.sets) || schedule.sets.length === 0
    || typeof schedule.timeZone !== "string"
    || typeof schedule.updatedAt !== "string"
    || !Number.isFinite(Date.parse(schedule.updatedAt))
    || schedule.sourceUrl !== OFFICIAL_SCHEDULE_URL) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: schedule.timeZone }).format(new Date());
  } catch {
    return false;
  }

  const dates = new Set(schedule.eventDates);
  const ids = new Set();
  if (dates.size !== schedule.eventDates.length
    || [...dates].some((day) => !isCalendarDate(day))) return false;

  return schedule.sets.every((set) => {
    const valid = set && typeof set === "object"
      && typeof set.id === "string" && set.id.length > 0
      && typeof set.artist === "string" && set.artist.length > 0
      && dates.has(set.day)
      && TIME_PATTERN.test(set.startTime) && TIME_PATTERN.test(set.endTime)
      && set.startTime < set.endTime
      && (set.stageId === null || typeof set.stageId === "string")
      && typeof set.stageName === "string" && set.stageName.length > 0
      && set.sourceUrl === OFFICIAL_SCHEDULE_URL;
    if (!valid || ids.has(set.id)) return false;
    ids.add(set.id);
    return true;
  });
}

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setButton(document, label, action, value, className = "") {
  const button = el(document, "button", className, label);
  button.type = "button";
  button.dataset.showsAction = action;
  if (value !== undefined) button.dataset.showsValue = value;
  return button;
}

function minutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function festivalNow(value, timeZone) {
  const resolved = typeof value === "function" ? value() : value;
  const date = resolved instanceof Date ? resolved : new Date(resolved);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    clock: `${part("hour")}:${part("minute")}`,
  };
}

function dayLabel(day) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${day}T12:00:00Z`));
}

function updatedLabel(updatedAt) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Snapshot date unavailable";
  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date)}`;
}

function conflictKey(conflict) {
  return `${conflict.currentId}:${conflict.nextId}`;
}

export function initShowsView(root, {
  schedule = OUTSIDE_LANDS_2026,
  places = FESTIVAL_PLACES,
  storage,
  now = () => new Date(),
} = {}) {
  if (!root) throw new TypeError("initShowsView requires a root element.");

  const document = root.ownerDocument;
  const view = document.defaultView ?? globalThis;
  const days = root.querySelector("#shows-days");
  const search = root.querySelector("#shows-search");
  const stage = root.querySelector("#shows-stage");
  const planTitle = root.querySelector("#shows-plan-title");
  const planContent = root.querySelector("#shows-plan-content");
  const list = root.querySelector("#shows-list");
  const updated = root.querySelector("#shows-updated");
  const live = root.querySelector("#shows-live");
  const required = [days, search, stage, planTitle, planContent, list, updated, live];
  if (required.some((outlet) => !outlet)) throw new TypeError("Shows view is missing a required outlet.");

  const isValid = validSchedule(schedule);
  const state = {
    day: isValid ? schedule.eventDates[0] : null,
    stageId: "all",
    query: "",
    expandedId: null,
    savedIds: [],
    collapsedConflicts: new Set(),
    savedSweepId: null,
  };
  let transitionTimer;
  let sweepTimer;
  let announceTimer;
  let destroyed = false;
  let resolvedStorage = storage;

  if (resolvedStorage === undefined) {
    try {
      resolvedStorage = globalThis.localStorage;
    } catch {
      resolvedStorage = null;
    }
  }

  try {
    const stored = JSON.parse(resolvedStorage?.getItem(SHOWS_STORAGE_KEY) ?? "[]");
    state.savedIds = isValid ? sanitizeSavedIds(stored, schedule.sets) : [];
  } catch {
    state.savedIds = [];
  }

  function announce(message) {
    live.textContent = "";
    view.clearTimeout?.(announceTimer);
    announceTimer = view.setTimeout?.(() => {
      if (!destroyed) live.textContent = message;
    }, 0);
  }

  function persist() {
    try {
      resolvedStorage?.setItem(SHOWS_STORAGE_KEY, JSON.stringify(state.savedIds));
    } catch {
      // Planning stays available when browser storage is blocked or full.
    }
  }

  function renderUnavailable() {
    days.replaceChildren();
    stage.replaceChildren();
    search.disabled = true;
    stage.disabled = true;
    planTitle.textContent = "Schedule unavailable";
    planContent.replaceChildren();
    const message = el(document, "div", "shows-empty");
    message.append(
      el(document, "strong", "", "Schedule unavailable"),
      el(document, "span", "", "Use the official schedule link below."),
    );
    list.replaceChildren(message);
    updated.textContent = "Local schedule unavailable";
  }

  function renderDays() {
    const fragment = document.createDocumentFragment();
    for (const day of schedule.eventDates) {
      const button = setButton(document, dayLabel(day), "day", day, "shows-day");
      const selected = day === state.day;
      button.setAttribute("aria-pressed", String(selected));
      if (selected) button.classList.add("selected");
      const date = el(document, "span", "", new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${day}T12:00:00Z`)));
      button.append(date);
      fragment.append(button);
    }
    days.replaceChildren(fragment);
  }

  function stageChoices() {
    const choices = new Map();
    for (const set of schedule.sets) {
      const value = set.stageId ?? `unmapped:${set.stageName}`;
      if (!choices.has(value)) choices.set(value, set.stageName);
    }
    return [...choices].sort((left, right) => left[1].localeCompare(right[1]));
  }

  function renderStages() {
    const fragment = document.createDocumentFragment();
    const all = el(document, "option", "", "All stages");
    all.value = "all";
    fragment.append(all);
    for (const [value, label] of stageChoices()) {
      const option = el(document, "option", "", label);
      option.value = value;
      fragment.append(option);
    }
    stage.replaceChildren(fragment);
    stage.value = state.stageId;
  }

  function currentVisibleSets() {
    const selectedStage = state.stageId.startsWith("unmapped:") ? "all" : state.stageId;
    const filtered = filterSchedule(schedule.sets, {
      day: state.day,
      query: state.query,
      stageId: selectedStage,
    });
    if (!state.stageId.startsWith("unmapped:")) return filtered;
    return filtered.filter((set) => `unmapped:${set.stageName}` === state.stageId);
  }

  function selectedDayStatusById() {
    const sets = filterSchedule(schedule.sets, { day: state.day });
    const current = festivalNow(now, schedule.timeZone);
    const result = new Map();
    let nextId = null;

    for (const set of sets) {
      const hasEnded = current && (set.day < current.day
        || (set.day === current.day && set.endTime <= current.clock));
      const isNow = current && set.day === current.day
        && set.startTime <= current.clock && current.clock < set.endTime;
      if (hasEnded) result.set(set.id, "Ended");
      else if (isNow) result.set(set.id, "Now");
      else if (!nextId) {
        nextId = set.id;
        result.set(set.id, "Next");
      } else result.set(set.id, "Later");
    }
    return result;
  }

  function renderRowDetails(set, saved, routeEnabled) {
    const details = el(document, "div", "show-details");
    const actions = el(document, "div", "show-actions");
    const save = setButton(document, saved ? "Saved" : "Save", "save", set.id, "show-save");
    save.setAttribute("aria-pressed", String(saved));
    const route = setButton(document, "Route me there", "route", set.id, "show-route");
    if (!routeEnabled) {
      route.disabled = true;
      route.title = "Stage location is not mapped yet";
    }
    const source = el(document, "a", "show-official", "Official schedule");
    source.href = set.sourceUrl;
    source.target = "_blank";
    source.rel = "noreferrer";
    actions.append(save, route, source);
    details.append(actions);
    return details;
  }

  function renderList() {
    const sets = currentVisibleSets();
    const statuses = selectedDayStatusById();
    const saved = new Set(state.savedIds);
    const mapped = new Set(places.map((place) => place.id));
    const fragment = document.createDocumentFragment();

    for (const set of sets) {
      const entry = el(document, "article", "show-entry");
      const row = setButton(document, "", "expand", set.id, "show-row");
      row.dataset.featured = String(Boolean(set.featured));
      row.setAttribute("aria-expanded", String(state.expandedId === set.id));
      row.setAttribute("aria-label", `${set.artist}, ${formatClock(minutes(set.startTime))} to ${formatClock(minutes(set.endTime))}, ${set.stageName}, ${statuses.get(set.id)}`);
      if (state.savedSweepId === set.id) row.classList.add("is-saved");

      const time = el(document, "time", "show-time", formatClock(minutes(set.startTime)));
      time.dateTime = `${set.day}T${set.startTime}`;
      const copy = el(document, "span", "show-row-copy");
      const artist = el(document, "strong", "show-artist", set.artist);
      const meta = el(document, "span", "show-meta", `${set.stageName} · until ${formatClock(minutes(set.endTime))}`);
      copy.append(artist, meta);
      if (set.featured) copy.append(el(document, "span", "show-featured", "Featured"));
      const stateLabel = el(document, "span", `show-status show-status-${statuses.get(set.id).toLowerCase()}`, statuses.get(set.id));
      if (saved.has(set.id)) stateLabel.append(el(document, "i", "show-saved-mark", "Saved"));
      row.append(time, copy, stateLabel);
      entry.append(row);
      if (state.expandedId === set.id) entry.append(renderRowDetails(set, saved.has(set.id), Boolean(set.stageId && mapped.has(set.stageId))));
      fragment.append(entry);
    }

    if (sets.length === 0) {
      const empty = el(document, "div", "shows-empty");
      empty.append(el(document, "strong", "", "No sets found"), el(document, "span", "", "Try another artist or stage."));
      fragment.append(empty);
    }
    list.replaceChildren(fragment);
  }

  function conflictReason(conflict, current, next) {
    const artists = `${current.artist} and ${next.artist}`;
    if (conflict.reason === "overlap") return `${artists} overlap by ${Math.abs(conflict.gapMinutes)} min.`;
    const needed = conflict.walkMinutes === null ? "more travel time" : `${conflict.walkMinutes + 3} min to walk and arrive`;
    return `${artists} are only ${conflict.gapMinutes} min apart; allow ${needed}.`;
  }

  function renderPlan() {
    const plan = analyzePlan(state.savedIds, schedule.sets, places);
    const daySets = plan.sets.filter((set) => set.day === state.day);
    const setById = new Map(schedule.sets.map((set) => [set.id, set]));
    const transitionByNext = new Map(plan.transitions
      .filter((transition) => setById.get(transition.nextId)?.day === state.day)
      .map((transition) => [transition.nextId, transition]));
    const conflicts = plan.conflicts.filter((conflict) => setById.get(conflict.currentId)?.day === state.day
      && !state.collapsedConflicts.has(conflictKey(conflict)));
    planTitle.textContent = daySets.length === 0
      ? `Build your ${dayLabel(state.day)}`
      : `${daySets.length} saved for ${dayLabel(state.day)}`;
    const fragment = document.createDocumentFragment();

    if (daySets.length === 0) {
      fragment.append(el(document, "p", "shows-plan-empty", "Save a set to start your route."));
    } else {
      const rail = el(document, "ol", "shows-plan-rail");
      for (const set of daySets) {
        const item = el(document, "li", "shows-plan-item");
        item.append(el(document, "time", "", set.startTime), el(document, "strong", "", set.artist));
        const transition = transitionByNext.get(set.id);
        if (transition?.leaveBy) {
          const current = setById.get(transition.currentId);
          item.append(el(document, "span", "shows-leave-by", `Leave ${current.artist} by ${transition.leaveBy} · ${transition.walkMinutes} min walk`));
        }
        rail.append(item);
      }
      fragment.append(rail);
    }

    for (const conflict of conflicts) {
      const current = setById.get(conflict.currentId);
      const next = setById.get(conflict.nextId);
      const keep = setById.get(conflict.keepId);
      const warning = el(document, "div", "shows-conflict");
      warning.append(el(document, "strong", "", "Plan conflict"), el(document, "span", "", conflictReason(conflict, current, next)));
      const actions = el(document, "div", "shows-conflict-actions");
      const keepButton = setButton(document, `Keep ${keep.artist}`, "resolve", conflict.removeId);
      keepButton.dataset.conflictKey = conflictKey(conflict);
      keepButton.dataset.keepId = conflict.keepId;
      const bothButton = setButton(document, "Keep both", "keep-both", conflictKey(conflict));
      bothButton.dataset.keepId = conflict.keepId;
      actions.append(keepButton, bothButton);
      warning.append(actions);
      fragment.append(warning);
    }

    const selectedIds = state.savedIds.filter((id) => setById.get(id)?.day === state.day);
    const selectedSets = schedule.sets.filter((set) => set.day === state.day);
    const recommendation = recommendGap(selectedIds, selectedSets, places);
    if (recommendation) {
      const surprise = setButton(document, `Surprise me nearby · ${recommendation.artist}`, "surprise", recommendation.id, "shows-surprise");
      fragment.append(surprise);
    }
    planContent.replaceChildren(fragment);
  }

  function render() {
    if (destroyed) return;
    if (!isValid) {
      renderUnavailable();
      return;
    }
    search.disabled = false;
    stage.disabled = false;
    search.value = state.query;
    renderDays();
    renderStages();
    renderPlan();
    renderList();
    updated.textContent = updatedLabel(schedule.updatedAt);
  }

  function transitionList() {
    list.classList.remove("is-transitioning");
    void list.offsetWidth;
    list.classList.add("is-transitioning");
    view.clearTimeout?.(transitionTimer);
    transitionTimer = view.setTimeout?.(() => list.classList.remove("is-transitioning"), 180);
  }

  function actionControl(action, value) {
    return [...root.querySelectorAll("[data-shows-action]")]
      .find((control) => control.dataset.showsAction === action
        && (value === undefined || control.dataset.showsValue === value));
  }

  function restoreFocus(preferred, fallbackSetId) {
    const target = actionControl(preferred?.action, preferred?.value)
      ?? (fallbackSetId ? actionControl("expand", fallbackSetId) : null)
      ?? planContent.querySelector("button")
      ?? list.querySelector("button")
      ?? search;
    target?.focus?.({ preventScroll: true });
  }

  function saveSet(id, { surprise = false, focusAction = "save" } = {}) {
    const set = schedule.sets.find((candidate) => candidate.id === id);
    if (!set) return;
    const index = state.savedIds.indexOf(id);
    const isSaving = index === -1;
    if (isSaving) state.savedIds.push(id);
    else state.savedIds.splice(index, 1);
    state.collapsedConflicts.clear();
    state.savedSweepId = isSaving ? id : null;
    persist();
    renderPlan();
    renderList();
    restoreFocus({ action: focusAction, value: id }, id);
    announce(isSaving ? `${set.artist} saved to My Plan.` : `${set.artist} removed from My Plan.`);
    if (surprise && isSaving) announce(`${set.artist} added as your nearby surprise.`);
    view.clearTimeout?.(sweepTimer);
    sweepTimer = view.setTimeout?.(() => {
      state.savedSweepId = null;
      [...root.querySelectorAll(".show-row")]
        .find((row) => row.dataset.showsValue === id)
        ?.classList.remove("is-saved");
    }, 420);
  }

  function onClick(event) {
    const action = event.target.closest?.("[data-shows-action]");
    if (!action || !root.contains(action)) return;
    const { showsAction, showsValue } = action.dataset;
    if (showsAction === "day") {
      if (showsValue === state.day) return;
      state.day = showsValue;
      state.expandedId = null;
      state.collapsedConflicts.clear();
      render();
      transitionList();
      restoreFocus({ action: "day", value: showsValue });
    } else if (showsAction === "expand") {
      state.expandedId = state.expandedId === showsValue ? null : showsValue;
      renderList();
      restoreFocus({ action: "expand", value: showsValue });
    } else if (showsAction === "save" || showsAction === "surprise") {
      saveSet(showsValue, {
        surprise: showsAction === "surprise",
        focusAction: showsAction === "surprise" ? "expand" : "save",
      });
    } else if (showsAction === "route") {
      const set = schedule.sets.find((candidate) => candidate.id === showsValue);
      if (!set?.stageId || !places.some((place) => place.id === set.stageId)) return;
      root.dispatchEvent(new view.CustomEvent("showroute", {
        bubbles: true,
        detail: { stageId: set.stageId, setId: set.id },
      }));
    } else if (showsAction === "resolve") {
      const removed = setById(showsValue);
      state.savedIds = state.savedIds.filter((id) => id !== showsValue);
      state.collapsedConflicts.clear();
      persist();
      renderPlan();
      renderList();
      restoreFocus(null, action.dataset.keepId);
      announce(`${removed?.artist ?? "Set"} removed from My Plan.`);
    } else if (showsAction === "keep-both") {
      state.collapsedConflicts.add(showsValue);
      renderPlan();
      restoreFocus(null, action.dataset.keepId);
      announce("Conflict suggestion collapsed. Both sets remain saved.");
    }
  }

  function setById(id) {
    return schedule.sets.find((set) => set.id === id);
  }

  function onInput(event) {
    if (event.target !== search) return;
    state.query = search.value;
    state.expandedId = null;
    renderList();
  }

  function onChange(event) {
    if (event.target !== stage) return;
    state.stageId = stage.value;
    state.expandedId = null;
    renderList();
  }

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  render();

  return {
    refresh() {
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      view.clearTimeout?.(transitionTimer);
      view.clearTimeout?.(sweepTimer);
      view.clearTimeout?.(announceTimer);
      list.classList.remove("is-transitioning");
      root.querySelectorAll(".show-row.is-saved")
        .forEach((row) => row.classList.remove("is-saved"));
      root.removeEventListener("click", onClick);
      root.removeEventListener("input", onInput);
      root.removeEventListener("change", onChange);
    },
  };
}
