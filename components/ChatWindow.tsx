"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@clerk/nextjs";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatTimestamp } from "@/lib/format-timestamp";
import { ArrowLeft, Send, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/Sidebar";

const SCROLL_THRESHOLD = 120; // px from bottom to be considered "near bottom"

interface ChatWindowProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { session } = useSession();
  const [input, setInput] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useQuery(api.messages.list, { conversationId });
  const conversations = useQuery(api.conversations.list, session ? {} : "skip");
  const typingUsers = useQuery(api.typing.getTypingUsers, { conversationId });
  const onlineUsers = useQuery(api.presence.getOnlineUsers, session ? {} : "skip");

  const sendMessage = useMutation(api.messages.send);
  const setTyping = useMutation(api.typing.setTyping);
  const markRead = useMutation(api.lastRead.markRead);

  const conversation = conversations?.find((c) => c._id === conversationId);
  const otherUser = conversation?.otherUser;
  const isOtherUserOnline = otherUser?._id
    ? (onlineUsers ?? []).includes(otherUser._id)
    : false;

  // Mark as read when the conversation opens or changes
  useEffect(() => {
    markRead({ conversationId }).catch(console.error);
    setNewMessageCount(0);
    setShowScrollButton(false);
    prevMessageCountRef.current = 0;
    isNearBottomRef.current = true;
    scrollToBottom("instant");
  }, [conversationId, markRead]);

  // Smart scroll: auto-scroll only when near bottom; otherwise show button
  useEffect(() => {
    if (!messages) return;
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    if (currentCount > prevCount) {
      const newCount = currentCount - prevCount;
      prevMessageCountRef.current = currentCount;

      if (isNearBottomRef.current) {
        // Near bottom — scroll automatically and mark read
        scrollToBottom("smooth");
        markRead({ conversationId }).catch(console.error);
        setNewMessageCount(0);
      } else {
        // Scrolled up — show the "new messages" button
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

  const handleTyping = useCallback(
    (value: string) => {
      setInput(value);
      if (!value.trim()) return;
      setTyping({ conversationId }).catch(console.error);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    },
    [conversationId, setTyping]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await sendMessage({ conversationId, content: trimmed });
    // After sending, always scroll to bottom
    isNearBottomRef.current = true;
    setShowScrollButton(false);
    setNewMessageCount(0);
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const activeTypers = (typingUsers ?? []).filter(Boolean);

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-50 min-w-0">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shadow-sm shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 transition text-gray-500"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {otherUser ? (
          <>
            <Avatar
              imageUrl={otherUser.imageUrl}
              name={otherUser.name}
              isOnline={isOtherUserOnline}
            />
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {otherUser.name}
              </p>
              <p
                className={`text-xs transition-colors ${
                  isOtherUserOnline ? "text-green-600" : "text-gray-400"
                }`}
              >
                {isOtherUserOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        ) : (
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {messages === undefined ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading messages...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            <span className="text-5xl">👋</span>
            <p className="font-medium text-gray-600">Start the conversation!</p>
            <p className="text-sm">
              Say hi to {otherUser?.name ?? "this person"} — they&apos;re waiting.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.senderId !== otherUser?._id;
              const prevMsg = messages[i - 1];
              const showTimestamp =
                !prevMsg || msg._creationTime - prevMsg._creationTime > 5 * 60 * 1000;

              return (
                <div key={msg._id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border">
                        {formatTimestamp(msg._creationTime)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm border"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ↓ New messages floating button */}
      {showScrollButton && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <button
            onClick={handleScrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg transition"
          >
            <ChevronDown className="w-4 h-4" />
            {newMessageCount > 0
              ? `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""}`
              : "Scroll to bottom"}
          </button>
        </div>
      )}

      {/* Typing Indicator */}
      <div className="px-4 h-6 flex items-center shrink-0">
        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{activeTypers[0]?.name} is typing</span>
            <span className="flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t bg-white shrink-0"
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          className="flex-1 px-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
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
