"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef } from "react";
import { SmileIcon, Trash2, Pencil, Check, X } from "lucide-react";
import { formatTimestamp } from "@/lib/format-timestamp";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface Member {
  _id: Id<"users">;
  name: string;
  imageUrl?: string | null;
}

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    senderId: Id<"users">;
    content: string;
    deleted?: boolean;
    editedAt?: number;
    _creationTime: number;
  };
  isMe: boolean;
  showTimestamp: boolean;
  isGroup?: boolean;
  members?: Member[];
}

/** Render content with @Name highlights based on matched members */
function renderContent(content: string, members: Member[]) {
  if (!members.length) return <>{content}</>;

  // Build a regex that matches any @MemberName
  const names = members.map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!names.length) return <>{content}</>;
  const pattern = new RegExp(`(@(?:${names.join("|")}))`, "g");
  const parts = content.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isMention = part.startsWith("@") && members.some((m) => `@${m.name}` === part);
        return isMention ? (
          <span
            key={i}
            className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded px-1 font-medium"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

export function MessageBubble({
  message,
  isMe,
  showTimestamp,
  isGroup = false,
  members = [],
}: MessageBubbleProps) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reactions = useQuery(api.reactions.listForMessage, { messageId: message._id });
  const toggleReaction = useMutation(api.reactions.toggleReaction);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const editMessage = useMutation(api.messages.editMessage);

  const sender = isGroup ? members.find((m) => m._id === message.senderId) : null;

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null; }
    setHover(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHover(false);
      setPickerOpen(false);
    }, 300);
  };

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id }).catch(console.error);
  };

  const handleToggleReaction = async (emoji: string) => {
    setPickerOpen(false);
    await toggleReaction({ messageId: message._id, emoji }).catch(console.error);
  };

  const handleEditSubmit = async () => {
    if (!editValue.trim()) { setEditError("Cannot be empty"); return; }
    if (editValue.trim() === message.content) { setEditing(false); return; }
    setEditError(null);
    try {
      await editMessage({ messageId: message._id, content: editValue.trim() });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to edit");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
    if (e.key === "Escape") { setEditing(false); setEditValue(message.content); setEditError(null); }
  };

  return (
    <div>
      {showTimestamp && (
        <div className="flex justify-center my-3">
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
            {formatTimestamp(message._creationTime)}
          </span>
        </div>
      )}

      {isGroup && !isMe && sender && (
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-1 mb-0.5">{sender.name}</p>
      )}

      <div
        className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
          {/* Hover actions */}
          {!message.deleted && !editing && (
            <div className={`flex items-center gap-1 mb-1 transition-opacity duration-150 ${hover ? "opacity-100" : "opacity-0 pointer-events-none"} ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {/* Emoji picker button */}
              <div className="relative">
                <button
                  onClick={() => setPickerOpen((p) => !p)}
                  className="text-base leading-none p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                  title="Add reaction"
                >
                  <SmileIcon className="w-4 h-4" />
                </button>
                {pickerOpen && (
                  <div className={`absolute bottom-full mb-1 flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg px-2 py-1.5 z-20 ${isMe ? "right-0" : "left-0"}`}>
                    {ALLOWED_EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => handleToggleReaction(emoji)} className="text-lg hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isMe && (
                <>
                  <button
                    onClick={() => { setEditing(true); setEditValue(message.content); setHover(false); }}
                    className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                    title="Edit message"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Bubble */}
          {editing ? (
            <div className="flex flex-col gap-1 w-full max-w-sm">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                autoFocus
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-blue-400 dark:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
              />
              {editError && <p className="text-xs text-red-500">{editError}</p>}
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => { setEditing(false); setEditValue(message.content); setEditError(null); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
              message.deleted
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-dashed border-gray-300 dark:border-gray-600"
                : isMe
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700"
            }`}>
              {message.deleted ? (
                <span className="italic">This message was deleted</span>
              ) : (
                <span>{renderContent(message.content, isGroup ? members : [])}</span>
              )}
              {!message.deleted && message.editedAt && (
                <span className={`text-[10px] ml-1.5 ${isMe ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>(edited)</span>
              )}
            </div>
          )}

          {/* Reactions */}
          {reactions && reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
              {reactions.map(({ emoji, count, reactedByMe }) => (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition ${
                    reactedByMe
                      ? "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
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
