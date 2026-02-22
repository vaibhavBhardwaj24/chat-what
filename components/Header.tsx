"use client";

import { UserButton, SignInButton, useSession } from "@clerk/nextjs";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { usePresence } from "@/hooks/use-presence";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function Header() {
  const { session, isLoaded } = useSession();
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const { theme, setTheme } = useTheme();

  // Keep this user's presence alive in Convex
  usePresence();

  useEffect(() => {
    if (isAuthenticated) {
      storeUser()
        .then((id) => console.log("storeUser successful, id:", id))
        .catch((err) => console.error("storeUser failed:", err));
    }
  }, [isAuthenticated, storeUser]);

  return (
    <header className="flex h-16 items-center justify-between border-b px-6 bg-white dark:bg-gray-900 dark:border-gray-700 shrink-0 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight text-blue-600">ChatApp</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {isLoaded && !session ? (
          <SignInButton mode="modal">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">
              Sign In
            </button>
          </SignInButton>
        ) : (
          <UserButton />
        )}
      </div>
    </header>
  );
}
