"use client";

import { Banner, buttonClass } from "@/components/ui";

// Catches failures inside an operator's pages, keeping the operator's header and theme from the layout.
// Shows a plain message, never the underlying error text.
export default function TenantPageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Banner tone="danger" title="Something went wrong">
        We could not load this page. Your saved progress is safe. Check your connection and try again.
      </Banner>
      <button type="button" onClick={reset} className={`${buttonClass.secondary} self-start`}>Try again</button>
    </div>
  );
}
