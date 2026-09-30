"use client";

import Script from "next/script";
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

/**
 * Plaid's script is shared by every widget on the page and loaded once, so readiness is checked when a widget
 * is used rather than tracked per widget (a per widget load callback left the second widget disabled forever).
 */
async function plaidLoaded(timeoutMs = 8000): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (!window.Plaid && Date.now() < until) await new Promise((r) => setTimeout(r, 200));
  return Boolean(window.Plaid);
}

const COPY = {
  transactions: { who: "Whose bank account? (required)", button: "Connect your bank", busy: "Connecting…",
    note: "You sign in to your bank in a secure window from Plaid. We never see your bank password or full account numbers.",
    done: "Connected. Your balances and deposits are being read." },
  payroll_income: { who: "Whose job? (required)", button: "Connect your payroll", busy: "Connecting…",
    note: "You sign in to your payroll or employer account in a secure window from Plaid. We read your pay stubs; we never see your password.",
    done: "Connected. Your pay stubs are being read." },
} as const;

export function BankConnect({ tenant, members, product = "transactions" }: {
  tenant: string; members: { id: string; name: string }[]; product?: "transactions" | "payroll_income";
}) {
  const copy = COPY[product];
  const idPrefix = product === "payroll_income" ? "payroll" : "bank";
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function connect() {
    setBusy(true);
    setMessage(null);
    if (!(await plaidLoaded())) {
      setBusy(false);
      return setMessage({ tone: "error", text: "The secure connection window did not load. Check your connection, then refresh the page and try again." });
    }
    const start = await startBankConnection(tenant, memberId, product);
    if (!start.ok) {
      setBusy(false);
      return setMessage({ tone: "error", text: start.message });
    }
    const handler = window.Plaid!.create({
      token: start.linkToken,
      onSuccess: async (publicToken) => {
        const done = await finishBankConnection(tenant, start.connectionId, publicToken);
        setBusy(false);
        setMessage(done.ok ? { tone: "ok", text: copy.done } : { tone: "error", text: done.message ?? "Try again." });
        handler.destroy();
        // No router.refresh(): finishBankConnection's revalidatePath returns the updated page in the same response.
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
      <Script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" strategy="lazyOnload" />
      <Field id={`${idPrefix}_member`} label={copy.who}>
        <select id={`${idPrefix}_member`} className={inputClass()} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={connect} disabled={busy || !memberId} aria-busy={busy}>
        {busy ? copy.busy : copy.button}
      </button>
      <p className="text-sm text-muted">{copy.note}</p>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-danger" : "text-success"}>{message.text}</p>}
    </div>
  );
}
