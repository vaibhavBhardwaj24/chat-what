import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: get current user or throw
async function getCurrentUser(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> }; db: { query: (t: string) => { withIndex: (idx: string, fn: (q: { eq: (f: string, v: string) => unknown }) => unknown) => { unique: () => Promise<{ _id: string } | null> } } } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: { eq: (f: string, v: string) => unknown }) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

/** Get or create a 1-on-1 DM conversation */
export const getOrCreate = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) throw new Error("User not found");

    // Find existing DM
    const all = await ctx.db.query("conversations").collect();
    const existing = all.find(
      (c) =>
        !c.isGroup &&
        c.memberIds.length === 2 &&
        c.memberIds.includes(me._id) &&
        c.memberIds.includes(args.otherUserId)
    );
    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      isGroup: false,
      memberIds: [me._id, args.otherUserId],
    });
  },
});

/** Create a new group conversation */
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) throw new Error("User not found");

    if (args.memberIds.length < 1) throw new Error("A group needs at least one other member");
    const allMembers = Array.from(new Set([me._id, ...args.memberIds]));

    return await ctx.db.insert("conversations", {
      name: args.name.trim(),
      isGroup: true,
      memberIds: allMembers,
      creatorId: me._id,
    });
  },
});

/** List all conversations (DMs + groups) the current user is in */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return [];

    const all = await ctx.db.query("conversations").collect();
    const mine = all.filter((c) => c.memberIds.includes(me._id));

    const enriched = await Promise.all(
      mine.map(async (c) => {
        const lastMessage = c.lastMessageId ? await ctx.db.get(c.lastMessageId) : null;

        if (c.isGroup) {
          // For groups return member count and name
          return {
            ...c,
            otherUser: null,
            memberCount: c.memberIds.length,
            lastMessage,
          };
        } else {
          // DM: get the other user
          const otherId = c.memberIds.find((id) => id !== me._id);
          const otherUser = otherId ? await ctx.db.get(otherId) : null;
          return {
            ...c,
            otherUser,
            memberCount: 2,
            lastMessage,
          };
        }
      })
    );

    return enriched.sort((a, b) => {
      const timeA = a.lastMessage?._creationTime ?? a._creationTime;
      const timeB = b.lastMessage?._creationTime ?? b._creationTime;
      return timeB - timeA;
    });
  },
});

/** Get members of a conversation (for group header display) */
export const getMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return [];
    return await Promise.all(conv.memberIds.map((id) => ctx.db.get(id)));
  },
});
