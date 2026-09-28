import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Applicant intake",
  description: "Income qualification for affordable housing and property tax relief programs.",
};

// No tenant logic here: the operator is resolved and themed in app/[tenant]/layout.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-text">{children}</body>
    </html>
  );
}
