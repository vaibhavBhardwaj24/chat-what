import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentUserId = user._id;

    // Check if conversation already exists
    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_users", (q) =>
        q.eq("user1", currentUserId).eq("user2", args.otherUserId)
      )
      .unique() ||
      await ctx.db
      .query("conversations")
      .withIndex("by_users", (q) =>
        q.eq("user1", args.otherUserId).eq("user2", currentUserId)
      )
      .unique();

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    return await ctx.db.insert("conversations", {
      user1: currentUserId,
      user2: args.otherUserId,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    const conversations = await ctx.db
      .query("conversations")
      .collect();

    const filteredConversations = conversations.filter(
      (c) => c.user1 === user._id || c.user2 === user._id
    );

    const conversationsWithDetails = await Promise.all(
      filteredConversations.map(async (c) => {
        const otherUserId = c.user1 === user._id ? c.user2 : c.user1;
        const otherUser = await ctx.db.get(otherUserId);
        const lastMessage = c.lastMessageId ? await ctx.db.get(c.lastMessageId) : null;

        return {
          ...c,
          otherUser,
          lastMessage,
        };
      })
    );

    // Sort by last message time descending
    return conversationsWithDetails.sort((a, b) => {
        const timeA = a.lastMessage?._creationTime ?? a._creationTime;
        const timeB = b.lastMessage?._creationTime ?? b._creationTime;
        return timeB - timeA;
    });
  },
});
