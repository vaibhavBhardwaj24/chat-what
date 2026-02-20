"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatTimestamp } from "@/lib/format-timestamp";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    senderId: Id<"users">;
    content: string;
    deleted?: boolean;
    _creationTime: number;
  };
  isMe: boolean;
  otherUserId?: Id<"users">;
  showTimestamp: boolean;
}

export function MessageBubble({
  message,
  isMe,
  showTimestamp,
}: MessageBubbleProps) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reactions = useQuery(api.reactions.listForMessage, {
    messageId: message._id,
  });
  const toggleReaction = useMutation(api.reactions.toggleReaction);
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id }).catch(console.error);
  };

  const handleToggleReaction = async (emoji: string) => {
    setPickerOpen(false);
    await toggleReaction({ messageId: message._id, emoji }).catch(console.error);
  };

  return (
    <div>
      {showTimestamp && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border">
            {formatTimestamp(message._creationTime)}
          </span>
        </div>
      )}

      <div
        className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setPickerOpen(false); }}
      >
        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
          {/* Action row — appears on hover */}
          {!message.deleted && (
            <div
              className={`flex items-center gap-1 mb-1 transition-opacity duration-150 ${
                hover ? "opacity-100" : "opacity-0 pointer-events-none"
              } ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Emoji picker trigger */}
              <div className="relative">
                <button
                  onClick={() => setPickerOpen((p) => !p)}
                  className="text-base leading-none p-1 rounded hover:bg-gray-100 transition"
                  title="Add reaction"
                >
                  😊
                </button>
                {pickerOpen && (
                  <div
                    className={`absolute bottom-full mb-1 flex gap-1 bg-white border rounded-xl shadow-lg px-2 py-1.5 z-20 ${
                      isMe ? "right-0" : "left-0"
                    }`}
                  >
                    {ALLOWED_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(emoji)}
                        className="text-lg hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete button — only for own messages */}
              {isMe && (
                <button
                  onClick={handleDelete}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Bubble */}
          <div
            className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
              message.deleted
                ? "bg-gray-100 text-gray-400 border border-dashed rounded-2xl"
                : isMe
                ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-white text-gray-800 rounded-bl-sm border"
            }`}
          >
            {message.deleted ? (
              <span className="italic">This message was deleted</span>
            ) : (
              message.content
            )}
          </div>

          {/* Reaction counts */}
          {reactions && reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
              {reactions.map(({ emoji, count, reactedByMe }) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition ${
                    reactedByMe
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
