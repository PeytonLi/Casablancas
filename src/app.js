import { initMap, nearest, route } from "./map.js";

const labels = {
  "lands-end": "Lands End Stage",
  water: "Water Station",
  restroom: "Restroom",
  merch: "Merch",
  exit: "Exit",
};

const app = document.querySelector("#app");
const map = document.querySelector("#map");
const arrow = document.querySelector("#direction-arrow");
const direction = document.querySelector("#direction");
const destination = document.querySelector("#destination");
const routeName = document.querySelector("#route-name");
const walkTime = document.querySelector("#walk-time");
let location = "south-gate";

function bearingLabel(bearing) {
  return ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
    [Math.round(bearing / 45) % 8];
}

function showRoute(to, label = labels[to]) {
  if (to === location) return;
  const result = route(location, to);
  if (!result) return;
  direction.textContent = `Head ${bearingLabel(result.bearing)}`;
  destination.textContent = `toward ${label}`;
  routeName.textContent = `${labels[location] || "South Gate"} → ${label}`;
  walkTime.textContent = `${result.minutes} min`;
  arrow.style.rotate = `${result.bearing}deg`;
  location = to;
}

initMap(map)
  .then(() => showRoute("lands-end"))
  .catch((error) => {
    console.error("Map initialization failed.", error);
    map.innerHTML = '<p class="map-loading" role="alert">Map unavailable. Try reloading.</p>';
  });

document.querySelectorAll("[data-dest]").forEach((button) => {
  button.addEventListener("click", () => {
    const requested = button.dataset.dest;
    const found = ["water", "restroom", "merch", "exit"].includes(requested)
      ? nearest(requested, location)
      : { id: requested, label: labels[requested] };
    if (found) showRoute(found.id, found.label);
  });
});

document.querySelector("#tilt").addEventListener("click", (event) => {
  const flat = app.classList.toggle("is-flat");
  event.currentTarget.setAttribute("aria-pressed", String(!flat));
  event.currentTarget.textContent = flat ? "2D" : "3D";
});
