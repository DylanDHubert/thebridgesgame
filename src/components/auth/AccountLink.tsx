"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { useButtonSfx } from "@/lib/sound/buttonSfx";
import { browserSupabase } from "@/lib/supabase/browser";

const ITEM = [
  "silkscreen-regular inline-flex w-full items-center justify-center border border-black bg-white px-3 py-2",
  "whitespace-nowrap text-[16px] leading-none text-black transition",
].join(" ");

function LogoutButton({ onClick }: { onClick: () => void }) {
  const press = useButtonSfx<HTMLButtonElement>("button");
  return (
    <button
      type="button"
      className={`${ITEM} bg-[#ef4444] hover:bg-[#dc2626]`}
      onClick={onClick}
      {...press()}
    >
      Log out
    </button>
  );
}

function AccountAnchor({
  href,
  children,
  onClick,
}: {
  href: string;
  children: string;
  onClick: () => void;
}) {
  const press = useButtonSfx<HTMLAnchorElement>("link");
  return (
    <Link href={href} className={`${ITEM} flex-1 hover:bg-[#fbbf24]`} onClick={onClick} {...press()}>
      {children}
    </Link>
  );
}

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
          <AccountAnchor href="/login" onClick={onDone}>
            Log in
          </AccountAnchor>
          <AccountAnchor href="/signup" onClick={onDone}>
            Sign up
          </AccountAnchor>
        </div>
      ) : (
        <p className="text-center text-[10px] uppercase tracking-[0.16em]">
          {auth.username || "Account"}
        </p>
      )}
      <LogoutButton onClick={() => void logOut()} />
    </>
  );
}
