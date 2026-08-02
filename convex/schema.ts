import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shows: defineTable({
    artist: v.string(),
    date: v.string(),
    venue: v.string(),
    city: v.string(),
    ticketUrl: v.string(),
    provider: v.string(),
  })
    .index("by_artist_date", ["artist", "date"])
    .index("by_ticket_url", ["ticketUrl"]),
});
