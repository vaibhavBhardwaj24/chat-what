import { mutation, query } from "./_generated/server";

// Called periodically (every 30s) from client to mark user as online.
export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
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
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", { userId: user._id, lastSeen: Date.now() });
    }
  },
});

// Returns a map of userId → isOnline (true if lastSeen within 60s).
export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const presence = await ctx.db.query("presence").collect();
    const threshold = Date.now() - 60_000; // 60 seconds
    const onlineSet = new Set<string>();
    for (const p of presence) {
      if (p.lastSeen >= threshold) {
        onlineSet.add(p.userId);
      }
    }
    return Array.from(onlineSet);
  },
});
