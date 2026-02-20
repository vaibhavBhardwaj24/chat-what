"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useSession } from "@clerk/nextjs";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Call this once in a top-level component (e.g. Header) to keep the current
 * user's presence up-to-date in Convex. Fires immediately on mount, then
 * every 30 seconds. Also fires when the tab regains focus.
 */
export function usePresence() {
  const { session } = useSession();
  const heartbeat = useMutation(api.presence.heartbeat);

  useEffect(() => {
    if (!session) return;

    const ping = () => heartbeat().catch(console.error);

    // fire immediately
    ping();

    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    // also update when the user comes back to the tab
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, heartbeat]);
}
