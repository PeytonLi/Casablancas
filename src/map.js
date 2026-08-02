const SVG_NS = "http://www.w3.org/2000/svg";
const symbols = { gate: "G", stage: "★", water: "●", restroom: "◆", merch: "✦", exit: "↗" };

let venue;
let mapSvg;

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

  const layer = mapSvg.querySelector("#pin-layer");
  for (const [id, point] of Object.entries(venue.points)) layer.append(makePin(id, point));
  return mapSvg;
}

export function route(fromId, toId) {
  requirePoint(fromId);
  requirePoint(toId);
  const result = shortestPath(fromId, toId);
  if (!result) return null;

  clearRoute();
  const line = document.createElementNS(SVG_NS, "polyline");
  line.classList.add("active-route");
  line.setAttribute("points", result.path.map((id) => {
    const { x, y } = venue.points[id];
    return `${x},${y}`;
  }).join(" "));
  mapSvg.querySelector("#route-layer").append(line);
  highlight(toId);

  const seconds = result.distance * venue.walk_seconds_per_unit;
  return { minutes: Math.max(1, Math.ceil(seconds / 60)) };
}

export function highlight(id) {
  requirePoint(id);
  mapSvg.querySelectorAll(".map-pin.is-highlighted").forEach((pin) => pin.classList.remove("is-highlighted"));
  mapSvg.querySelector(`[data-point-id="${CSS.escape(id)}"]`)?.classList.add("is-highlighted");
}

export function clearRoute() {
  requireMap();
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
  circle.setAttribute("r", "14");
  const symbol = document.createElementNS(SVG_NS, "text");
  symbol.classList.add("pin-symbol");
  symbol.setAttribute("y", "5");
  symbol.textContent = symbols[point.type] || "•";
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", "20");
  label.setAttribute("y", "5");
  label.textContent = point.label;
  pin.append(title, circle, symbol, label);
  return pin;
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
