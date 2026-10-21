"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { browserSupabase } from "@/lib/supabase/browser";

const ITEM = [
  "inline-flex w-full items-center justify-center border border-black bg-white px-3 py-2",
  "whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-black transition",
].join(" ");

/** ACCOUNT ROWS INSIDE THE NAV MODAL. */
export function AccountLink({ onDone }: { onDone: () => void }) {
  const auth = useAuth();
  const router = useRouter();
  if (!auth.userId) {
    return null;
  }

  const logOut = async () => {
    const supabase = browserSupabase();
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    await auth.refresh();
    onDone();
    router.replace("/login");
    console.log("[journeyman:auth] logged out");
  };

  return (
    <>
      {auth.anonymous ? (
        <div className="flex gap-2">
          <Link href="/login" className={`${ITEM} flex-1 hover:bg-[#fbbf24]`} onClick={onDone}>
            Log in
          </Link>
          <Link href="/signup" className={`${ITEM} flex-1 hover:bg-[#fbbf24]`} onClick={onDone}>
            Sign up
          </Link>
        </div>
      ) : (
        <p className="text-center text-[10px] uppercase tracking-[0.16em]">
          {auth.username || "Account"}
        </p>
      )}
      <button
        type="button"
        className={`${ITEM} bg-[#ef4444] hover:bg-[#dc2626]`}
        onClick={() => void logOut()}
      >
        Log out
      </button>
    </>
  );
}
