"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { pinColor } from "@/lib/config";
import type { Property, Ring } from "@/lib/types";

const CENTER: L.LatLngExpression = [41.914, -87.6775]; // Bucktown / Wicker Park

const toLatLngs = (ring: Ring) => ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);

interface Props {
  boundary: Ring | null;
  draft: Ring;
  drawing: boolean;
  properties: Property[];
  selectedId: string | null;
  onMapTap: (lng: number, lat: number) => void;
  onSelect: (id: string) => void;
}

export default function DealMap({ boundary, draft, drawing, properties, selectedId, onMapTap, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const shapeLayer = useRef<L.LayerGroup | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const tapRef = useRef(onMapTap);
  const selectRef = useRef(onSelect);
  tapRef.current = onMapTap;
  selectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: CENTER, zoom: 15, zoomControl: false });
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);
    shapeLayer.current = L.layerGroup().addTo(m);
    pinLayer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => tapRef.current(e.latlng.lng, e.latlng.lat));
    map.current = m;
    const node = el.current;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(node);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Crosshair cursor while drawing.
  useEffect(() => {
    if (el.current) el.current.style.cursor = drawing ? "crosshair" : "";
    // Quick taps while outlining must add points, not zoom in.
    if (map.current) {
      if (drawing) map.current.doubleClickZoom.disable();
      else map.current.doubleClickZoom.enable();
    }
  }, [drawing]);

  // Boundary + draft outline.
  useEffect(() => {
    const layer = shapeLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (drawing && draft.length) {
      const pts = toLatLngs(draft);
      if (pts.length >= 2) {
        L.polygon(pts, { color: "#2563eb", weight: 3, dashArray: "6 6", fillOpacity: 0.08, interactive: false }).addTo(layer);
      }
      pts.forEach((pt, i) =>
        L.circleMarker(pt, {
          radius: i === 0 ? 9 : 7,
          color: "#fff",
          weight: 3,
          fillColor: "#2563eb",
          fillOpacity: 1,
          interactive: false,
        }).addTo(layer)
      );
    } else if (boundary) {
      L.polygon(toLatLngs(boundary), {
        color: "#2563eb",
        weight: 3,
        fillColor: "#3b82f6",
        fillOpacity: 0.07,
        interactive: false,
      }).addTo(layer);
    }
  }, [boundary, draft, drawing]);

  // Fit to a newly set boundary.
  useEffect(() => {
    if (map.current && boundary && !drawing) {
      map.current.fitBounds(L.latLngBounds(toLatLngs(boundary)), { padding: [24, 24], maxZoom: 16 });
    }
  }, [boundary, drawing]);

  // Property pins.
  useEffect(() => {
    const layer = pinLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const p of properties) {
      const selected = p.id === selectedId;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: selected ? 12 : 8,
        color: "#fff",
        weight: selected ? 4 : 2,
        fillColor: pinColor(p.signals),
        fillOpacity: 1,
        interactive: !drawing,
      });
      marker.bindTooltip(p.address, { direction: "top", offset: [0, -8] });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectRef.current(p.id);
      });
      marker.addTo(layer);
      if (selected) marker.bringToFront();
    }
  }, [properties, selectedId, drawing]);

  return <div ref={el} className="h-full w-full" aria-label="Map" />;
}
