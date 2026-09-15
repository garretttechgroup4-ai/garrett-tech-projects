import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real View",
  description: "Owner-first off-market property pipeline built on PropertyRadar data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-ink">
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Real View</h1>
              <p className="text-sm text-muted">Owner-first off-market pipeline for Prashanth — PropertyRadar + AI scoring.</p>
            </div>
            <nav className="flex gap-5 text-sm font-semibold text-blue">
              <Link href="/">Dashboard</Link>
              <Link href="/criteria">Criteria Profile</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <footer className="py-8 text-center text-sm text-muted">
          Review gate is mandatory — nothing drafts or sends to an owner without human eyes first.
        </footer>
      </body>
    </html>
  );
}
