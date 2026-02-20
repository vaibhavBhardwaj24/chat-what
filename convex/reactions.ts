import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

/**
 * Toggle a reaction: if the user already reacted with this emoji, remove it;
 * otherwise add it. Only allows the fixed emoji set.
 */
export const toggleReaction = mutation({
  args: { messageId: v.id("messages"), emoji: v.string() },
  handler: async (ctx, args) => {
    if (!ALLOWED_EMOJIS.includes(args.emoji as AllowedEmoji)) {
      throw new Error(`Emoji "${args.emoji}" is not allowed`);
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user_emoji", (q) =>
        q
          .eq("messageId", args.messageId)
          .eq("userId", user._id)
          .eq("emoji", args.emoji)
      )
      .unique();

    if (existing) {
      // Already reacted — remove it
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: user._id,
        emoji: args.emoji,
      });
    }
  },
});

/**
 * Returns all reactions for a message, including whether the current user
 * has reacted with each. Grouped format: { emoji, count, reactedByMe }[]
 */
export const listForMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const currentUser = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_token", (q) =>
            q.eq("tokenIdentifier", identity.tokenIdentifier)
          )
          .unique()
      : null;

    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Group by emoji
    const grouped: Record<string, { count: number; reactedByMe: boolean }> = {};
    for (const r of reactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, reactedByMe: false };
      }
      grouped[r.emoji].count++;
      if (currentUser && r.userId === currentUser._id) {
        grouped[r.emoji].reactedByMe = true;
      }
    }

    return Object.entries(grouped).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  },
});
