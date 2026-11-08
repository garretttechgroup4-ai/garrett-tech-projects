"use client";

import { useState } from "react";

/** Live street + aerial view through our proxy. Not stored. Friendly placeholder when unavailable. */
export default function PropertyImagery({ id, address, enabled }: { id: string; address: string; enabled: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
      <Shot id={id} view="street" alt={`Street view of ${address}`} enabled={enabled} label="Street view" />
      <Shot id={id} view="aerial" alt={`Aerial view of ${address}`} enabled={enabled} label="Aerial view" />
    </div>
  );
}

function Shot({ id, view, alt, enabled, label }: { id: string; view: string; alt: string; enabled: boolean; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/10] bg-white">
      {!enabled || failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-50 to-blue-light px-4 text-center text-muted">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span className="text-xs">{enabled ? "Not found for this address" : "Appears once Google Maps is connected"}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/streetview?id=${encodeURIComponent(id)}&view=${view}`} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-ink shadow-sm">{label}</span>
    </div>
  );
}
