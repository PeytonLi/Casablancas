import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shows: defineTable({
    artist: v.string(),
    artistKey: v.string(),
    date: v.string(),
    venue: v.string(),
    city: v.string(),
    ticketUrl: v.string(),
    provider: v.string(),
    sourceId: v.string(),
  })
    .index("by_artist_date", ["artistKey", "date"])
    .index("by_source_id", ["sourceId"]),
});
