"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { finishBankConnection, startBankConnection } from "@/app/[tenant]/apply/ingestion-actions";

// Plaid Link. The SDK must load from Plaid's own CDN (cdn.plaid.com); the link token comes from our
// plaid-link-token function, and the public token goes straight back to plaid-exchange. No secret is here.

interface PlaidHandler { open: () => void; destroy: () => void }
declare global {
  interface Window {
    Plaid?: { create: (config: {
      token: string;
      onSuccess: (publicToken: string) => void;
      onExit: (err: { display_message?: string | null } | null) => void;
    }) => PlaidHandler };
  }
}

export function BankConnect({ tenant, members }: { tenant: string; members: { id: string; name: string }[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function connect() {
    if (!window.Plaid) return setMessage({ tone: "error", text: "The bank connection window did not load. Refresh the page and try again." });
    setBusy(true);
    setMessage(null);
    const start = await startBankConnection(tenant, memberId);
    if (!start.ok) {
      setBusy(false);
      return setMessage({ tone: "error", text: start.message });
    }
    const handler = window.Plaid.create({
      token: start.linkToken,
      onSuccess: async (publicToken) => {
        const done = await finishBankConnection(tenant, start.connectionId, publicToken);
        setBusy(false);
        setMessage(done.ok ? { tone: "ok", text: "Connected. Your balances and deposits are being read." } : { tone: "error", text: done.message ?? "Try again." });
        handler.destroy();
        router.refresh();
      },
      onExit: (err) => {
        setBusy(false);
        if (err) setMessage({ tone: "error", text: err.display_message ?? "The bank connection was not completed." });
        handler.destroy();
      },
    });
    handler.open();
  }

  return (
    <div className="flex flex-col gap-3">
      <Script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" strategy="lazyOnload" onReady={() => setReady(true)} />
      <Field id="bank_member" label="Whose bank account? (required)">
        <select id="bank_member" className={inputClass()} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={connect} disabled={!ready || busy || !memberId} aria-busy={busy}>
        {busy ? "Connecting…" : "Connect your bank"}
      </button>
      <p className="text-sm text-muted">You sign in to your bank in a secure window from Plaid. We never see your bank password or full account numbers.</p>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-danger" : "text-success"}>{message.text}</p>}
    </div>
  );
}
