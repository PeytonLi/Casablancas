const MINUTES_PER_DAY = 24 * 60;

function minutes(time) {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
}

function haversineMeters([fromLng, fromLat], [toLng, toLat]) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLng - fromLng);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat))
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compareSets(left, right) {
  return left.day.localeCompare(right.day)
    || left.startTime.localeCompare(right.startTime)
    || left.artist.localeCompare(right.artist);
}

function transitionBetween(current, next, places) {
  const gapMinutes = minutes(next.startTime) - minutes(current.endTime);
  const walkMinutes = estimateWalkMinutes(current.stageId, next.stageId, places);
  const requiredMinutes = walkMinutes === null ? null : walkMinutes + 3;
  const reason = gapMinutes < 0
    ? "overlap"
    : requiredMinutes !== null && gapMinutes < requiredMinutes
      ? "travel"
      : null;

  return {
    currentId: current.id,
    nextId: next.id,
    gapMinutes,
    walkMinutes,
    leaveBy: requiredMinutes === null ? null : formatClock(minutes(next.startTime) - requiredMinutes),
    reason,
  };
}

function priorityWinner(current, next, savedIdIndexes) {
  if (current.featured !== next.featured) return current.featured ? current : next;
  return savedIdIndexes.get(current.id) <= savedIdIndexes.get(next.id) ? current : next;
}

export function formatClock(time) {
  const normalized = ((Number(time) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function estimateWalkMinutes(fromStageId, toStageId, places) {
  const from = places.find((place) => place.id === fromStageId);
  const to = places.find((place) => place.id === toStageId);
  if (!from || !to) return null;
  const meters = haversineMeters(from.coordinates, to.coordinates);
  return Math.max(2, Math.ceil((meters * 1.35) / 1.2 / 60));
}

export function filterSchedule(sets, { day, query, stageId } = {}) {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase();
  return sets
    .filter((set) => (!day || set.day === day)
      && (!normalizedQuery || set.artist.toLocaleLowerCase().includes(normalizedQuery))
      && (!stageId || stageId === "all" || set.stageId === stageId))
    .sort(compareSets);
}

export function sanitizeSavedIds(value, sets) {
  if (!Array.isArray(value)) return [];
  const knownIds = new Set(sets.map((set) => set.id));
  const savedIds = new Set();
  return value.filter((id) => {
    if (typeof id !== "string" || !knownIds.has(id) || savedIds.has(id)) return false;
    savedIds.add(id);
    return true;
  });
}

export function analyzePlan(savedIds, sets, places) {
  const ids = sanitizeSavedIds(savedIds, sets);
  const savedIdIndexes = new Map(ids.map((id, index) => [id, index]));
  const setById = new Map(sets.map((set) => [set.id, set]));
  const plannedSets = ids.map((id) => setById.get(id)).sort(compareSets);
  const transitions = [];
  const conflicts = [];

  for (let index = 0; index < plannedSets.length - 1; index += 1) {
    const current = plannedSets[index];
    const next = plannedSets[index + 1];
    if (current.day !== next.day) continue;

    const transition = transitionBetween(current, next, places);
    transitions.push(transition);
    if (!transition.reason) continue;

    const keep = priorityWinner(current, next, savedIdIndexes);
    const remove = keep.id === current.id ? next : current;
    conflicts.push({
      ...transition,
      keepId: keep.id,
      removeId: remove.id,
    });
  }

  return { sets: plannedSets, transitions, conflicts };
}

export function recommendGap(savedIds, sets, places) {
  const plan = analyzePlan(savedIds, sets, places);
  const selectedIds = new Set(plan.sets.map((set) => set.id));
  const candidates = [];

  for (let index = 0; index < plan.sets.length - 1; index += 1) {
    const current = plan.sets[index];
    const next = plan.sets[index + 1];
    const rawGap = minutes(next.startTime) - minutes(current.endTime);
    if (current.day !== next.day || rawGap < 30 || rawGap > 90) continue;

    for (const candidate of sets) {
      if (selectedIds.has(candidate.id) || candidate.day !== current.day) continue;
      if (minutes(candidate.startTime) < minutes(current.endTime)
        || minutes(candidate.endTime) > minutes(next.startTime)) continue;

      const arrival = transitionBetween(current, candidate, places);
      const departure = transitionBetween(candidate, next, places);
      if (arrival.walkMinutes === null || departure.walkMinutes === null
        || arrival.reason || departure.reason) continue;

      const walkMinutes = arrival.walkMinutes;
      candidates.push({ candidate, current, walkMinutes });
    }
  }

  candidates.sort((left, right) => Number(right.candidate.stageId === right.current.stageId) - Number(left.candidate.stageId === left.current.stageId)
    || left.walkMinutes - right.walkMinutes
    || left.candidate.startTime.localeCompare(right.candidate.startTime)
    || left.candidate.artist.localeCompare(right.candidate.artist));
  return candidates[0]?.candidate ?? null;
}
