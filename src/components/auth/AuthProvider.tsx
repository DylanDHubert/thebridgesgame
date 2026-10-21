"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { browserSupabase } from "@/lib/supabase/browser";

export type AuthSnapshot = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  username: string | null;
  anonymous: boolean;
  accessToken: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  saveUsername: (name: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthSnapshot | null>(null);

async function readUsername(userId: string): Promise<string | null> {
  const supabase = browserSupabase();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const name = data?.username;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const supabase = browserSupabase();
    if (!supabase) {
      setReady(true);
      setError("Supabase is not configured.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user ?? null;
    setUserId(user?.id ?? null);
    setEmail(user?.email ?? null);
    setAnonymous(Boolean(user && (user.is_anonymous || !user.email)));
    setAccessToken(session?.access_token ?? null);
    setError(null);
    if (user) {
      setUsername(await readUsername(user.id));
    } else {
      setUsername(null);
    }
    setReady(true);
    console.log("[journeyman:auth] session", {
      userId: user?.id ?? null,
      anonymous: Boolean(user && (user.is_anonymous || !user.email)),
    });
  };

  useEffect(() => {
    const supabase = browserSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const saveUsername = async (name: string) => {
    const supabase = browserSupabase();
    const trimmed = name.trim();
    if (!supabase || !trimmed) {
      return "Choose a username.";
    }
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id ?? userId;
    if (!id) {
      return "Sign in before choosing a name.";
    }
    const { error: writeError } = await supabase
      .from("profiles")
      .upsert({ id, username: trimmed });
    if (writeError) {
      console.log("[journeyman:auth] username failed", writeError.message);
      return writeError.message;
    }
    setUsername(trimmed);
    return null;
  };

  const value = useMemo<AuthSnapshot>(
    () => ({
      ready,
      userId,
      email,
      username,
      anonymous,
      accessToken,
      error,
      refresh,
      saveUsername,
    }),
    [ready, userId, email, username, anonymous, accessToken, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthSnapshot {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth outside AuthProvider");
  }
  return value;
}
