import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Call this whenever the user opens a conversation.
 * Records Date.now() as their read cursor for that conversation.
 */
export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return;

    const existing = await ctx.db
      .query("lastRead")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { readTime: Date.now() });
    } else {
      await ctx.db.insert("lastRead", {
        conversationId: args.conversationId,
        userId: user._id,
        readTime: Date.now(),
      });
    }
  },
});

/**
 * Returns the number of unread messages in a conversation for the current user.
 */
export const getUnreadCount = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return 0;

    const lastRead = await ctx.db
      .query("lastRead")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    const readTime = lastRead?.readTime ?? 0;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Count messages from OTHER users that arrived after readTime
    return messages.filter(
      (m) => m.senderId !== user._id && m._creationTime > readTime
    ).length;
  },
});
