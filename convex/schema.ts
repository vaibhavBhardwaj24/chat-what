import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  // Supports both DMs (isGroup=false, 2 members) and group chats (isGroup=true, N members)
  conversations: defineTable({
    name: v.optional(v.string()),        // group name; undefined for DMs
    isGroup: v.boolean(),
    memberIds: v.array(v.id("users")),
    creatorId: v.optional(v.id("users")), // group creator
    lastMessageId: v.optional(v.id("messages")),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    deleted: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_user_emoji", ["messageId", "userId", "emoji"]),

  presence: defineTable({
    userId: v.id("users"),
    lastSeen: v.number(),
  }).index("by_user", ["userId"]),

  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastTyped: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  lastRead: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    readTime: v.number(),
  }).index("by_conversation_user", ["conversationId", "userId"]),
});
