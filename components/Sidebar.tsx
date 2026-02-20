"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useSession } from "@clerk/nextjs";
import { formatTimestamp } from "@/lib/format-timestamp";
import { MessageSquare, Search, Users } from "lucide-react";

interface SidebarProps {
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
}

export function Sidebar({
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"chats" | "search">("chats");

  const conversations = useQuery(api.conversations.list, session ? {} : "skip");
  const searchResults = useQuery(
    api.users.searchUsers,
    session && tab === "search" ? { searchTerm } : "skip"
  );
  const onlineUsers = useQuery(api.presence.getOnlineUsers, session ? {} : "skip");
  const onlineSet = new Set(onlineUsers ?? []);

  const getOrCreate = useMutation(api.conversations.getOrCreate);
  const markRead = useMutation(api.lastRead.markRead);

  const handleSelectConversation = async (id: Id<"conversations">) => {
    onSelectConversation(id);
    await markRead({ conversationId: id }).catch(console.error);
  };

  const handleUserClick = async (userId: Id<"users">) => {
    const convId = await getOrCreate({ otherUserId: userId });
    const id = convId as Id<"conversations">;
    onSelectConversation(id);
    await markRead({ conversationId: id }).catch(console.error);
    setTab("chats");
    setSearchTerm("");
  };

  return (
    <aside className="w-full md:w-80 border-r bg-white flex flex-col h-full shrink-0">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "chats"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chats
        </button>
        <button
          onClick={() => setTab("search")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === "search"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          People
        </button>
      </div>

      {/* Search bar */}
      {tab === "search" && (
        <div className="p-3 border-b bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {!session ? (
          <EmptyState icon="🔐" title="Sign in" body="Please sign in to see your chats." />
        ) : tab === "chats" ? (
          conversations === undefined ? (
            <LoadingSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No conversations yet"
              body='Switch to "People" to find someone and start chatting!'
            />
          ) : (
            <ul className="divide-y">
              {conversations.map((c) => {
                const isOnline = c.otherUser?._id ? onlineSet.has(c.otherUser._id) : false;
                const isSelected = selectedConversationId === c._id;
                return (
                  <ConversationItem
                    key={c._id}
                    conversation={c}
                    isOnline={isOnline}
                    isSelected={isSelected}
                    onSelect={() => handleSelectConversation(c._id)}
                  />
                );
              })}
            </ul>
          )
        ) : searchResults === undefined ? (
          <LoadingSkeleton />
        ) : searchTerm === "" ? (
          <EmptyState
            icon="🔍"
            title="Search for people"
            body="Type a name above to find users to chat with."
          />
        ) : searchResults.length === 0 ? (
          <EmptyState
            icon="😔"
            title="No users found"
            body={`No results for "${searchTerm}". Try a different name.`}
          />
        ) : (
          <ul className="divide-y">
            {searchResults.map((user) => {
              const isOnline = onlineSet.has(user._id);
              return (
                <li
                  key={user._id}
                  onClick={() => handleUserClick(user._id)}
                  className="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition"
                >
                  <Avatar imageUrl={user.imageUrl} name={user.name} isOnline={isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      {isOnline && (
                        <span className="text-xs text-green-600 font-medium shrink-0">Online</span>
                      )}
                    </div>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

// Separate component so each conversation queries its own unread count independently
function ConversationItem({
  conversation,
  isOnline,
  isSelected,
  onSelect,
}: {
  conversation: {
    _id: Id<"conversations">;
    otherUser?: { _id: Id<"users">; name: string; imageUrl?: string | null } | null;
    lastMessage?: { content: string; _creationTime: number } | null;
  };
  isOnline: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const unreadCount = useQuery(api.lastRead.getUnreadCount, {
    conversationId: conversation._id,
  });

  return (
    <li
      onClick={onSelect}
      className={`p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition ${
        isSelected ? "bg-blue-50" : ""
      }`}
    >
      <Avatar
        imageUrl={conversation.otherUser?.imageUrl}
        name={conversation.otherUser?.name ?? "?"}
        isOnline={isOnline}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <p className={`text-sm truncate ${(unreadCount ?? 0) > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
            {conversation.otherUser?.name ?? "Unknown"}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.lastMessage && (
              <span className="text-xs text-gray-400">
                {formatTimestamp(conversation.lastMessage._creationTime)}
              </span>
            )}
            {(unreadCount ?? 0) > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold leading-none">
                {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
        <p className={`text-xs truncate mt-0.5 ${(unreadCount ?? 0) > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
          {conversation.lastMessage ? conversation.lastMessage.content : "No messages yet"}
        </p>
      </div>
    </li>
  );
}

export function Avatar({
  imageUrl,
  name,
  isOnline = false,
}: {
  imageUrl?: string | null;
  name: string;
  isOnline?: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shadow-sm">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-blue-600 font-semibold text-sm">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-2 text-gray-400">
      <span className="text-4xl">{icon}</span>
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm">{body}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
