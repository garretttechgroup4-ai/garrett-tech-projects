import { NextResponse } from "next/server";
import { exploreSample, listLists } from "@/lib/propertyradar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? 5);

  const [listsResult, sampleResult] = await Promise.allSettled([
    listLists(),
    exploreSample({ listId, limit }),
  ]);

  return NextResponse.json({
    lists: listsResult.status === "fulfilled" ? listsResult.value : { error: listsResult.reason?.message },
    sample: sampleResult.status === "fulfilled" ? sampleResult.value : { error: sampleResult.reason?.message },
  });
}
