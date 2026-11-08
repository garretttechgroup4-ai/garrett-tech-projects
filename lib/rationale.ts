/**
 * "Why this could be a deal" write-up for one property.
 * - AI (Claude) when ANTHROPIC_API_KEY is set and the score qualifies.
 * - Plain automatic summary otherwise (no key, low score, or AI error).
 * AI results are cached in the store so each property is paid for once
 * per set of signals + config version.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CONFIG_VERSION, SIGNAL_BY_ID } from "./config";
import { moneyFull, yearsSince } from "./format";
import { scoreProperty } from "./scoring";
import { getRationale, saveRationale } from "./store";
import type { Property } from "./types";

export const RATIONALE_MODEL = "claude-opus-5-5";

export interface Rationale {
  kind: "ai" | "summary";
  text: string;
  model?: string;
  /** Why an AI write-up wasn't produced, in plain English. */
  note?: string;
  createdAt: string;
}

const SYSTEM = `You write short deal notes for a real estate investor who buys off-market properties directly from owners in Chicago.

Given one property's facts and its motivated-seller signals, write 2–3 sentences in plain, warm English explaining why this could be a good opportunity and the most respectful way to approach the owner.

Rules:
- Use only the facts provided. Never invent numbers, names, or circumstances.
- Lead with the strongest signal and what it likely means for the owner.
- Mention the equity position when it matters for making an offer.
- Be respectful about sensitive situations (death, divorce, debt, bankruptcy): describe them factually, never speculate about personal details, and favour a helpful, no-pressure approach.
- No headings, bullet points, or markdown. Under 90 words.`;

function cacheKey(p: Property) {
  return `${p.id}|v${CONFIG_VERSION}|${[...p.signals].sort().join(",")}`;
}

function factsFor(p: Property) {
  const s = scoreProperty(p);
  return {
    address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`,
    neighborhood: p.neighborhood ?? null,
    propertyType: p.propertyType,
    bedsBaths: [p.beds, p.baths],
    squareFeet: p.sqft,
    yearBuilt: p.yearBuilt,
    estimatedValue: p.estimatedValue,
    ownerEquityPercent: p.equityPercent,
    ownerEquityAmount: p.equityAmount,
    yearsOwned: yearsSince(p.lastSaleDate),
    lastSalePrice: p.lastSalePrice,
    ownerLivesThere: p.ownerOccupied,
    ownerMailingState: p.ownerMailingState,
    listedForSale: p.listedForSale,
    dealScore: `${s.score}/100 (${s.band.label})`,
    signals: s.breakdown.map((b) => ({ signal: b.label, meaning: SIGNAL_BY_ID[b.id]?.description })),
  };
}

/** Free, instant summary built from the signals. Used whenever AI isn't. */
export function summaryRationale(p: Property, note?: string): Rationale {
  const s = scoreProperty(p);
  let text: string;
  if (!s.breakdown.length) {
    text = "No motivated-seller signals on record. This owner may not be looking to sell right now.";
  } else {
    const top = s.breakdown.slice(0, 3).map((b) => b.label.toLowerCase());
    const list = top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}` : top[0];
    const value = p.estimatedValue != null ? ` (estimated value ${moneyFull(p.estimatedValue)})` : "";
    const equity =
      p.equityPercent == null
        ? ""
        : p.equityPercent >= 100
          ? ` The owner owns it outright${value}.`
          : ` The owner holds about ${p.equityPercent}% equity${value}.`;
    text = `${s.band.label} lead (${s.score}/100): ${list}.${equity}`;
  }
  return { kind: "summary", text, note, createdAt: new Date().toISOString() };
}

let client: Anthropic | null = null;

async function aiRationale(p: Property): Promise<string> {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const response = await client.beta.messages.create({
    model: RATIONALE_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content: `Property facts (JSON):\n${JSON.stringify(factsFor(p), null, 2)}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("declined");
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
  if (!text) throw new Error("empty response");
  return text;
}

export async function rationaleFor(p: Property): Promise<Rationale> {
  const s = scoreProperty(p);
  if (!s.aiEligible) return summaryRationale(p, "Below the score needed for an AI write-up.");
  if (!process.env.ANTHROPIC_API_KEY) return summaryRationale(p, "AI write-ups turn on when the Anthropic key is added.");

  const key = cacheKey(p);
  const cached = await getRationale(key);
  if (cached) return cached;

  try {
    const text = await aiRationale(p);
    const r: Rationale = { kind: "ai", text, model: RATIONALE_MODEL, createdAt: new Date().toISOString() };
    await saveRationale(key, r);
    return r;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic key rejected");
      return summaryRationale(p, "The Anthropic key was rejected — check it in your settings.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      return summaryRationale(p, "AI is busy right now — try again in a minute.");
    }
    console.error("rationale failed", err);
    return summaryRationale(p, "AI write-up unavailable right now.");
  }
}
