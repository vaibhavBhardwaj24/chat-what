import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Toggle pin for the current user on a conversation */
export const togglePin = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("pins")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", args.conversationId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false; // unpinned
    } else {
      await ctx.db.insert("pins", { userId: user._id, conversationId: args.conversationId });
      return true; // pinned
    }
  },
});

/** Returns the set of pinned conversation IDs for the current user */
export const getPinnedIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return pins.map((p) => p.conversationId);
  },
});
