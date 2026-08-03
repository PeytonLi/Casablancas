const place = (id, name, category, coordinates, shortDescription) =>
  Object.freeze({
    id,
    name,
    category,
    coordinates: Object.freeze(coordinates),
    shortDescription,
  });

export const CATEGORY_LABELS = Object.freeze({
  stage: "Stage",
  restroom: "Restroom",
  water: "Water refill",
  food: "Food & drink",
  attraction: "Attraction",
  merch: "Merch",
  entrance: "Entrance",
});

export const FESTIVAL_PLACES = Object.freeze([
  place("lands-end", "Lands End", "stage", [-122.494, 37.7717], "The festival's main stage, set against the park's western meadow."),
  place("sutro", "Sutro", "stage", [-122.4917, 37.7712], "A broad lawn stage for big afternoon and sunset sets."),
  place("twin-peaks", "Twin Peaks", "stage", [-122.4893, 37.7708], "The high-energy stage in the heart of the festival grounds."),
  place("panhandle", "Panhandle", "stage", [-122.487, 37.7698], "An intimate stage tucked along the tree line."),
  place("soma", "SOMA", "stage", [-122.4876, 37.7679], "Electronic music and late-night dance sets under the trees."),
  place("dolores", "Dolores", "stage", [-122.4901, 37.7682], "A relaxed stage with a low-key neighborhood feel."),
  place("cocktail-magic", "Cocktail Magic", "attraction", [-122.4923, 37.7693], "Cocktail demonstrations, tastings, and bar-side surprises."),
  place("grass-lands", "Grass Lands", "attraction", [-122.4931, 37.7685], "Cannabis culture, education, and laid-back lounge programming."),
  place("gastromagic", "GastroMagic", "attraction", [-122.491, 37.769], "Chef-led food experiments, performances, and unexpected pairings."),
  place("merch", "Official Merch", "merch", [-122.4927, 37.7703], "Festival posters, shirts, hats, and artist merchandise."),
  place("food-alley", "Food Alley", "food", [-122.4902, 37.7701], "A central row of Bay Area vendors and festival favorites."),
  place("wine-lands", "Wine Lands", "food", [-122.4887, 37.7689], "California wine pours and shaded seating."),
  place("beer-hall", "Beer Hall", "food", [-122.4897, 37.7674], "Local breweries, cold drinks, and a quick place to regroup."),
  place("north-entrance", "North Entrance", "entrance", [-122.4935, 37.772], "Main entry near the north edge of the festival."),
  place("south-entrance", "South Entrance", "entrance", [-122.4864, 37.7673], "South-side gate with security and ticket scanning."),
  place("west-entrance", "West Entrance", "entrance", [-122.494, 37.7695], "A convenient entry for arrivals from the park's west side."),
  place("lands-end-restrooms", "Lands End Restrooms", "restroom", [-122.4933, 37.771], "Restrooms just south of Lands End."),
  place("sutro-restrooms", "Sutro Restrooms", "restroom", [-122.491, 37.7709], "Restrooms near the Sutro lawn."),
  place("soma-restrooms", "SOMA Restrooms", "restroom", [-122.4868, 37.7684], "Restrooms beside the SOMA dance area."),
  place("north-water", "North Water Refill", "water", [-122.492, 37.7714], "Free refill station near the northern stages."),
  place("central-water", "Central Water Refill", "water", [-122.4904, 37.7695], "Free water refill in the middle of the grounds."),
  place("south-water", "South Water Refill", "water", [-122.4881, 37.7678], "Free water refill near SOMA and Dolores."),
]);
