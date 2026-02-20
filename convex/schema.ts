import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),
  
  conversations: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    lastMessageId: v.optional(v.id("messages")),
  }).index("by_users", ["user1", "user2"]),

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
    // _creationTime of the last message seen by this user
    readTime: v.number(),
  }).index("by_conversation_user", ["conversationId", "userId"]),
});
