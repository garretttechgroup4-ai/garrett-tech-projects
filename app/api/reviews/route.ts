import { NextResponse } from "next/server";
import { CONFIG } from "@/lib/scoring";
import { addReview, getProperty } from "@/lib/store";
import type { ReviewAction } from "@/lib/types";

const ACTIONS: ReviewAction[] = ["agree", "override", "eyes_on", "teardown_confirmed", "teardown_rejected"];

/** Agree / Override (reason required) / Eyes-on / teardown confirm or reject. */
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const action = b?.action as ReviewAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (typeof b?.radarId !== "string" || !(await getProperty(b.radarId))) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }
  const reason = typeof b?.reason === "string" ? b.reason.trim().slice(0, 500) : "";
  let newScore: number | null = null;
  if (action === "override") {
    newScore = Number(b?.newScore);
    const { score_min, score_max } = CONFIG.thresholds;
    if (!Number.isInteger(newScore) || newScore < score_min || newScore > score_max) {
      return NextResponse.json({ error: `Pick a score from ${score_min} to ${score_max}.` }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: "Please say why you're changing the score." }, { status: 400 });
  }
  const defaults: Record<ReviewAction, string> = {
    agree: "Score looks right",
    override: "",
    eyes_on: "Saw it in person",
    teardown_confirmed: "Teardown confirmed by a person",
    teardown_rejected: "Not a teardown",
  };
  const review = await addReview({
    radarId: b.radarId,
    action,
    newScore,
    reason: reason || defaults[action],
    reviewer: "Team member", // replaced by the signed-in profile once Supabase auth is connected
  });
  return NextResponse.json(review);
}
