"use client";

import { useState } from "react";

/**
 * Cook County Clerk recordings. The PIN is copied to the clipboard and the
 * Clerk's recordings search opens in a new tab (deep-link format: confirm).
 */
export default function RecordingsLink({ pin }: { pin: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!pin) return <span className="text-muted">PIN not found</span>;
  return (
    <a
      href="https://crs.cookcountyclerkil.gov/"
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        navigator.clipboard?.writeText(pin).then(() => setCopied(true)).catch(() => {});
      }}
      className="inline-flex min-h-[44px] items-center font-semibold text-blue"
    >
      {copied ? `PIN ${pin} copied — paste it into the search` : "Open Cook County recordings"}
    </a>
  );
}
