/**
 * Deterministic walking route from the Lands End Stage at the Polo Field to
 * the Sutro Stage at Lindley Meadow. Coordinates use [longitude, latitude].
 */
const freezeCoordinate = (coordinate) => Object.freeze([...coordinate]);

export const NAVIGATION_ROUTE = Object.freeze([
  freezeCoordinate([-122.49295, 37.76856]), // Lands End Stage / Polo Field
  freezeCoordinate([-122.49263, 37.76872]),
  freezeCoordinate([-122.49222, 37.76891]),
  freezeCoordinate([-122.49179, 37.76902]),
  freezeCoordinate([-122.49152, 37.76934]),
  freezeCoordinate([-122.49108, 37.76969]),
  freezeCoordinate([-122.49055, 37.76986]),
  freezeCoordinate([-122.48996, 37.77001]),
  freezeCoordinate([-122.48943, 37.77027]),
  freezeCoordinate([-122.48916, 37.77048]), // Sutro Stage / Lindley Meadow
]);

export const VENUE_MARKERS = Object.freeze([
  Object.freeze({
    id: 'lands-end-stage',
    type: 'stage',
    label: 'Lands End Stage',
    coordinates: freezeCoordinate([-122.49295, 37.76856]),
  }),
  Object.freeze({
    id: 'polo-field-water',
    type: 'water',
    label: 'Water refill',
    coordinates: freezeCoordinate([-122.49179, 37.76902]),
  }),
  Object.freeze({
    id: 'lindley-restrooms',
    type: 'restroom',
    label: 'Restrooms',
    coordinates: freezeCoordinate([-122.49055, 37.76986]),
  }),
  Object.freeze({
    id: 'sutro-stage',
    type: 'stage',
    label: 'Sutro Stage',
    coordinates: freezeCoordinate([-122.48916, 37.77048]),
  }),
]);

export const NAVIGATION_STEPS = Object.freeze([
  Object.freeze({
    id: 'depart',
    threshold: 0,
    title: 'Head northeast',
    detail: 'Follow the Polo Field path toward Sutro Stage.',
    maneuver: 'straight',
    instruction: 'Leave Lands End Stage and head northeast along the Polo Field path.',
  }),
  Object.freeze({
    id: 'turn-north',
    threshold: 0.31,
    title: 'Turn left at water refill',
    detail: 'Follow the path north alongside the meadow.',
    maneuver: 'left',
    instruction: 'Turn left at the water refill station and follow the path north.',
  }),
  Object.freeze({
    id: 'turn-east',
    threshold: 0.62,
    title: 'Turn right at restrooms',
    detail: 'Continue east toward Sutro Stage.',
    maneuver: 'right',
    instruction: 'At the Lindley restrooms, turn right and continue east toward Sutro.',
  }),
  Object.freeze({
    id: 'approach',
    threshold: 0.84,
    title: 'Sutro Stage is ahead',
    detail: 'Keep straight toward the stage entrance.',
    maneuver: 'straight',
    instruction: 'Sutro Stage is ahead at Lindley Meadow.',
  }),
  Object.freeze({
    id: 'arrive',
    threshold: 1,
    title: 'You have arrived',
    detail: 'Sutro Stage is directly ahead.',
    maneuver: 'arrive',
    instruction: 'You have arrived at Sutro Stage.',
  }),
]);
