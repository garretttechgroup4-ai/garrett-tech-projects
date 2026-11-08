import { NextResponse } from "next/server";
import { listBoundaries } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await listBoundaries());
}
