const SVG_NS = "http://www.w3.org/2000/svg";
const symbols = { gate: "G", stage: "★", water: "●", restroom: "◆", merch: "✦", exit: "↗" };

let venue;
let mapSvg;
let mapContainer;
let fullView;
let activePath = [];

export async function initMap(containerEl) {
  if (!(containerEl instanceof Element)) throw new TypeError("initMap needs a container element.");

  const [venueResponse, mapResponse] = await Promise.all([
    fetch(new URL("../data/venue.json", import.meta.url)),
    fetch(new URL("../assets/map.svg", import.meta.url)),
  ]);
  if (!venueResponse.ok || !mapResponse.ok) throw new Error("Festival map assets could not be loaded.");

  venue = await venueResponse.json();
  containerEl.innerHTML = await mapResponse.text();
  mapSvg = containerEl.querySelector("svg");
  if (!mapSvg) throw new Error("Festival map SVG is invalid.");
  mapContainer = containerEl;
  fullView = viewBox();

  const layer = mapSvg.querySelector("#pin-layer");
  for (const [id, point] of Object.entries(venue.points)) {
    if (!point.hidden) layer.append(makePin(id, point));
  }
  addControls();
  addInteractions();
  new ResizeObserver(resetView).observe(containerEl);
  requestAnimationFrame(resetView);
  return mapSvg;
}

export function route(fromId, toId) {
  requirePoint(fromId);
  requirePoint(toId);
  const result = shortestPath(fromId, toId);
  if (!result) return null;

  clearRoute();
  activePath = result.path;
  const line = document.createElementNS(SVG_NS, "polyline");
  line.classList.add("active-route");
  line.setAttribute("points", result.path.map((id) => {
    const { x, y } = venue.points[id];
    return `${x},${y}`;
  }).join(" "));
  mapSvg.querySelector("#route-layer").append(line);
  highlight(toId);
  fitPoints(activePath);

  const seconds = result.distance * venue.walk_seconds_per_unit;
  const first = venue.points[result.path[0]];
  const next = venue.points[result.path[1]] || first;
  const bearing = (Math.atan2(next.x - first.x, first.y - next.y) * 180 / Math.PI + 360) % 360;
  return { minutes: Math.max(1, Math.ceil(seconds / 60)), bearing };
}

export function highlight(id) {
  requirePoint(id);
  mapSvg.querySelectorAll(".map-pin.is-highlighted").forEach((pin) => pin.classList.remove("is-highlighted"));
  mapSvg.querySelector(`[data-point-id="${CSS.escape(id)}"]`)?.classList.add("is-highlighted");
}

export function clearRoute() {
  requireMap();
  activePath = [];
  mapSvg.querySelector("#route-layer").replaceChildren();
  mapSvg.querySelectorAll(".map-pin.is-highlighted").forEach((pin) => pin.classList.remove("is-highlighted"));
}

export function nearest(type, fromId) {
  requirePoint(fromId);
  let best;
  for (const [id, point] of Object.entries(venue.points)) {
    if (point.type !== type) continue;
    const result = shortestPath(fromId, id);
    if (result && (!best || result.distance < best.distance)) best = { id, label: point.label, distance: result.distance };
  }
  return best && { id: best.id, label: best.label };
}

function makePin(id, point) {
  const pin = document.createElementNS(SVG_NS, "g");
  pin.classList.add("map-pin");
  pin.dataset.pointId = id;
  pin.dataset.type = point.type;
  pin.setAttribute("transform", `translate(${point.x} ${point.y})`);
  pin.setAttribute("role", "img");
  pin.setAttribute("aria-label", point.label);
  pin.setAttribute("tabindex", "0");

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = point.label;
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("r", "10");
  const symbol = document.createElementNS(SVG_NS, "text");
  symbol.classList.add("pin-symbol");
  symbol.setAttribute("y", "5");
  symbol.textContent = symbols[point.type] || "•";
  const label = document.createElementNS(SVG_NS, "text");
  label.classList.add("pin-label");
  label.setAttribute("x", "20");
  label.setAttribute("y", "5");
  label.textContent = point.label;
  pin.append(title, circle, symbol, label);
  return pin;
}

function addControls() {
  const controls = document.createElement("div");
  controls.className = "map-controls";
  controls.setAttribute("aria-label", "Map controls");

  for (const [label, symbol, action] of [
    ["Zoom in", "+", () => zoomAt(0.7)],
    ["Zoom out", "−", () => zoomAt(1.4)],
    ["Reset map", "⌖", resetView],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    button.addEventListener("click", action);
    controls.append(button);
  }

  mapContainer.append(controls);
}

function addInteractions() {
  const pointers = new Map();
  let gesture;

  const beginGesture = () => {
    const points = [...pointers.values()];
    const current = viewBox();
    if (points.length === 1) {
      gesture = { count: 1, point: points[0], view: current };
      return;
    }
    const midpoint = middle(points[0], points[1]);
    gesture = {
      count: 2,
      distance: distance(points[0], points[1]),
      mapPoint: clientToMap(midpoint.x, midpoint.y, current),
      view: current,
    };
  };

  mapSvg.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    mapSvg.setPointerCapture(event.pointerId);
    mapSvg.classList.add("is-dragging");
    beginGesture();
  });

  mapSvg.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== gesture?.count) beginGesture();

    const rect = mapSvg.getBoundingClientRect();
    const points = [...pointers.values()];
    if (points.length === 1) {
      const dx = points[0].x - gesture.point.x;
      const dy = points[0].y - gesture.point.y;
      setView(
        gesture.view.x - (dx / rect.width) * gesture.view.width,
        gesture.view.y - (dy / rect.height) * gesture.view.height,
        gesture.view.width,
        gesture.view.height,
      );
      return;
    }

    const midpoint = middle(points[0], points[1]);
    const scale = gesture.distance / Math.max(1, distance(points[0], points[1]));
    const width = gesture.view.width * scale;
    const height = gesture.view.height * scale;
    const xRatio = (midpoint.x - rect.left) / rect.width;
    const yRatio = (midpoint.y - rect.top) / rect.height;
    setView(
      gesture.mapPoint.x - xRatio * width,
      gesture.mapPoint.y - yRatio * height,
      width,
      height,
    );
  });

  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size) beginGesture();
    else {
      gesture = undefined;
      mapSvg.classList.remove("is-dragging");
    }
  };
  mapSvg.addEventListener("pointerup", endPointer);
  mapSvg.addEventListener("pointercancel", endPointer);
  mapSvg.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomAt(Math.max(0.7, Math.min(1.4, Math.exp(event.deltaY * 0.002))), event.clientX, event.clientY);
  }, { passive: false });
  mapSvg.addEventListener("dblclick", (event) => zoomAt(0.6, event.clientX, event.clientY));
}

function resetView() {
  if (!mapSvg || !mapContainer.clientWidth || !mapContainer.clientHeight) return;
  fitPoints(activePath.length ? activePath : ["south-gate", "lands-end"]);
}

function fitPoints(ids) {
  const points = ids.map((id) => venue.points[id]);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const padding = 10;
  let width = Math.max(180, Math.max(...xs) - Math.min(...xs) + padding * 2);
  let height = Math.max(180, Math.max(...ys) - Math.min(...ys) + padding * 2);
  const aspect = mapContainer.clientWidth / mapContainer.clientHeight;

  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;

  const scale = Math.min(1, fullView.width / width, fullView.height / height);
  width *= scale;
  height *= scale;
  setView(
    (Math.min(...xs) + Math.max(...xs) - width) / 2,
    (Math.min(...ys) + Math.max(...ys) - height) / 2,
    width,
    height,
    40,
  );
}

function zoomAt(factor, clientX, clientY) {
  const current = viewBox();
  const rect = mapSvg.getBoundingClientRect();
  const x = clientX ?? rect.left + rect.width / 2;
  const y = clientY ?? rect.top + rect.height / 2;
  const point = clientToMap(x, y, current);
  const width = current.width * factor;
  const height = current.height * factor;
  const xRatio = (x - rect.left) / rect.width;
  const yRatio = (y - rect.top) / rect.height;
  setView(point.x - xRatio * width, point.y - yRatio * height, width, height);
}

function setView(x, y, width, height, margin = 0) {
  const minWidth = 120;
  if (width < minWidth) {
    const scale = minWidth / width;
    width *= scale;
    height *= scale;
  }
  const scale = Math.min(1, fullView.width / width, fullView.height / height);
  width *= scale;
  height *= scale;
  x = Math.max(fullView.x - margin, Math.min(x, fullView.x + fullView.width - width + margin));
  y = Math.max(fullView.y - margin, Math.min(y, fullView.y + fullView.height - height + margin));
  mapSvg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
}

function viewBox() {
  const [x, y, width, height] = mapSvg.getAttribute("viewBox").split(/\s+/).map(Number);
  return { x, y, width, height };
}

function clientToMap(x, y, current = viewBox()) {
  const rect = mapSvg.getBoundingClientRect();
  return {
    x: current.x + ((x - rect.left) / rect.width) * current.width,
    y: current.y + ((y - rect.top) / rect.height) * current.height,
  };
}

function middle(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function shortestPath(fromId, toId) {
  const graph = new Map(Object.keys(venue.points).map((id) => [id, []]));
  for (const [a, b] of venue.edges) {
    const distance = pointDistance(a, b);
    graph.get(a)?.push([b, distance]);
    graph.get(b)?.push([a, distance]);
  }

  const distances = new Map([[fromId, 0]]);
  const previous = new Map();
  const pending = new Set(graph.keys());
  while (pending.size) {
    let current;
    for (const id of pending) {
      if (distances.has(id) && (current === undefined || distances.get(id) < distances.get(current))) current = id;
    }
    if (current === undefined) break;
    pending.delete(current);
    if (current === toId) break;
    for (const [next, weight] of graph.get(current)) {
      if (!pending.has(next)) continue;
      const candidate = distances.get(current) + weight;
      if (candidate < (distances.get(next) ?? Infinity)) {
        distances.set(next, candidate);
        previous.set(next, current);
      }
    }
  }

  if (!distances.has(toId)) return null;
  const path = [toId];
  while (path[0] !== fromId) path.unshift(previous.get(path[0]));
  return { path, distance: distances.get(toId) };
}

function pointDistance(a, b) {
  const from = venue.points[a];
  const to = venue.points[b];
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function requireMap() {
  if (!venue || !mapSvg) throw new Error("Call initMap before using the festival map.");
}

function requirePoint(id) {
  requireMap();
  if (!venue.points[id]) throw new RangeError(`Unknown festival map point: ${id}`);
}
