import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== identity.name || user.imageUrl !== identity.pictureUrl) {
        await ctx.db.patch(user._id, { 
            name: identity.name ?? "Anonymous",
            imageUrl: identity.pictureUrl
         });
      }
      return user._id;
    }

    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email,
      imageUrl: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const users = await ctx.db.query("users").collect();
    
    // Filter out the current user and filter by search term
    return users.filter(user => {
       const notMe = user.tokenIdentifier !== identity.tokenIdentifier;
       const matchesSearch = user.name.toLowerCase().includes(args.searchTerm.toLowerCase());
       return notMe && matchesSearch;
    });
  },
});
