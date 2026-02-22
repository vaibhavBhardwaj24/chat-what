"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Users, Check } from "lucide-react";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (id: Id<"conversations">) => void;
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<Id<"users">>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const users = useQuery(api.users.searchUsers, { searchTerm: "" });
  const createGroup = useMutation(api.conversations.createGroup);

  const toggleUser = (id: Id<"users">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) { setError("Please enter a group name."); return; }
    if (selected.size === 0) { setError("Please select at least one member."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const id = await createGroup({
        name: groupName.trim(),
        memberIds: Array.from(selected),
      });
      onCreated(id as Id<"conversations">);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">New Group Chat</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Group name input */}
          <div className="px-5 pt-4 pb-3">
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>

          {/* Member count */}
          <div className="px-5 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selected.size > 0 ? `${selected.size} member${selected.size > 1 ? "s" : ""} selected` : "Select members"}
            </p>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {users === undefined ? (
              <div className="space-y-3 p-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No other users found.</p>
            ) : (
              <ul className="space-y-1">
                {users.map((user) => {
                  const isSelected = selected.has(user._id);
                  return (
                    <li
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                        isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden shrink-0">
                        {user.imageUrl ? (
                          <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                        {user.email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="px-5 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800">{error}</p>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting || !groupName.trim() || selected.size === 0}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : `Create Group${selected.size > 0 ? ` (${selected.size + 1} members)` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
