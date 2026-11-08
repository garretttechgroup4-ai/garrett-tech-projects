import demoData from "@/data/demo-properties.json";
import { pointInRing } from "../geo";
import { applyDerivedSignals } from "../signals";
import type { Property, Ring } from "../types";

const ALL: Property[] = (demoData as Property[]).map((p) => applyDerivedSignals(p));

export function demoInArea(ring: Ring): Property[] {
  return ALL.filter((p) => pointInRing(p.lng, p.lat, ring));
}

export function demoById(id: string): Property | undefined {
  return ALL.find((p) => p.id === id);
}
