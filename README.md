# Chat-What 💬

A modern, full-featured real-time chat application built with **Next.js**, **Convex**, and **Clerk**. It supports 1-on-1 direct messages, multi-user group chats, read receipts, real-time typing indicators, user presence, emoji reactions, message search, pinned conversations, and group management.

## 🚀 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Backend & Database**: [Convex](https://www.convex.dev/) (Reactive Serverless Functions & Real-time Database)
- **Authentication**: [Clerk](https://clerk.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## ✨ Features

- **Real-Time Messaging**: Send, edit, and delete messages instantly without page reloads.
- **Direct & Group Chats**: Create dedicated 1-on-1 channels or multi-user group conversations.
- **Rich Chat Engagement**:
  - **Reactions**: React to messages with a fixed set of emojis (👍, ❤️, 😂, 😮, 😢).
  - **Typing Indicators**: See when other users are currently typing in a conversation.
  - **Read Receipts**: User avatars appear under the latest message when read by participants.
  - **Message Timestamps**: Contextual timestamps shown between message clusters (grouped per 5 minutes).
  - **Character Limit**: Input enforces a 1,000-character cap with a live colour-coded counter (appears at 70% usage).
- **User Presence**: A heartbeat mechanism tracks and displays who is currently online.
- **Conversation Organization**: Pin important conversations to the top of your sidebar.
- **Global Search**: Search across all your conversations for specific message text.
- **Group Management**:
  - **Member Panel**: Click the 👥 icon in a group header to view all participants inline.
  - **Leave Group**: A dedicated leave button (with a confirm prompt) lets any member exit a group at any time.

---

## 🗄️ Database Schema (Convex)

The application utilizes Convex's reactive real-time database. The schema is defined in `convex/schema.ts` with the following 8 core tables:

### 1. `users`
Stores authenticated users syncing from Clerk.
- `name` (String)
- `tokenIdentifier` (String) — Unique identifier linked to Clerk.
- `imageUrl` (String, Optional)
- `email` (String, Optional)

### 2. `conversations`
Represents a chat room (either 1-on-1 or a group).
- `name` (String, Optional) — Used primarily for group chats.
- `isGroup` (Boolean)
- `memberIds` (Array of `users` IDs)
- `creatorId` (Optional `users` ID) — The user who created the group.
- `lastMessageId` (Optional `messages` ID) — Pointer to the latest message for sorting.

### 3. `messages`
Individual chat messages sent within a conversation.
- `conversationId` (`conversations` ID)
- `senderId` (`users` ID)
- `content` (String)
- `deleted` (Boolean, Optional)
- `editedAt` (Number, Optional) — Timestamp if the message was edited.

### 4. `reactions`
Emoji reactions attached to specific messages.
- `messageId` (`messages` ID)
- `userId` (`users` ID)
- `emoji` (String)

### 5. `presence`
Tracks the online status of users across the platform.
- `userId` (`users` ID)
- `lastSeen` (Number) — Unix timestamp updated via client heartbeats.

### 6. `typing`
Tracks active typers per conversation.
- `conversationId` (`conversations` ID)
- `userId` (`users` ID)
- `lastTyped` (Number) — Unix timestamp of the last keystroke.

### 7. `lastRead`
Read receipt pointers tracking the last time a user viewed a conversation.
- `conversationId` (`conversations` ID)
- `userId` (`users` ID)
- `readTime` (Number) — Unix timestamp of when the user opened the chat.

### 8. `pins`
Conversations pinned by a user.
- `userId` (`users` ID)
- `conversationId` (`conversations` ID)

---

## ⚙️ How it Works under the Hood

### **1. Authentication & User Sync**
We use **Clerk** for zero-friction authentication. When a user signs in, a Convex mutation (`users.store`) is triggered ensuring that the user exists in our `users` table, and keeps their name and profile picture up to date with the Clerk JWT payload (`tokenIdentifier`). 

### **2. Real-time Reactivity (Convex)**
Next.js components use Convex's React hooks (`useQuery`, `useMutation`). Instead of polling, queries like `listForMessage` or `getUnreadCount` automatically subscribe the client to database changes. When *User A* sends a message, *User B*'s UI updates instantaneously.

### **3. Presence & Typing Indicators**
- **Presence**: Clients utilize a `useEffect` interval (e.g., every 30 seconds) that fires a `heartbeat` mutation. If a user's `lastSeen` timestamp in the `presence` table is within 60 seconds, they are considered "online".
- **Typing**: When typing, clients debounce and send a `setTyping` mutation. The `getTypingUsers` query fetches users whose `lastTyped` timestamp is within the last 3 seconds.

### **4. Read Receipts**
Whenever a user opens a conversation, the client fires the `markRead` mutation, recording the current timestamp in `lastRead`. For other users, the `getReaders` query fetches who has a `readTime` newer than the latest message's creation time, rendering their avatars dynamically as read receipts.

### **5. Leave Group**
The `conversations.leaveGroup` mutation filters the current user out of the `memberIds` array and patches the document. The UI shows a one-step confirmation before calling the mutation, then navigates back to the sidebar automatically.

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- [Clerk](https://clerk.com/) Account (Free tier is fine)
- [Convex](https://www.convex.dev/) Account (Free tier is fine)

### Environment Setup
Create a `.env.local` file at the root of the project to set your keys:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Convex will automatically generate these when initializing:
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Convex backend (this will continually sync changes in the `convex/` folder to your cloud DB):
   ```bash
   npx convex dev
   ```

3. Open a new terminal and run your Next.js development server:
   ```bash
   npm run dev
   ```

4. Go to `http://localhost:3000` to preview the application!

---

## 🏗️ Project Structure

- `app/`: Next.js App Router (pages and layouts).
- `components/`: UI Components (Sidebar, Chat Window, Modals) and Shadcn-generated components.
- `convex/`: Backend Logic. Contains the `schema.ts`, serverless API mutations/queries (`messages.ts`, `users.ts`, `conversations.ts`, etc.).
- `lib/`: Utility scripts and Shadcn/Tailwind merge helpers.
