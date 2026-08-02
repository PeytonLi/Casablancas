import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const show = v.object({
  artist: v.string(),
  date: v.string(),
  venue: v.string(),
  city: v.string(),
  ticketUrl: v.string(),
  provider: v.string(),
});

export const next = internalQuery({
  args: { artist: v.string(), today: v.string() },
  handler: async (ctx, { artist, today }) =>
    ctx.db
      .query("shows")
      .withIndex("by_artist_date", (q) =>
        q.eq("artist", artist).gte("date", today),
      )
      .order("asc")
      .first(),
});

export const seed = internalMutation({
  args: { shows: v.array(show) },
  handler: async (ctx, { shows }) => {
    for (const next of shows) {
      const existing = await ctx.db
        .query("shows")
        .withIndex("by_ticket_url", (q) => q.eq("ticketUrl", next.ticketUrl))
        .unique();
      if (existing) await ctx.db.patch(existing._id, next);
      else await ctx.db.insert("shows", next);
    }
    return { seeded: shows.length };
  },
});
