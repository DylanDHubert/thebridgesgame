"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AUTH_FIELD, AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth/AuthProvider";
import { useBoarPassage } from "@/components/loading/BoarPassage";
import { HairlineButton } from "@/components/ui/hairline";
import {
  browserSupabase,
  clearRecoveryMark,
  hasRecoveryMark,
  markRecovery,
} from "@/lib/supabase/browser";

/** THE RECOVERY MAIL LANDS HERE. THE TOKEN IS CHECKED, THEN THE PASSWORD IS REPLACED. */
export default function ResetPasswordPage() {
  const auth = useAuth();
  const depart = useBoarPassage();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = browserSupabase();
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    let cancel = false;

    const finish = (error: string | null) => {
      if (cancel) {
        return;
      }
      setMessage(error);
      setOpen(error == null);
      setReady(true);
    };

    if (!supabase) {
      finish(auth.error ?? "Supabase is not configured.");
      return;
    }
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (hash.get("type") === "recovery" && accessToken && refreshToken) {
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (!error) {
            markRecovery();
            window.history.replaceState(null, "", "/reset-password");
          }
          finish(error ? "This link is missing or already used." : null);
        });
      return;
    }

    if (tokenHash && type === "recovery") {
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (!error) {
          markRecovery();
          window.history.replaceState(null, "", "/reset-password");
        }
        finish(error ? "This link is missing or already used." : null);
      });
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      finish(data.session && hasRecoveryMark() ? null : "This link is missing or already used.");
    });

    return () => {
      cancel = true;
    };
  }, [auth.error]);

  const save = async () => {
    const supabase = browserSupabase();
    if (!supabase) {
      setMessage(auth.error ?? "Supabase is not configured.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password needs 6 characters.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const updated = await supabase.auth.updateUser({ password });
    if (updated.error) {
      setMessage(updated.error.message);
      setBusy(false);
      return;
    }
    clearRecoveryMark();
    await auth.refresh();
    depart("/");
  };

  return (
    <AuthForm title="Reset password">
      {!ready ? (
        <p className="text-center text-[10px] uppercase tracking-[0.14em]">Checking the link</p>
      ) : !open ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-[10px] uppercase tracking-[0.14em]">{message}</p>
          <Link href="/login" className="text-[10px] uppercase tracking-[0.14em] underline">
            Log in
          </Link>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em]">
            New password
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
              Save password
            </HairlineButton>
          </div>
        </form>
      )}
    </AuthForm>
  );
}
