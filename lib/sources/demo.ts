import "server-only";
import demoProperties from "@/data/demo-properties.json";
import demoSales from "@/data/demo-sales.json";
import { pointInRing } from "../geo";
import { passesPrefilter } from "../scoring";
import type { ComparableSale, Property, Ring } from "../types";

const ALL = demoProperties as Property[];

/** Demo records inside the area that pass Joe's prefilter (same rule live data gets from PropertyRadar). */
export function demoInArea(ring: Ring): Property[] {
  return ALL.filter((p) => pointInRing(p.lng, p.lat, ring) && passesPrefilter(p));
}

export const DEMO_SALES = demoSales as ComparableSale[];
