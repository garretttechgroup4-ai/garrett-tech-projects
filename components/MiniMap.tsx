"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MiniMap({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: [lat, lng], zoom: 17, zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: "&copy; OpenStreetMap &copy; CARTO",
    }).addTo(m);
    L.circleMarker([lat, lng], { radius: 11, color: "#fff", weight: 3, fillColor: color, fillOpacity: 1 }).addTo(m);
    return () => {
      m.remove();
    };
  }, [lat, lng, color]);
  return <div ref={el} className="h-full w-full" />;
}
