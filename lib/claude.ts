/**
 * Claude calls (server only): one-line score reasons and teardown review.
 * Every AI result has a non-AI fallback, so the app works without a key.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ScoredItem } from "./scored";
import type { Summary, TeardownAI } from "./store";

export const MODEL = "claude-opus-5-5";
export const anthropicKey = () => process.env.ANTHROPIC_API_KEY || null;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY

/** Signals Claude never sees or mentions (divorce is a flag only). */
const NEVER_MENTION = new Set(["divorce"]);

/** Cache key: same property, same score, same signals, same config → same line. */
export function summaryKey(item: ScoredItem, configVersion: number) {
  const ids = item.score.matched.map((m) => m.id).sort().join(",");
  return `${item.property.radarId}|v${configVersion}|${item.score.score}|${ids}`;
}

const SUMMARY_SYSTEM = `You write one-line score reasons for a Chicago realtor's internal call list.

For each property you get its score (1–10) and the matched signals with short evidence. Write one line in exactly this form:
"<score> — <the 2–4 strongest reasons, plain English, comma-separated>"
Example: "8 — code violations, owns 3 properties, 62% equity"

Rules: use only the evidence given; never invent facts; keep each line under 14 words; no judgement about the owner as a person.`;

/** Batch of up to ~20 properties → one request. Returns radarId → line. */
export async function aiSummaries(items: ScoredItem[]): Promise<Record<string, string>> {
  const input = items.map((i) => ({
    radarId: i.property.radarId,
    score: i.score.score,
    signals: i.score.matched.filter((m) => !NEVER_MENTION.has(m.id)).map((m) => m.evidence),
  }));
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            lines: {
              type: "array",
              items: {
                type: "object",
                properties: { radarId: { type: "string" }, line: { type: "string" } },
                required: ["radarId", "line"],
                additionalProperties: false,
              },
            },
          },
          required: ["lines"],
          additionalProperties: false,
        },
      },
    },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`summary stopped: ${response.stop_reason}`);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as { lines: { radarId: string; line: string }[] };
  const wanted = new Set(input.map((i) => i.radarId));
  return Object.fromEntries(parsed.lines.filter((l) => wanted.has(l.radarId) && l.line.trim()).map((l) => [l.radarId, l.line.trim()]));
}

export function autoSummary(item: ScoredItem): Summary {
  return { text: item.score.reason, kind: "auto", createdAt: new Date().toISOString() };
}

const TEARDOWN_SYSTEM = `You look at a street-level photo of a Chicago property for a residential developer.
Judge the building only from what is visible: likely_teardown (worn, small or obsolete structure where the land is worth more than the building), renovate (sound older building worth keeping), newer_build (recent construction), or cant_tell (photo unclear, blocked, or wrong building).
Give one or two plain-English sentences on what you see that led to the call. Never guess about the people who live there.`;

/** Claude vision review of the live street image. A person must confirm or reject the result. */
export async function teardownReview(image: { data: string; mediaType: "image/jpeg" | "image/png" }, address: string): Promise<TeardownAI> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["likely_teardown", "renovate", "newer_build", "cant_tell"] },
            why: { type: "string" },
          },
          required: ["verdict", "why"],
          additionalProperties: false,
        },
      },
    },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: TEARDOWN_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
          { type: "text", text: `Street view of ${address}.` },
        ],
      },
    ],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`teardown review stopped: ${response.stop_reason}`);
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = JSON.parse(text) as Omit<TeardownAI, "createdAt">;
  return { ...parsed, createdAt: new Date().toISOString() };
}

export function friendlyAIError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The Anthropic key was rejected — check it in your settings.";
  if (err instanceof Anthropic.RateLimitError) return "Claude is busy right now — try again in a minute.";
  return "Claude couldn't do this right now. Try again later.";
}
