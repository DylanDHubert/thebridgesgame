"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AUTH_FIELD, AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBoarPassage } from "@/components/loading/BoarPassage";
import { HairlineButton } from "@/components/ui/hairline";
import { browserSupabase } from "@/lib/supabase/browser";

/** USERNAME, EMAIL, AND PASSWORD. A GUEST KEEPS THE SAME ID. */
export default function SignupPage() {
  const auth = useAuth();
  const router = useRouter();
  const depart = useBoarPassage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.userId && !auth.anonymous) {
      router.replace("/");
    }
  }, [auth.ready, auth.userId, auth.anonymous, router]);

  const createAccount = async () => {
    const supabase = browserSupabase();
    const name = username.trim();
    if (!supabase) {
      setMessage(auth.error ?? "Supabase is not configured.");
      return;
    }
    if (!name) {
      setMessage("Choose a username.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password needs 6 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    if (auth.userId && auth.anonymous) {
      const updated = await supabase.auth.updateUser({
        email: email.trim(),
        password,
        data: { username: name },
      });
      if (updated.error || !updated.data.user) {
        setMessage(updated.error?.message ?? "Could not create the account.");
        setBusy(false);
        return;
      }
    } else {
      const signed = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name } },
      });
      if (signed.error || !signed.data.session) {
        setMessage(signed.error?.message ?? "Check your email to finish.");
        setBusy(false);
        return;
      }
    }
    const nameError = await auth.saveUsername(name);
    if (nameError) {
      setMessage(nameError);
      setBusy(false);
      return;
    }
    console.log("[journeyman:auth] account created");
    await auth.refresh();
    depart("/");
    setBusy(false);
  };

  return (
    <AuthForm title="Create account">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void createAccount();
        }}
      >
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em]">
          Username
          <input
            className={AUTH_FIELD}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
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
            autoComplete="new-password"
            required
          />
        </label>
        {message ? (
          <p className="text-center text-[10px] uppercase tracking-[0.14em]">{message}</p>
        ) : null}
        <div className="flex justify-center">
          <HairlineButton type="submit" disabled={busy}>
            Create account
          </HairlineButton>
        </div>
      </form>
      <p className="text-center text-[10px] uppercase tracking-[0.14em]">
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </AuthForm>
  );
}
