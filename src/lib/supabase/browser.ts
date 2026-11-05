"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

const RECOVERY_KEY = "journeyman:recovery";

/** THE DEFAULT RESET MAIL RETURNS TO THE SITE WITH THE SESSION IN THE HASH. */
export function redirectRecoveryHash(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.get("type") !== "recovery" || !hash.get("access_token") || !hash.get("refresh_token")) {
    return false;
  }
  if (window.location.pathname === "/reset-password") {
    return false;
  }
  window.location.replace(`/reset-password${window.location.hash}`);
  return true;
}

export function markRecovery() {
  window.sessionStorage.setItem(RECOVERY_KEY, "1");
}

export function hasRecoveryMark(): boolean {
  return window.sessionStorage.getItem(RECOVERY_KEY) === "1";
}

export function clearRecoveryMark() {
  window.sessionStorage.removeItem(RECOVERY_KEY);
}

/** ONE BROWSER CLIENT. SESSION STAYS IN THIS BROWSER. */
export function browserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return null;
  }
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
