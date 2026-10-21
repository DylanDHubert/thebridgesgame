"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AUTH_FIELD, AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBoarPassage } from "@/components/loading/BoarPassage";
import { HairlineButton } from "@/components/ui/hairline";
import { browserSupabase } from "@/lib/supabase/browser";

/** EMAIL AND PASSWORD, OR CONTINUE WITH NO ACCOUNT. */
export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const depart = useBoarPassage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.userId && !auth.anonymous) {
      router.replace("/");
    }
  }, [auth.ready, auth.userId, auth.anonymous, router]);

  const enter = async (href: string) => {
    await auth.refresh();
    depart(href);
  };

  const logIn = async () => {
    const supabase = browserSupabase();
    if (!supabase) {
      setMessage(auth.error ?? "Supabase is not configured.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const signed = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signed.error) {
      setMessage(signed.error.message);
      setBusy(false);
      return;
    }
    console.log("[journeyman:auth] logged in");
    await enter("/");
    setBusy(false);
  };

  const guest = async () => {
    const supabase = browserSupabase();
    if (!supabase) {
      setMessage(auth.error ?? "Supabase is not configured.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const signed = await supabase.auth.signInAnonymously();
    if (signed.error) {
      setMessage(signed.error.message);
      setBusy(false);
      return;
    }
    console.log("[journeyman:auth] guest");
    await enter("/");
    setBusy(false);
  };

  return (
    <AuthForm title="Log in">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void logIn();
        }}
      >
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em]">
          Email
          <input
            className={AUTH_FIELD}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em]">
          Password
          <input
            className={AUTH_FIELD}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {message ? (
          <p className="text-center text-[10px] uppercase tracking-[0.14em]">{message}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <HairlineButton type="submit" disabled={busy}>
            Log in
          </HairlineButton>
          <HairlineButton onClick={() => void guest()} disabled={busy}>
            Continue as guest
          </HairlineButton>
        </div>
      </form>
      <p className="text-center text-[10px] uppercase tracking-[0.14em]">
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </AuthForm>
  );
}
