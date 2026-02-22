"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { Search, X, MessageSquare, Users } from "lucide-react";
import { formatTimestamp } from "@/lib/format-timestamp";

interface SearchModalProps {
  onClose: () => void;
  onSelectConversation: (id: Id<"conversations">) => void;
}

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export function SearchModal({ onClose, onSelectConversation }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useQuery(
    api.messages.searchMessages,
    debouncedQuery.length >= 2 ? { searchQuery: debouncedQuery } : "skip"
  );

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId as Id<"conversations">);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[75vh]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Search all messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
          >
            <span className="text-xs font-medium">Esc</span>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {debouncedQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
              <Search className="w-8 h-8 opacity-40" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          ) : results === undefined ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-sm">No messages found for &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {results.map((result) => (
                <li
                  key={result.messageId}
                  onClick={() => handleSelect(result.conversationId)}
                  className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition"
                >
                  {/* Conversation name */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {result.isGroup ? (
                      <Users className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {result.conversationName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-auto">
                      {formatTimestamp(result.creationTime)}
                    </span>
                  </div>
                  {/* Message snippet */}
                  <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 leading-snug">
                    {result.isMe ? (
                      <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">You:</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">{result.senderName}:</span>
                    )}
                    {highlight(result.content, debouncedQuery)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {results && results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            {results.length} result{results.length !== 1 ? "s" : ""}{results.length === 50 ? " (showing top 50)" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
