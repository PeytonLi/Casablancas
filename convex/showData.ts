export type ShowData = {
  artist: string;
  artistKey: string;
  date: string;
  venue: string;
  city: string;
  ticketUrl: string;
  provider: string;
  sourceId: string;
};

export type PublicShow = Pick<
  ShowData,
  "artist" | "date" | "venue" | "city" | "ticketUrl" | "provider"
>;

export function normalizeArtistKey(artist: string): string {
  return artist.trim().replace(/\s+/g, " ").toLowerCase();
}

export const DEMO_SHOW: ShowData = {
  artist: "The Strokes",
  artistKey: normalizeArtistKey("The Strokes"),
  date: "2026-08-08",
  venue: "Outside Lands — Lands End Stage",
  city: "San Francisco, CA",
  ticketUrl: "https://sfoutsidelands.com/tickets/",
  provider: "JamBase",
  sourceId: "demo:outside-lands-2026-the-strokes",
};

export function toPublicShow(show: ShowData | null): PublicShow | null {
  if (show === null) return null;

  const { artist, date, venue, city, ticketUrl, provider } = show;
  return { artist, date, venue, city, ticketUrl, provider };
}
