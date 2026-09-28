"use client";

import { buttonClass } from "@/components/ui";

// Catches failures in app/[tenant]/layout.tsx itself (for example, the operator lookup failing because the
// database could not be reached). Platform neutral: the operator's theme may not have loaded. Never shows
// the underlying error text, which can carry internal detail.
export default function PlatformError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Something went wrong</h1>
      <p>We could not load this page. Your saved progress is safe. Check your connection and try again.</p>
      <button type="button" onClick={reset} className={`${buttonClass.secondary} self-start`}>Try again</button>
    </main>
  );
}
