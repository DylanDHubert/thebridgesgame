"use server";

import { createClient } from "@supabase/supabase-js";

const KINDS = ["bug", "request", "other"] as const;

export type ReportKind = (typeof KINDS)[number];

const BODY_MAX = 2000;

function isKind(value: string): value is ReportKind {
  return KINDS.some((kind) => kind === value);
}

/** STORE ONE REPORT FOR THE SIGNED-IN PLAYER. THEY CANNOT READ THE TABLE BACK. */
export async function sendReport(input: {
  kind: string;
  body: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const body = input.body.trim();
  if (!url || !key) {
    console.log("[journeyman:report] skipped");
    return { ok: false, error: "Reports are not available." };
  }
  if (!isKind(input.kind)) {
    console.log("[journeyman:report] rejected", { kind: input.kind });
    return { ok: false, error: "Choose bug, request, or other." };
  }
  if (!body || body.length > BODY_MAX) {
    console.log("[journeyman:report] rejected", { kind: input.kind, chars: body.length });
    return { ok: false, error: "Write a note, up to 2000 characters." };
  }
  if (!input.token) {
    console.log("[journeyman:report] rejected", { reason: "no session" });
    return { ok: false, error: "Sign in before sending a report." };
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${input.token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: userError } = await supabase.auth.getUser(input.token);
  const userId = data.user?.id;
  if (userError || !userId) {
    console.log("[journeyman:report] rejected", { reason: userError?.message ?? "no user" });
    return { ok: false, error: "Sign in before sending a report." };
  }

  const response = await fetch(`${url}/rest/v1/reports`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      kind: input.kind,
      body,
    }),
  });
  console.log("[journeyman:report] stored", {
    userId,
    kind: input.kind,
    chars: body.length,
    status: response.status,
  });
  if (!response.ok) {
    return { ok: false, error: "That report did not save." };
  }
  return { ok: true };
}
