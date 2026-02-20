"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { formatTimestamp } from "@/lib/format-timestamp";
import { ArrowLeft, Send } from "lucide-react";

interface ChatWindowProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
  const { session } = useSession();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.messages.list, { conversationId });
  const conversations = useQuery(api.conversations.list, session ? {} : "skip");
  const sendMessage = useMutation(api.messages.send);

  // Get current user identity from Convex users list
  const currentUser = useQuery(api.users.searchUsers, session ? { searchTerm: "" } : "skip");

  // Find otherUser from conversations list
  const conversation = conversations?.find((c) => c._id === conversationId);
  const otherUser = conversation?.otherUser;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await sendMessage({ conversationId, content: trimmed });
  };

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
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
              {otherUser.imageUrl ? (
                <img
                  src={otherUser.imageUrl}
                  alt={otherUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-blue-600 font-semibold text-sm">
                  {otherUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {otherUser.name}
              </p>
            </div>
          </>
        ) : (
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                !prevMsg ||
                msg._creationTime - prevMsg._creationTime > 5 * 60 * 1000;

              return (
                <div key={msg._id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border">
                        {formatTimestamp(msg._creationTime)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
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

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t bg-white shrink-0"
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
