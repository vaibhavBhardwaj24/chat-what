"use client";

import { UserButton, SignInButton, useSession } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { usePresence } from "@/hooks/use-presence";

export function Header() {
  const { session, isLoaded } = useSession();
  const storeUser = useMutation(api.users.store);

  // Keep this user's presence alive in Convex
  usePresence();

  useEffect(() => {
    if (isLoaded && session) {
      storeUser().catch(console.error);
    }
  }, [isLoaded, session, storeUser]);

  return (
    <header className="flex h-16 items-center justify-between border-b px-6 bg-white shrink-0 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight text-blue-600">ChatApp</h1>
      <div>
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
