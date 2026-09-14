import { promises as fs } from "fs";
import path from "path";
import type { CriteriaProfile } from "./types";

const PROFILE_PATH = path.join(process.cwd(), "data", "criteria-profile.json");

export async function getCriteriaProfile(): Promise<CriteriaProfile> {
  const raw = await fs.readFile(PROFILE_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function saveCriteriaProfile(profile: CriteriaProfile): Promise<void> {
  const withTimestamp: CriteriaProfile = { ...profile, updatedAt: new Date().toISOString() };
  await fs.writeFile(PROFILE_PATH, JSON.stringify(withTimestamp, null, 2));
}
