import { NextResponse } from "next/server";
import { getCriteriaProfile, saveCriteriaProfile } from "@/lib/criteria";
import type { CriteriaProfile } from "@/lib/types";

export async function GET() {
  const profile = await getCriteriaProfile();
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as CriteriaProfile;
  await saveCriteriaProfile(body);
  const profile = await getCriteriaProfile();
  return NextResponse.json(profile);
}
