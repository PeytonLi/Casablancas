import {
  NAVIGATION_ROUTE,
  NAVIGATION_STEPS,
  VENUE_MARKERS,
} from "../data/navigation-route.js?v=turn-by-turn-2";
import {
  CATEGORY_LABELS,
  FESTIVAL_PLACES,
} from "../data/festival-places.js?v=festival-map-overlay-1";
import { findNearestPlace, frameAt, prepareRoute } from "./navigation.js";
import { createPerformerRig } from "./performer-rig.js";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const DEMO_DURATION_MS = 22_000;
const DESTINATION_MIN_ZOOM = 16.45;
const DESTINATION_MAX_ZOOM = 17.2;
const routeModel = prepareRoute(NAVIGATION_ROUTE, NAVIGATION_STEPS);
const CATEGORY_COLORS = {
  stage: "#95e000",
  food: "#ff8a3d",
  drink: "#00a6a6",
  bar: "#00a6a6",
  restroom: "#3977f6",
  water: "#2d9cdb",
  medical: "#e84855",
  entrance: "#8f63d9",
  exit: "#8f63d9",
  merch: "#e45aa6",
  attraction: "#e3b341",
  activity: "#e3b341",
  landmark: "#71685e",
};

function placeCoordinates(place) {
  const coordinates = place.coordinates ?? place.location?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return [Number(coordinates[0]), Number(coordinates[1])];
  }
  return [Number(place.longitude ?? place.lng), Number(place.latitude ?? place.lat)];
}

function categoryLabel(category) {
  if (CATEGORY_LABELS instanceof Map) return CATEGORY_LABELS.get(category) ?? category;
  return CATEGORY_LABELS?.[category] ?? category;
}

function categoryColor(category, explicitColor) {
  if (explicitColor) return explicitColor;
  const normalized = String(category ?? "landmark").toLowerCase();
  const key = Object.keys(CATEGORY_COLORS).find((candidate) => normalized.includes(candidate));
  return CATEGORY_COLORS[key] ?? "#71685e";
}

const festivalPlaces = FESTIVAL_PLACES.map((place, index) => {
  const category = String(place.category ?? place.type ?? "landmark");
  const coordinates = placeCoordinates(place);
  return {
    ...place,
    id: String(place.id ?? `festival-place-${index + 1}`),
    name: place.name ?? place.label ?? `Festival place ${index + 1}`,
    label: place.label ?? place.name ?? `Festival place ${index + 1}`,
    category,
    categoryLabel: categoryLabel(category),
    color: categoryColor(category, place.color),
    coordinates,
  };
}).filter((place) => place.coordinates.every(Number.isFinite));

let activeContainer = null;
let map = null;
let puckMarker = null;
let puckRig = null;
let placeMarkers = [];
let animationFrame = 0;
let animationStartedAt = 0;
let progress = 0;
let state = "preview";
let routeMode = "curated";
let visibilityHandler = null;

function dispatch(type, detail) {
  activeContainer?.dispatchEvent(new CustomEvent(type, { detail }));
}

function routeFeature(coordinates = NAVIGATION_ROUTE) {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  };
}

function markerFeatures() {
  return {
    type: "FeatureCollection",
    features: VENUE_MARKERS.map((marker) => ({
      type: "Feature",
      properties: {
        id: marker.id,
        type: marker.type,
        label: marker.label,
      },
      geometry: { type: "Point", coordinates: marker.coordinates },
    })),
  };
}

function festivalPlaceFeatures() {
  return {
    type: "FeatureCollection",
    features: festivalPlaces.map((place) => ({
      type: "Feature",
      id: place.id,
      properties: {
        id: place.id,
        name: place.name,
        label: place.label,
        category: place.category,
        categoryLabel: place.categoryLabel,
        color: place.color,
      },
      geometry: { type: "Point", coordinates: place.coordinates },
    })),
  };
}

function festivalBoundaryFeature() {
  const coordinates = festivalPlaces.map((place) => place.coordinates);
  if (!coordinates.length) return { type: "FeatureCollection", features: [] };
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const longitudePadding = Math.max((east - west) * 0.09, 0.00015);
  const latitudePadding = Math.max((north - south) * 0.09, 0.00015);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [west - longitudePadding, south - latitudePadding],
        [east + longitudePadding, south - latitudePadding],
        [east + longitudePadding, north + latitudePadding],
        [west - longitudePadding, north + latitudePadding],
        [west - longitudePadding, south - latitudePadding],
      ]],
    },
  };
}

function festivalDestinationFeature(
  origin = NAVIGATION_ROUTE[0],
  destination = NAVIGATION_ROUTE[0],
) {
  return routeFeature([origin, destination]);
}

export function clampDestinationZoom(zoom) {
  const resolvedZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : DESTINATION_MIN_ZOOM;
  return Math.min(DESTINATION_MAX_ZOOM, Math.max(DESTINATION_MIN_ZOOM, resolvedZoom));
}

function createPuckElement() {
  const puck = document.createElement("div");
  puck.className = "navigation-puck";
  puck.setAttribute("aria-label", "Charli navigation location");
  puck.innerHTML = '<span class="navigation-puck-cone"></span><span class="navigation-puck-character"></span><span class="navigation-puck-anchor"></span>';
  const character = puck.querySelector(".navigation-puck-character");
  puckRig?.destroy();
  puckRig = createPerformerRig(character);
  puckRig.setTrack(0);
  return puck;
}

function placeIconMarkup(category) {
  const icons = {
    stage: '<svg viewBox="0 0 24 24"><path d="M9 18V6l9-2v12M9 10l9-2M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm9-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"/></svg>',
    restroom: '<span class="festival-marker-letters">WC</span>',
    water: '<svg viewBox="0 0 24 24"><path d="M12 3s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z"/></svg>',
    food: '<svg viewBox="0 0 24 24"><path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10m8-18v18m0-18c4 3 4 8 0 10"/></svg>',
    attraction: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    merch: '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 13H5L6 8Zm3 1V6a3 3 0 0 1 6 0v3"/></svg>',
    entrance: '<svg viewBox="0 0 24 24"><path d="M4 21V5l8-2v18M4 21h16M15 9l4 3-4 3m4-3H9"/></svg>',
  };
  return icons[category] ?? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>';
}

function addFestivalIconMarkers() {
  placeMarkers = festivalPlaces.map((place) => {
    const element = document.createElement("button");
    element.className = "festival-icon-marker";
    element.type = "button";
    element.dataset.category = place.category;
    element.style.setProperty("--festival-marker-color", place.color);
    element.setAttribute("aria-label", `${place.name}, ${place.categoryLabel}`);
    element.innerHTML = `${placeIconMarkup(place.category)}<span class="festival-marker-tip"></span>`;
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      focusPlace(place.id);
    });
    const marker = new globalThis.maplibregl.Marker({ element, anchor: "bottom" })
      .setLngLat(place.coordinates)
      .addTo(map);
    return { place, marker, element };
  });
}

function addNavigationLayers() {
  map.addSource("festival-boundary", {
    type: "geojson",
    data: festivalBoundaryFeature(),
  });
  map.addLayer({
    id: "festival-boundary-fill",
    type: "fill",
    source: "festival-boundary",
    paint: {
      "fill-color": "#95e000",
      "fill-opacity": 0.08,
      "fill-outline-color": "#507800",
    },
  });

  map.addSource("casablancas-route", {
    type: "geojson",
    data: routeFeature(),
  });
  map.addLayer({
    id: "casablancas-route-halo",
    type: "line",
    source: "casablancas-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#0b1506",
      "line-width": 12,
      "line-opacity": 0.72,
    },
  });
  map.addLayer({
    id: "casablancas-route-line",
    type: "line",
    source: "casablancas-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#95e000",
      "line-width": 7,
      "line-opacity": 0.98,
    },
  });

  map.addSource("festival-destination-route", {
    type: "geojson",
    data: festivalDestinationFeature(),
  });
  map.addLayer({
    id: "festival-destination-route-halo",
    type: "line",
    source: "festival-destination-route",
    layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
    paint: { "line-color": "#0b1506", "line-width": 10, "line-opacity": 0.65 },
  });
  map.addLayer({
    id: "festival-destination-route-line",
    type: "line",
    source: "festival-destination-route",
    layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
    paint: {
      "line-color": "#95e000",
      "line-width": 6,
      "line-opacity": 0.95,
      "line-dasharray": [1.2, 0.65],
    },
  });

  map.addSource("casablancas-markers", {
    type: "geojson",
    data: markerFeatures(),
  });
  map.addLayer({
    id: "casablancas-amenities",
    type: "circle",
    source: "casablancas-markers",
    filter: ["!=", ["get", "type"], "stage"],
    paint: {
      "circle-radius": 6,
      "circle-color": "#1677ff",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "casablancas-stages-halo",
    type: "circle",
    source: "casablancas-markers",
    filter: ["==", ["get", "type"], "stage"],
    paint: {
      "circle-radius": 11,
      "circle-color": "#071000",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: "casablancas-stages",
    type: "circle",
    source: "casablancas-markers",
    filter: ["==", ["get", "type"], "stage"],
    paint: {
      "circle-radius": 6,
      "circle-color": "#95e000",
    },
  });
  map.addLayer({
    id: "casablancas-marker-labels",
    type: "symbol",
    source: "casablancas-markers",
    filter: ["!=", ["get", "type"], "stage"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 10,
      "text-offset": [0, 1.35],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "symbol-avoid-edges": true,
    },
    paint: {
      "text-color": "#071000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: "casablancas-stage-labels",
    type: "symbol",
    source: "casablancas-markers",
    filter: ["==", ["get", "type"], "stage"],
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 13,
      "text-offset": [0, 1.35],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "symbol-avoid-edges": true,
    },
    paint: {
      "text-color": "#071000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });

  map.addSource("festival-places", {
    type: "geojson",
    data: festivalPlaceFeatures(),
  });
  map.addLayer({
    id: "festival-place-circles",
    type: "circle",
    source: "festival-places",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 5, 17, 8],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.18,
    },
  });
  map.addLayer({
    id: "festival-place-labels",
    type: "symbol",
    source: "festival-places",
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "symbol-avoid-edges": true,
    },
    paint: {
      "text-color": "#071000",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });

  const selectPlace = (event) => {
    const id = event.features?.[0]?.properties?.id;
    if (id) focusPlace(id);
  };
  for (const layerId of ["festival-place-circles", "festival-place-labels"]) {
    map.on("click", layerId, selectPlace);
    map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
  }

  addFestivalIconMarkers();

  puckMarker = new globalThis.maplibregl.Marker({
    element: createPuckElement(),
    anchor: "bottom",
    rotationAlignment: "viewport",
  }).setLngLat(NAVIGATION_ROUTE[0]).addTo(map);
}

function setDestinationRouteVisible(visible) {
  const visibility = visible ? "visible" : "none";
  for (const layerId of ["festival-destination-route-halo", "festival-destination-route-line"]) {
    if (map?.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
  }
}

function setCuratedRouteVisible(visible) {
  const visibility = visible ? "visible" : "none";
  for (const layerId of ["casablancas-route-halo", "casablancas-route-line"]) {
    if (map?.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
  }
}

function setRouteMode(mode) {
  routeMode = mode === "destination" ? "destination" : "curated";
  setCuratedRouteVisible(routeMode === "curated");
  setDestinationRouteVisible(routeMode === "destination");
}

function frameCamera(frame, follow = true) {
  puckMarker?.setLngLat(frame.coordinate);
  const puck = puckMarker?.getElement();
  puck?.style.setProperty("--puck-bearing", `${frame.bearing}deg`);

  if (follow) {
    map.jumpTo({
      center: frame.coordinate,
      zoom: 17.3,
      bearing: frame.bearing,
      pitch: 52,
      padding: { top: 145, right: 28, bottom: 155, left: 28 },
    });
  }
  dispatch("navigationframe", frame);
}

function setState(nextState) {
  state = nextState;
  puckRig?.setPerforming(nextState === "running");
  dispatch("navigationstate", { state });
}

function showPreview() {
  const first = NAVIGATION_ROUTE[0];
  const last = NAVIGATION_ROUTE.at(-1);
  if (map.getLayer("casablancas-stage-labels")) {
    map.setLayoutProperty("casablancas-stage-labels", "visibility", "visible");
  }
  map.fitBounds([first, last], {
    padding: { top: 150, right: 54, bottom: 145, left: 54 },
    duration: 650,
    pitch: 28,
    bearing: 0,
    maxZoom: 16.4,
  });
  frameCamera(frameAt(routeModel, 0), false);
}

function animate(timestamp) {
  if (state !== "running") return;
  if (!animationStartedAt) animationStartedAt = timestamp - progress * DEMO_DURATION_MS;
  progress = Math.min(1, (timestamp - animationStartedAt) / DEMO_DURATION_MS);
  frameCamera(frameAt(routeModel, progress));

  if (progress >= 1) {
    animationFrame = 0;
    setState("arrived");
    map.easeTo({
      center: NAVIGATION_ROUTE.at(-1),
      zoom: 17.7,
      pitch: 45,
      duration: 650,
      padding: { top: 145, right: 28, bottom: 155, left: 28 },
    });
    return;
  }
  animationFrame = requestAnimationFrame(animate);
}

export async function initMap(container) {
  if (map && activeContainer === container) {
    map.resize();
    return map;
  }
  if (!container) throw new TypeError("initMap requires a map container.");
  if (!globalThis.maplibregl) throw new Error("The navigation map library did not load.");

  destroyMap();
  activeContainer = container;

  return new Promise((resolve, reject) => {
    let settled = false;
    map = new globalThis.maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: NAVIGATION_ROUTE[0],
      zoom: 15.8,
      pitch: 28,
      bearing: 0,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.on("styleimagemissing", (event) => {
      if (!map.hasImage(event.id)) {
        map.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
      }
    });

    map.once("load", () => {
      try {
        addNavigationLayers();
        showPreview();
        setState("preview");
        visibilityHandler = () => {
          if (document.hidden && state === "running") toggleNavigation();
        };
        document.addEventListener("visibilitychange", visibilityHandler);
        settled = true;
        resolve(map);
      } catch (error) {
        reject(error);
      }
    });
    map.on("error", (event) => {
      const error = event.error instanceof Error ? event.error : new Error("The venue map failed to load.");
      dispatch("navigationerror", { message: error.message });
      if (!settled) reject(error);
    });
  });
}

export function startNavigation() {
  if (!map || !puckMarker) return false;
  if (routeMode === "destination") return false;
  setDestinationRouteVisible(false);
  if (map.getLayer("casablancas-stage-labels")) {
    map.setLayoutProperty("casablancas-stage-labels", "visibility", "none");
  }
  cancelAnimationFrame(animationFrame);
  if (state === "arrived" || progress >= 1) progress = 0;
  animationStartedAt = performance.now() - progress * DEMO_DURATION_MS;
  setState("running");
  animationFrame = requestAnimationFrame(animate);
  return true;
}

export function toggleNavigation() {
  if (state === "running") {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    setState("paused");
    return "paused";
  }
  if (state === "paused") {
    startNavigation();
    return "running";
  }
  return state;
}

export function restartNavigation() {
  if (!resetMapExperience({ resetCamera: false })) return false;
  showPreview();
  return true;
}

export function resetMapExperience({ resetCamera = true } = {}) {
  if (!map || !puckMarker) return false;
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  animationStartedAt = 0;
  progress = 0;
  const origin = [...NAVIGATION_ROUTE[0]];
  map.getSource("festival-destination-route")?.setData(festivalDestinationFeature(origin, origin));
  puckMarker.setLngLat(origin);
  setRouteMode("curated");
  setState("preview");
  if (resetCamera) showPreview();
  return true;
}

export function searchPlaces(query = "") {
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...festivalPlaces];
  return festivalPlaces.filter((place) => {
    const haystack = [
      place.name,
      place.label,
      place.category,
      place.categoryLabel,
      place.description,
      place.shortDescription,
      ...(Array.isArray(place.keywords) ? place.keywords : []),
    ].filter(Boolean).join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function focusPlace(id) {
  const place = festivalPlaces.find((candidate) => candidate.id === String(id));
  if (!place || !map) return false;
  map.flyTo({ center: place.coordinates, zoom: Math.max(map.getZoom(), 17), duration: 650 });
  dispatch("placeselected", place);
  return place;
}

export function navigateToPlace(id) {
  const place = festivalPlaces.find((candidate) => candidate.id === String(id));
  const source = map?.getSource("festival-destination-route");
  if (!place || !source || !puckMarker) return false;
  resetMapExperience({ resetCamera: false });
  const origin = [...NAVIGATION_ROUTE[0]];
  const destinationRoute = prepareRoute([origin, place.coordinates]);
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  animationStartedAt = 0;
  progress = 0;
  source.setData(festivalDestinationFeature(origin, place.coordinates));
  setRouteMode("destination");
  puckMarker.setLngLat(origin);
  const bounds = [
    [
      Math.min(origin[0], place.coordinates[0]),
      Math.min(origin[1], place.coordinates[1]),
    ],
    [
      Math.max(origin[0], place.coordinates[0]),
      Math.max(origin[1], place.coordinates[1]),
    ],
  ];
  map.resize();
  const padding = { top: 145, right: 48, bottom: 155, left: 48 };
  const camera = map.cameraForBounds(bounds, {
    padding,
    maxZoom: DESTINATION_MAX_ZOOM,
  });
  map.easeTo({
    center: camera?.center ?? origin,
    zoom: clampDestinationZoom(camera?.zoom),
    padding,
    duration: 650,
    pitch: 46,
    bearing: -12,
  });
  setState("preview");
  dispatch("placeselected", place);
  return {
    ...place,
    routeDistanceMeters: destinationRoute.totalDistanceMeters,
    routeEtaMinutes: Math.max(1, Math.ceil(
      destinationRoute.totalDistanceMeters / destinationRoute.walkingSpeedMetersPerSecond / 60,
    )),
  };
}

export function navigateToNearestRestroom() {
  const place = findNearestPlace(NAVIGATION_ROUTE[0], festivalPlaces, "restroom");
  return place ? navigateToPlace(place.id) : false;
}

export function setCategoryFilter(category) {
  if (!map?.getLayer("festival-place-circles")) return false;
  const filter = category == null || category === "" || category === "all"
    ? null
    : ["==", ["get", "category"], String(category)];
  map.setFilter("festival-place-circles", filter);
  map.setFilter("festival-place-labels", filter);
  for (const item of placeMarkers) {
    item.element.hidden = Boolean(category && category !== "all" && item.place.category !== category);
  }
  return true;
}

export function destroyMap() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  visibilityHandler = null;
  puckRig?.destroy();
  puckRig = null;
  puckMarker?.remove();
  puckMarker = null;
  placeMarkers.forEach(({ marker }) => marker.remove());
  placeMarkers = [];
  map?.remove();
  map = null;
  activeContainer = null;
  animationStartedAt = 0;
  progress = 0;
  state = "preview";
  routeMode = "curated";
}
