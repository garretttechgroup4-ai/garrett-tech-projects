/**
 * Storage behind one interface. Today: a local JSON file in data/local/
 * (gitignored), mirroring the tables in supabase/schema.sql. When Supabase
 * keys are provided, these functions get a Supabase implementation.
 * On a read-only filesystem (e.g. Vercel) it falls back to memory.
 */
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import demoSeed from "@/data/demo-seed.json";
import type { Boundary, BuyBox, CreditLogEntry, DataSource, Property, Review, Ring, SearchRecord } from "./types";

export interface Summary {
  text: string;
  kind: "ai" | "auto";
  createdAt: string;
}

export interface TeardownAI {
  verdict: "likely_teardown" | "renovate" | "newer_build" | "cant_tell";
  why: string;
  createdAt: string;
}

export interface Settings {
  /** Admin on/off per signal id (legally gated signals ignore this). */
  signalToggles: Record<string, boolean>;
  buyBoxes: BuyBox[];
}

interface StoreShape {
  version: 2;
  boundaries: Boundary[];
  searches: SearchRecord[];
  properties: Record<string, Property>;
  creditLog: CreditLogEntry[];
  reviews: Review[];
  summaries: Record<string, Summary>;
  teardownAI: Record<string, TeardownAI>;
  settings: Settings;
}

const FILE = path.join(process.cwd(), "data", "local", "store.json");
let memory: StoreShape | null = null;

function fresh(): StoreShape {
  return {
    version: 2,
    boundaries: [],
    searches: [],
    properties: {},
    creditLog: [],
    reviews: demoSeed.reviews as Review[],
    summaries: {},
    teardownAI: {},
    settings: { signalToggles: {}, buyBoxes: [] },
  };
}

async function load(): Promise<StoreShape> {
  if (memory) return memory;
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf-8"));
    memory = data?.version === 2 ? (data as StoreShape) : fresh();
  } catch {
    memory = fresh();
  }
  return memory;
}

async function persist(data: StoreShape) {
  memory = data;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2));
  } catch {
    // Read-only filesystem: memory only until Supabase is connected.
  }
}

// ---- boundaries ------------------------------------------------------------

export async function saveBoundary(name: string, ring: Ring): Promise<Boundary> {
  const data = await load();
  const same = data.boundaries.find((b) => b.name === name && JSON.stringify(b.ring) === JSON.stringify(ring));
  if (same) return same;
  const b: Boundary = { id: randomUUID(), name, ring, createdAt: new Date().toISOString() };
  data.boundaries.unshift(b);
  await persist(data);
  return b;
}

export async function listBoundaries(): Promise<Boundary[]> {
  return (await load()).boundaries;
}

// ---- properties (cache; 30-day no-repurchase rule) ------------------------

export async function getProperty(radarId: string): Promise<Property | null> {
  return (await load()).properties[radarId] ?? null;
}

/** Records bought within the last `days` days, by RadarID. */
export async function freshIds(radarIds: string[], days: number): Promise<Set<string>> {
  const data = await load();
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  return new Set(radarIds.filter((id) => {
    const p = data.properties[id];
    return p && new Date(p.purchasedAt).getTime() >= cutoff;
  }));
}

export async function saveProperties(props: Property[]) {
  const data = await load();
  for (const p of props) data.properties[p.radarId] = p;
  await persist(data);
}

// ---- searches --------------------------------------------------------------

export async function saveSearch(s: Omit<SearchRecord, "id" | "createdAt">): Promise<SearchRecord> {
  const data = await load();
  const rec: SearchRecord = { ...s, id: randomUUID(), createdAt: new Date().toISOString() };
  data.searches = [rec, ...data.searches].slice(0, 50);
  await persist(data);
  return rec;
}

export async function latestSearch(source: DataSource): Promise<{ search: SearchRecord; properties: Property[] } | null> {
  const data = await load();
  const search = data.searches.find((s) => s.source === source);
  if (!search) return null;
  return { search, properties: search.radarIds.map((id) => data.properties[id]).filter(Boolean) };
}

// ---- credit log ------------------------------------------------------------

export async function logCredits(e: Omit<CreditLogEntry, "id" | "createdAt">) {
  const data = await load();
  data.creditLog.unshift({ ...e, id: randomUUID(), createdAt: new Date().toISOString() });
  await persist(data);
}

export async function creditLog(): Promise<CreditLogEntry[]> {
  return (await load()).creditLog;
}

// ---- reviews ---------------------------------------------------------------

export async function addReview(r: Omit<Review, "id" | "createdAt">): Promise<Review> {
  const data = await load();
  const rec: Review = { ...r, id: randomUUID(), createdAt: new Date().toISOString() };
  data.reviews.push(rec);
  await persist(data);
  return rec;
}

export async function reviewsFor(radarId: string): Promise<Review[]> {
  return (await load()).reviews.filter((r) => r.radarId === radarId);
}

export async function allReviews(): Promise<Review[]> {
  return (await load()).reviews;
}

// ---- AI results (summaries, teardown) ---------------------------------------

export async function getSummaries(keys: string[]): Promise<Record<string, Summary>> {
  const data = await load();
  return Object.fromEntries(keys.filter((k) => data.summaries[k]).map((k) => [k, data.summaries[k]]));
}

export async function saveSummaries(entries: Record<string, Summary>) {
  const data = await load();
  Object.assign(data.summaries, entries);
  await persist(data);
}

export async function getTeardownAI(radarId: string): Promise<TeardownAI | null> {
  return (await load()).teardownAI[radarId] ?? null;
}

export async function saveTeardownAI(radarId: string, t: TeardownAI) {
  const data = await load();
  data.teardownAI[radarId] = t;
  await persist(data);
}

// ---- settings --------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  return (await load()).settings;
}

export async function saveSettings(s: Settings) {
  const data = await load();
  data.settings = s;
  await persist(data);
}
