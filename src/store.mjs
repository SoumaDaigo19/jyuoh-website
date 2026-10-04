import { getStore } from "@netlify/blobs";

export const STORE_NAME = "juoh-line-attribution";

export function attributionStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export function utcDateKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function aroundUtcDateKeys(ms) {
  const oneDay = 24 * 60 * 60 * 1000;
  return [utcDateKey(ms), utcDateKey(ms - oneDay)];
}

export async function safeGetJson(store, key) {
  const result = await store.get(key, { type: "json", consistency: "strong" });
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, "data")) return result.data;
  return result;
}

export async function listJsonByPrefixes(store, prefixes) {
  const out = [];
  for (const prefix of prefixes) {
    const { blobs } = await store.list({ prefix });
    for (const blob of blobs) {
      const value = await safeGetJson(store, blob.key);
      if (value) out.push(value);
    }
  }
  return out;
}
