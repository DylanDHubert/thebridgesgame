"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { sendReport, type ReportKind } from "@/app/actions/report";
import { useAuth } from "@/components/auth/AuthProvider";
import { HairlineButton, HairlineRow } from "@/components/ui/hairline";

const KINDS: { id: ReportKind; label: string }[] = [
  { id: "bug", label: "Bug" },
  { id: "request", label: "Request" },
  { id: "other", label: "Other" },
];

/** BUG, REQUEST, OR OTHER. ONE NOTE. THE PLAYER DOES NOT SEE THE LIST. */
export function ReportDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [kind, setKind] = useState<ReportKind>("bug");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (pending || sent) {
      return;
    }
    const note = body.trim();
    if (!note) {
      setError("Write a note.");
      return;
    }
    if (!auth.accessToken) {
      setError("Sign in before sending feedback.");
      return;
    }
    setPending(true);
    setError(null);
    void sendReport({ kind, body: note, token: auth.accessToken }).then((result) => {
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-white/80 px-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Feedback"
        className="flex w-full max-w-[22rem] flex-col gap-3 border border-black bg-white p-4 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[11px] uppercase tracking-[0.16em]">Feedback</h2>
        {sent ? (
          <p className="text-[10px] uppercase tracking-[0.14em]">Sent.</p>
        ) : (
          <>
            <HairlineRow>
              {KINDS.map((item) => (
                <HairlineButton
                  key={item.id}
                  pressed={kind === item.id}
                  onClick={() => setKind(item.id)}
                >
                  {item.label}
                </HairlineButton>
              ))}
            </HairlineRow>
            <textarea
              value={body}
              maxLength={2000}
              rows={5}
              aria-label="Note"
              placeholder="What should we know?"
              className="w-full resize-none border border-black bg-white px-2 py-1.5 text-[12px] leading-5 text-black placeholder:text-black/40 focus:outline-none"
              onChange={(event) => setBody(event.target.value)}
            />
            {error ? (
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#dc2626]">{error}</p>
            ) : null}
          </>
        )}
        <HairlineRow>
          {sent ? null : (
            <HairlineButton onClick={submit} disabled={pending || body.trim().length === 0}>
              {pending ? "Sending" : "Send"}
            </HairlineButton>
          )}
          <HairlineButton onClick={onClose}>Close</HairlineButton>
        </HairlineRow>
      </div>
    </div>,
    document.body,
  );
}
