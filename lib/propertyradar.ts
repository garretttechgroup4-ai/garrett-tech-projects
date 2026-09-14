const BASE_URL = process.env.PROPERTYRADAR_BASE_URL || "https://api.propertyradar.com/v1";

function getApiKey(): string {
  const key = process.env.PROPERTYRADAR_API;
  if (!key) {
    throw new Error(
      "PROPERTYRADAR_API is not set. Add Prashanth's key as an environment variable " +
        "(Vercel project settings or .env.local) — never hardcode it or paste it into chat."
    );
  }
  return key;
}

async function propertyRadarRequest(pathAndQuery: string, init: RequestInit = {}) {
  const key = getApiKey();
  const res = await fetch(`${BASE_URL}${pathAndQuery}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PropertyRadar request failed (${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * Phase 1 — API exploration. Confirm the real endpoint paths and field
 * names against PropertyRadar's official API docs before trusting this;
 * it exists to surface whatever the API actually returns, not to assume
 * a schema in advance.
 */
export async function listLists() {
  return propertyRadarRequest("/lists");
}

export async function exploreSample(params: { listId?: string; limit?: number } = {}) {
  const { listId, limit = 5 } = params;
  const query = new URLSearchParams({ limit: String(limit) });
  if (listId) query.set("listId", listId);
  return propertyRadarRequest(`/properties?${query.toString()}`);
}
