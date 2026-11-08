import { NextResponse } from "next/server";
import { currentSource } from "@/lib/sources";
import { latestSearch } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await latestSearch(currentSource()));
}
