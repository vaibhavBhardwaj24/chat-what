"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Returns unread count for a single conversation.
 * Returns 0 while loading.
 */
export function useUnreadCount(conversationId: Id<"conversations"> | undefined) {
  const count = useQuery(
    api.lastRead.getUnreadCount,
    conversationId ? { conversationId } : "skip"
  );
  return count ?? 0;
}
