import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
    });

    await ctx.db.patch(args.conversationId, { lastMessageId: messageId });
    return messageId;
  },
});

export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Not your message");

    await ctx.db.patch(args.messageId, { deleted: true });
  },
});

export const editMessage = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Not your message");
    if (!args.content.trim()) throw new Error("Message cannot be empty");

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      editedAt: Date.now(),
    });
  },
});

/**
 * Search messages across all conversations the current user is a member of.
 * Returns up to 50 results enriched with conversation name and sender info.
 */
export const searchMessages = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const term = args.searchQuery.trim().toLowerCase();
    if (term.length < 2) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return [];

    const allConvs = await ctx.db.query("conversations").collect();
    const myConvs = allConvs.filter((c) => c.memberIds.includes(me._id));

    const results: {
      messageId: string;
      conversationId: string;
      conversationName: string;
      isGroup: boolean;
      content: string;
      senderName: string;
      isMe: boolean;
      creationTime: number;
    }[] = [];

    for (const conv of myConvs) {
      let convName = conv.name ?? null;
      if (!convName && !conv.isGroup) {
        const otherId = conv.memberIds.find((id) => id !== me._id);
        if (otherId) {
          const other = await ctx.db.get(otherId);
          convName = other?.name ?? "Unknown";
        }
      }
      convName = convName ?? "Group Chat";

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      for (const msg of messages) {
        if (msg.deleted) continue;
        if (!msg.content.toLowerCase().includes(term)) continue;

        const sender = await ctx.db.get(msg.senderId);
        results.push({
          messageId: msg._id,
          conversationId: conv._id,
          conversationName: convName,
          isGroup: conv.isGroup,
          content: msg.content,
          senderName: sender?.name ?? "Unknown",
          isMe: msg.senderId === me._id,
          creationTime: msg._creationTime,
        });

        if (results.length >= 50) break;
      }
      if (results.length >= 50) break;
    }

    return results.sort((a, b) => b.creationTime - a.creationTime);
  },
});
