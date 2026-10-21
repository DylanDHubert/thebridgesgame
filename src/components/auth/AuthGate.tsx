"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { browserSupabase } from "@/lib/supabase/browser";

const OPEN = new Set(["/login", "/signup"]);

/** SEND LOGGED-OUT VISITORS TO THE LOGIN PAGE. A SAVED SESSION SKIPS IT. */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const open = OPEN.has(pathname);

  useEffect(() => {
    if (!auth.ready || auth.userId || open) {
      return;
    }
    let cancel = false;
    void (async () => {
      const supabase = browserSupabase();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (cancel || session) {
        return;
      }
      router.replace("/login");
    })();
    return () => {
      cancel = true;
    };
  }, [auth.ready, auth.userId, open, router]);

  if (!auth.ready || (!auth.userId && !open)) {
    return null;
  }
  return children;
}
