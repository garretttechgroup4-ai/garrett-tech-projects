"use client";

import { useState } from "react";

/** Street View photo via our proxy; friendly placeholder when unavailable. */
export default function PropertyPhoto({ id, address, enabled }: { id: string; address: string; enabled: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!enabled || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-blue-light text-muted">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
        <span className="text-sm">{enabled ? "No street photo available" : "Street photo appears once Google Maps is connected"}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/streetview?id=${encodeURIComponent(id)}`} alt={`Street view of ${address}`} className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}
