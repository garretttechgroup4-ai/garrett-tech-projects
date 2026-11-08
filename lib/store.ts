/**
 * Storage behind one interface. Today: a local JSON file in data/local/
 * (gitignored). Once Supabase keys are provided, add a Supabase
 * implementation of the same functions using supabase/schema.sql.
 * If the filesystem is read-only (e.g. Vercel), falls back to memory.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { demoById } from "./sources/demo";
import type { DataSource, Property, Ring, SearchRecord } from "./types";

interface StoreShape {
  searches: SearchRecord[];
  properties: Record<string, Property>;
}

const FILE = path.join(process.cwd(), "data", "local", "store.json");
let memory: StoreShape | null = null;

async function load(): Promise<StoreShape> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(FILE, "utf-8")) as StoreShape;
  } catch {
    memory = { searches: [], properties: {} };
  }
  return memory;
}

async function persist(data: StoreShape) {
  memory = data;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2));
  } catch {
    // Read-only filesystem: keep in memory only until Supabase is connected.
  }
}

export async function saveSearch(input: {
  source: DataSource;
  boundary: Ring;
  previewCount: number | null;
  properties: Property[];
}): Promise<SearchRecord> {
  const data = await load();
  const search: SearchRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source: input.source,
    boundary: input.boundary,
    previewCount: input.previewCount,
    propertyIds: input.properties.map((p) => p.id),
  };
  for (const p of input.properties) data.properties[p.id] = p;
  data.searches = [search, ...data.searches].slice(0, 50);
  await persist(data);
  return search;
}

export async function latestSearch(source: DataSource): Promise<{ search: SearchRecord; properties: Property[] } | null> {
  const data = await load();
  const search = data.searches.find((s) => s.source === source);
  if (!search) return null;
  const properties = search.propertyIds.map((id) => data.properties[id]).filter(Boolean);
  return { search, properties };
}

export async function getProperty(id: string): Promise<Property | null> {
  const data = await load();
  return data.properties[id] ?? demoById(id) ?? null;
}
