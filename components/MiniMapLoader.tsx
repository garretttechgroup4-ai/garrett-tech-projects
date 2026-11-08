"use client";

import dynamic from "next/dynamic";

const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false, loading: () => <div className="h-full w-full bg-slate-100" /> });

export default function MiniMapLoader(props: { lat: number; lng: number; color: string }) {
  return <MiniMap {...props} />;
}
