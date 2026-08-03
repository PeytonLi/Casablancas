import assert from "node:assert/strict";
import test from "node:test";

import { initShowsView, SHOWS_STORAGE_KEY } from "../src/shows.js";

const OFFICIAL_SCHEDULE_URL = "https://sfoutsidelands.com/schedule/";

function fakeNode(className = "") {
  return {
    children: [],
    className,
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    dataset: {},
    disabled: false,
    textContent: "",
    value: "",
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function showsRoot() {
  const outlets = new Map([
    ["#shows-days", fakeNode()],
    ["#shows-search", fakeNode()],
    ["#shows-stage", fakeNode()],
    ["#shows-plan-title", fakeNode()],
    ["#shows-plan-content", fakeNode()],
    ["#shows-list", fakeNode()],
    ["#shows-updated", fakeNode()],
    ["#shows-live", fakeNode()],
  ]);
  const document = {
    defaultView: globalThis,
    createDocumentFragment: () => fakeNode(),
    createElement: (tag) => ({ ...fakeNode(), tagName: tag.toUpperCase() }),
  };
  return {
    ownerDocument: document,
    outlets,
    addEventListener() {},
    removeEventListener() {},
    contains: () => true,
    querySelector: (selector) => outlets.get(selector) ?? null,
    querySelectorAll: () => [],
  };
}

function schedule(overrides = {}) {
  return {
    eventDates: ["2026-08-07"],
    timeZone: "America/Los_Angeles",
    updatedAt: "2026-08-02T23:00:00.000Z",
    sourceUrl: OFFICIAL_SCHEDULE_URL,
    sets: [{
      id: "charli",
      artist: "Charli xcx",
      day: "2026-08-07",
      startTime: "20:40",
      endTime: "22:00",
      stageId: "lands-end",
      stageName: "Lands End",
      sourceUrl: OFFICIAL_SCHEDULE_URL,
      featured: true,
    }],
    ...overrides,
  };
}

function installThrowingLocalStorage() {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Storage access is blocked");
    },
  });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  };
}

function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node?.children ?? []) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

test("initShowsView tolerates localStorage access throwing", () => {
  const restore = installThrowingLocalStorage();
  try {
    const controller = initShowsView(showsRoot(), { schedule: schedule() });
    controller.destroy();
  } finally {
    restore();
  }
});

test("runtime validation rejects impossible event dates", () => {
  const root = showsRoot();
  initShowsView(root, {
    schedule: schedule({
      eventDates: ["2026-02-31"],
      sets: [{ ...schedule().sets[0], day: "2026-02-31" }],
    }),
    storage: null,
  });

  assert.equal(root.outlets.get("#shows-plan-title").textContent, "Schedule unavailable");
});

test("runtime validation rejects an invalid updatedAt", () => {
  const root = showsRoot();
  initShowsView(root, {
    schedule: schedule({ updatedAt: "not-a-date" }),
    storage: null,
  });

  assert.equal(root.outlets.get("#shows-plan-title").textContent, "Schedule unavailable");
});

test("conflict copy names both artists", () => {
  const root = showsRoot();
  const conflictingSchedule = schedule({
    sets: [
      schedule().sets[0],
      {
        ...schedule().sets[0],
        id: "the-xx",
        artist: "The xx",
        startTime: "20:30",
        endTime: "21:40",
        stageId: "sutro",
        stageName: "Sutro",
        featured: false,
      },
    ],
  });
  const storage = {
    getItem(key) {
      assert.equal(key, SHOWS_STORAGE_KEY);
      return JSON.stringify(["the-xx", "charli"]);
    },
    setItem() {},
  };
  initShowsView(root, { schedule: conflictingSchedule, storage, now: new Date("2026-08-01T12:00:00Z") });

  const warning = findNode(
    root.outlets.get("#shows-plan-content"),
    (node) => node.className === "shows-conflict",
  );
  const reason = warning?.children[1]?.textContent ?? "";
  assert.match(reason, /Charli xcx/);
  assert.match(reason, /The xx/);
});
