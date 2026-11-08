import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentSource } from "@/lib/sources";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Agent Deal Finder",
  description: "Draw an area, find off-market properties with motivated-seller signals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = currentSource() === "demo";
  return (
    <html lang="en">
      <body className="flex min-h-[100dvh] flex-col bg-slate-50 text-ink antialiased">
        {demo && (
          <div className="bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900 ring-1 ring-amber-200">
            Demo mode — sample properties, nothing is purchased.
          </div>
        )}
        <header className="border-b border-border bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight">Deal Finder</span>
              <span className="block text-xs text-muted">Super Agent</span>
            </Link>
            <nav className="flex shrink-0 gap-1 text-sm font-semibold">
              <Link href="/" className="rounded-lg px-3 py-2 text-blue hover:bg-blue-light">
                Find deals
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 text-blue hover:bg-blue-light">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
