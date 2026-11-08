import { NextResponse } from "next/server";
import { rationaleFor } from "@/lib/rationale";
import { getProperty } from "@/lib/store";

/** POST { id } → the property's deal write-up (AI when available and qualified). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const p = id ? await getProperty(id) : null;
  if (!p) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  return NextResponse.json(await rationaleFor(p));
}
