"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useSession } from "@clerk/nextjs";

export function Sidebar() {
  const { session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Only query users if we are logged in
  const users = useQuery(api.users.searchUsers, session ? { searchTerm } : "skip");

  return (
    <aside className="w-80 border-r bg-white flex flex-col h-full shrink-0">
      <div className="p-4 border-b bg-gray-50/50">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!session ? (
            <div className="p-4 text-sm text-gray-500 text-center">Sign in to search users</div>
        ) : users === undefined ? (
          <div className="p-4 text-sm text-gray-500 text-center animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">No users found</div>
        ) : (
          <ul className="divide-y">
            {users.map((user) => (
              <li key={user._id} className="p-4 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
