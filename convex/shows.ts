import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { DEMO_SHOW, normalizeArtistKey, toPublicShow } from "./showData";

const importShowValidator = v.object({
  artist: v.string(),
  date: v.string(),
  venue: v.string(),
  city: v.string(),
  ticketUrl: v.string(),
  provider: v.string(),
  sourceId: v.string(),
});

const publicShowValidator = v.object({
  artist: v.string(),
  date: v.string(),
  venue: v.string(),
  city: v.string(),
  ticketUrl: v.string(),
  provider: v.string(),
});

export const next = internalQuery({
  args: {
    artist: v.string(),
    today: v.string(),
  },
  returns: v.union(publicShowValidator, v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("shows")
      .withIndex("by_artist_date", (query) =>
        query
          .eq("artistKey", normalizeArtistKey(args.artist))
          .gte("date", args.today),
      )
      .order("asc")
      .first();

    return toPublicShow(document);
  },
});

export const ensureDemo = internalMutation({
  args: {},
  returns: v.id("shows"),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("shows")
      .withIndex("by_source_id", (query) =>
        query.eq("sourceId", DEMO_SHOW.sourceId),
      )
      .unique();

    if (existing) {
      await ctx.db.replace("shows", existing._id, DEMO_SHOW);
      return existing._id;
    }

    return await ctx.db.insert("shows", DEMO_SHOW);
  },
});

export const replace = internalMutation({
  args: {
    shows: v.array(importShowValidator),
  },
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const show of args.shows) {
      const document = {
        ...show,
        artistKey: normalizeArtistKey(show.artist),
      };
      const existing = await ctx.db
        .query("shows")
        .withIndex("by_source_id", (query) =>
          query.eq("sourceId", show.sourceId),
        )
        .unique();

      if (existing) {
        await ctx.db.replace("shows", existing._id, document);
        updated += 1;
      } else {
        await ctx.db.insert("shows", document);
        inserted += 1;
      }
    }

    return { inserted, updated };
  },
});
