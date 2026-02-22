"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);

  const handleSelectConversation = (id: Id<"conversations">) => {
    setSelectedConversationId(id);
  };

  const handleBack = () => {
    setSelectedConversationId(null);
  };

  return (
    <div className="flex flex-1 overflow-hidden w-full h-full">
      {/*
        RESPONSIVE LAYOUT:
        - Mobile: show sidebar OR chat (not both), toggled by selectedConversationId
        - Desktop (md+): show both side by side always
      */}

      {/* Sidebar — hidden on mobile when a conversation is open */}
      <div
        className={`
          ${selectedConversationId ? "hidden md:flex" : "flex"}
          w-full md:w-80 flex-col h-full
        `}
      >
        <Sidebar
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat area — hidden on mobile when no conversation selected */}
      <div
        className={`
          ${selectedConversationId ? "flex" : "hidden md:flex"}
          flex-1 flex-col h-full
        `}
      >
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        ) : (
          /* Desktop empty state when no convo selected */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center p-8 gap-3">
            <span className="text-6xl">💬</span>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              Welcome to ChatApp
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Select a conversation from the sidebar, or search for someone new
              to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
