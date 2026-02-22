"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@clerk/nextjs";
import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Send, ChevronDown, Users, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/Sidebar";
import { MessageBubble } from "@/components/MessageBubble";

const SCROLL_THRESHOLD = 120;

interface ChatWindowProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { session } = useSession();
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // @mention autocomplete state
  const [mentionSearch, setMentionSearch] = useState<string | null>(null); // null = not active
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useQuery(api.messages.list, { conversationId });
  const conversations = useQuery(api.conversations.list, session ? {} : "skip");
  const members = useQuery(api.conversations.getMembers, { conversationId });
  const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
  const onlineUsers = useQuery(api.presence.getOnlineUsers, session ? {} : "skip");
  const me = useQuery(api.users.getMe);
  const readers = useQuery(api.lastRead.getReaders, { conversationId });

  const sendMessage = useMutation(api.messages.send);
  const setTyping = useMutation(api.typing.setTyping);
  const markRead = useMutation(api.lastRead.markRead);

  const conversation = conversations?.find((c) => c._id === conversationId);
  const isGroup = conversation?.isGroup ?? false;
  const groupName = conversation?.name ?? "Group Chat";
  const otherUser = conversation?.otherUser;
  const isOtherUserOnline = !isGroup && otherUser?._id
    ? (onlineUsers ?? []).includes(otherUser._id)
    : false;

  // Valid members for @mention (exclude current user)
  const mentionableMembers = (members?.filter(Boolean) as { _id: Id<"users">; name: string; imageUrl?: string | null }[] ?? [])
    .filter((m) => m._id !== me?._id);
  const filteredMentions = mentionSearch !== null
    ? mentionableMembers.filter((m) => m.name.toLowerCase().startsWith(mentionFilter.toLowerCase()))
    : [];

  // Mark as read on open
  useEffect(() => {
    markRead({ conversationId }).catch(console.error);
    setNewMessageCount(0);
    setShowScrollButton(false);
    setSendError(null);
    setPendingMessage(null);
    prevMessageCountRef.current = 0;
    isNearBottomRef.current = true;
    setMentionSearch(null);
    scrollToBottom("instant");
  }, [conversationId, markRead]);

  // Smart scroll on new messages
  useEffect(() => {
    if (!messages) return;
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    if (currentCount > prevCount) {
      const newCount = currentCount - prevCount;
      prevMessageCountRef.current = currentCount;
      if (isNearBottomRef.current) {
        scrollToBottom("smooth");
        markRead({ conversationId }).catch(console.error);
        setNewMessageCount(0);
      } else {
        setNewMessageCount((n) => n + newCount);
        setShowScrollButton(true);
      }
    } else {
      prevMessageCountRef.current = currentCount;
    }
  }, [messages, conversationId, markRead]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScrollToBottom = () => {
    scrollToBottom("smooth");
    setShowScrollButton(false);
    setNewMessageCount(0);
    markRead({ conversationId }).catch(console.error);
  };

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= SCROLL_THRESHOLD;
    if (isNearBottomRef.current) {
      setShowScrollButton(false);
      setNewMessageCount(0);
      markRead({ conversationId }).catch(console.error);
    }
  }, [conversationId, markRead]);

  /** Detect @ trigger and update mention autocomplete state */
  const handleTyping = useCallback((value: string) => {
    setInput(value);
    if (!value.trim()) return;
    setTyping({ conversationId }).catch(console.error);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);

    // @mention detection — only in groups
    if (isGroup) {
      const lastAtIdx = value.lastIndexOf("@");
      if (lastAtIdx !== -1) {
        const afterAt = value.slice(lastAtIdx + 1);
        // Only trigger if there's no space after @
        if (!afterAt.includes(" ")) {
          setMentionSearch(afterAt);
          setMentionFilter(afterAt);
          return;
        }
      }
      setMentionSearch(null);
    }
  }, [conversationId, setTyping, isGroup]);

  /** Insert selected mention into the input */
  const handleSelectMention = (name: string) => {
    if (!inputRef.current) return;
    const lastAtIdx = input.lastIndexOf("@");
    const newValue = input.slice(0, lastAtIdx) + `@${name} `;
    setInput(newValue);
    setMentionSearch(null);
    inputRef.current.focus();
  };

  const doSend = async (content: string) => {
    setSendError(null);
    try {
      await sendMessage({ conversationId, content });
      setPendingMessage(null);
      isNearBottomRef.current = true;
      setShowScrollButton(false);
      setNewMessageCount(0);
      setTimeout(() => scrollToBottom("smooth"), 50);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      setPendingMessage(content);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    setMentionSearch(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await doSend(trimmed);
  };

  const handleRetry = async () => {
    if (!pendingMessage) return;
    await doSend(pendingMessage);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionSearch !== null && filteredMentions.length > 0 && e.key === "Escape") {
      e.preventDefault();
      setMentionSearch(null);
    }
  };

  const activeTypers = (typingUsers ?? []).filter(Boolean);
  const headerName = isGroup ? groupName : (otherUser?.name ?? "...");
  const headerSub = isGroup ? `${members?.length ?? "?"} members` : isOtherUserOnline ? "Online" : "Offline";
  const lastMyMsgIdx = messages
    ? messages.reduce((last, m, idx) => (me && m.senderId === me._id ? idx : last), -1)
    : -1;

  const typedMembers = (members?.filter(Boolean) ?? []) as { _id: Id<"users">; name: string; imageUrl?: string | null }[];

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-50 dark:bg-gray-950 min-w-0">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm shrink-0">
        <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {isGroup ? (
          <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        ) : otherUser ? (
          <Avatar imageUrl={otherUser.imageUrl} name={otherUser.name} isOnline={isOtherUserOnline} />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {conversation ? (
            <>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">{headerName}</p>
              <p className={`text-xs transition-colors ${!isGroup && isOtherUserOnline ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>{headerSub}</p>
            </>
          ) : (
            <div className="space-y-1 animate-pulse">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-28" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages === undefined ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500 gap-2">
            <span className="text-5xl">{isGroup ? "👥" : "👋"}</span>
            <p className="font-medium text-gray-600 dark:text-gray-300">{isGroup ? `Welcome to ${groupName}!` : "Start the conversation!"}</p>
            <p className="text-sm">{isGroup ? "Send the first message to your group." : `Say hi to ${otherUser?.name ?? "this person"}.`}</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = me ? msg.senderId === me._id : false;
              const prevMsg = messages[i - 1];
              const showTimestamp = !prevMsg || msg._creationTime - prevMsg._creationTime > 5 * 60 * 1000;
              const showReaders = isMe && i === lastMyMsgIdx && readers && readers.length > 0;
              return (
                <div key={msg._id}>
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showTimestamp={showTimestamp}
                    isGroup={isGroup}
                    members={typedMembers}
                  />
                  {showReaders && (
                    <div className="flex justify-end items-center gap-1 mt-0.5 pr-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-0.5">{isGroup ? "Seen by" : "Seen"}</span>
                      <div className="flex -space-x-1">
                        {readers.slice(0, 3).map((r) => (
                          <div key={r._id} title={r.name} className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-white dark:border-gray-950 overflow-hidden flex items-center justify-center">
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400">{r.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        ))}
                        {readers.length > 3 && (
                          <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-gray-950 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">+{readers.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ↓ New messages button */}
      {showScrollButton && (
        <div className="relative h-0 overflow-visible z-10">
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            <button onClick={handleScrollToBottom} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg transition">
              <ChevronDown className="w-4 h-4" />
              {newMessageCount > 0 ? `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""}` : "Scroll to bottom"}
            </button>
          </div>
        </div>
      )}

      {/* Send error */}
      {sendError && (
        <div className="mx-4 mb-2 flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <span className="flex-1 truncate">⚠️ {sendError}</span>
          <button onClick={handleRetry} className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition shrink-0">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
          <button onClick={() => { setSendError(null); setPendingMessage(null); }} className="text-red-400 hover:text-red-600 transition shrink-0">✕</button>
        </div>
      )}

      {/* Typing Indicator */}
      <div className="px-4 h-6 flex items-center shrink-0">
        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{activeTypers.length === 1 ? `${activeTypers[0]?.name} is typing` : `${activeTypers.length} people are typing`}</span>
            <span className="flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* @mention autocomplete */}
      {mentionSearch !== null && filteredMentions.length > 0 && (
        <div className="mx-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
            Mention a member
          </div>
          <ul>
            {filteredMentions.slice(0, 6).map((m) => (
              <li
                key={m._id}
                onMouseDown={(e) => { e.preventDefault(); handleSelectMention(m.name); }}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden shrink-0">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{m.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">@{m.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <input
          ref={inputRef}
          type="text"
          placeholder={isGroup ? "Type a message... (@ to mention)" : "Type a message..."}
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
