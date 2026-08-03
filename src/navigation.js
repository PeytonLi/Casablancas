const EARTH_RADIUS_METERS = 6_371_008.8;
const WALKING_SPEED_METERS_PER_SECOND = 1.35;

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

function validCoordinate(coordinate) {
  return Array.isArray(coordinate)
    && coordinate.length === 2
    && Number.isFinite(coordinate[0])
    && Number.isFinite(coordinate[1])
    && Math.abs(coordinate[0]) <= 180
    && Math.abs(coordinate[1]) <= 90;
}

function assertCoordinate(coordinate, label) {
  if (!validCoordinate(coordinate)) {
    throw new TypeError(`${label} must be a [longitude, latitude] coordinate.`);
  }
}

function distanceBetween(from, to) {
  const latitudeDelta = radians(to[1] - from[1]);
  const longitudeDelta = radians(to[0] - from[0]);
  const fromLatitude = radians(from[1]);
  const toLatitude = radians(to[1]);
  const sinLatitude = Math.sin(latitudeDelta / 2);
  const sinLongitude = Math.sin(longitudeDelta / 2);
  const haversine = sinLatitude ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * sinLongitude ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/**
 * Returns the closest place in a category to a [longitude, latitude] origin.
 */
export function findNearestPlace(origin, places, category) {
  assertCoordinate(origin, "origin");
  if (!Array.isArray(places)) throw new TypeError("places must be an array.");

  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const place of places) {
    if (String(place?.category ?? "").toLowerCase() !== normalizedCategory) continue;
    const coordinates = place?.coordinates ?? place?.location?.coordinates;
    if (!validCoordinate(coordinates)) continue;
    const distance = distanceBetween(origin, coordinates);
    if (distance < nearestDistance) {
      nearest = place;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function coordinateAtDistance(route, distanceMeters) {
  if (distanceMeters <= 0) return [...route.coordinates[0]];
  if (distanceMeters >= route.totalDistanceMeters) return [...route.coordinates.at(-1)];

  const segment = route.segments.find((candidate) => distanceMeters <= candidate.endDistanceMeters)
    ?? route.segments.at(-1);
  const distanceIntoSegment = distanceMeters - segment.startDistanceMeters;
  const ratio = segment.distanceMeters === 0 ? 0 : distanceIntoSegment / segment.distanceMeters;

  return [
    segment.from[0] + (segment.to[0] - segment.from[0]) * ratio,
    segment.from[1] + (segment.to[1] - segment.from[1]) * ratio,
  ];
}

function instructionAt(route, progress) {
  let activeInstruction = route.steps[0] ?? null;

  for (const step of route.steps) {
    if (step.threshold > progress) break;
    activeInstruction = step;
  }

  return activeInstruction;
}

/**
 * Calculates a clockwise-from-north geographic bearing in degrees.
 */
export function bearingBetween(from, to) {
  assertCoordinate(from, "from");
  assertCoordinate(to, "to");
  if (from[0] === to[0] && from[1] === to[1]) return 0;

  const fromLatitude = radians(from[1]);
  const toLatitude = radians(to[1]);
  const longitudeDelta = radians(to[0] - from[0]);
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x = Math.cos(fromLatitude) * Math.sin(toLatitude)
    - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);

  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Precomputes a distance-aware route from [longitude, latitude] waypoints.
 */
export function prepareRoute(coordinates, steps = []) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new TypeError("A route needs at least two [longitude, latitude] coordinates.");
  }
  if (!Array.isArray(steps)) {
    throw new TypeError("Route steps must be an array.");
  }

  const routeCoordinates = coordinates.map((coordinate, index) => {
    assertCoordinate(coordinate, `coordinates[${index}]`);
    return Object.freeze([...coordinate]);
  });
  const routeSteps = steps.map((step, index) => {
    if (!step || !Number.isFinite(step.threshold) || step.threshold < 0 || step.threshold > 1) {
      throw new TypeError(`steps[${index}].threshold must be a number from 0 to 1.`);
    }
    return Object.freeze({ ...step });
  }).sort((left, right) => left.threshold - right.threshold);

  const segments = [];
  let totalDistanceMeters = 0;
  for (let index = 1; index < routeCoordinates.length; index += 1) {
    const from = routeCoordinates[index - 1];
    const to = routeCoordinates[index];
    const distanceMeters = distanceBetween(from, to);
    const startDistanceMeters = totalDistanceMeters;
    totalDistanceMeters += distanceMeters;
    segments.push(Object.freeze({
      from,
      to,
      distanceMeters,
      startDistanceMeters,
      endDistanceMeters: totalDistanceMeters,
      bearing: bearingBetween(from, to),
    }));
  }

  if (totalDistanceMeters === 0) {
    throw new TypeError("A route must contain at least one non-zero-length segment.");
  }

  return Object.freeze({
    coordinates: Object.freeze(routeCoordinates),
    steps: Object.freeze(routeSteps),
    segments: Object.freeze(segments),
    totalDistanceMeters,
    walkingSpeedMetersPerSecond: WALKING_SPEED_METERS_PER_SECOND,
  });
}

/**
 * Returns a single synchronized location, orientation, ETA, and instruction frame.
 */
export function frameAt(route, progress) {
  if (!route || !Array.isArray(route.coordinates) || !Array.isArray(route.segments)) {
    throw new TypeError("frameAt requires a route returned by prepareRoute.");
  }

  const normalizedProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  const traveledDistanceMeters = route.totalDistanceMeters * normalizedProgress;
  const remainingDistanceMeters = Math.max(0, route.totalDistanceMeters - traveledDistanceMeters);
  const coordinate = coordinateAtDistance(route, traveledDistanceMeters);
  const segment = route.segments.find((candidate) => traveledDistanceMeters <= candidate.endDistanceMeters)
    ?? route.segments.at(-1);
  const etaSeconds = Math.ceil(remainingDistanceMeters / route.walkingSpeedMetersPerSecond);
  const instruction = instructionAt(route, normalizedProgress);

  return {
    progress: normalizedProgress,
    coordinate,
    bearing: segment.bearing,
    traveledDistanceMeters,
    remainingDistanceMeters,
    etaSeconds,
    etaMinutes: Math.ceil(etaSeconds / 60),
    instruction,
  };
}
