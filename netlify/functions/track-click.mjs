import { randomUUID } from "node:crypto";
import { cleanOptional, getLineUrl, normalizeSource } from "../../src/config.mjs";
import { attributionStore, utcDateKey } from "../../src/store.mjs";
import { sendToBrain } from "../../src/sink.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const source = normalizeSource(url.searchParams.get("source"));
  const target = getLineUrl(source);

  if (!source || !target) return new Response("Unknown source", { status: 400 });

  const occurredAtMs = Date.now();
  const clickId = randomUUID();
  const event = {
    click_id: clickId,
    type: "link_click",
    source,
    occurred_at_ms: occurredAtMs,
    occurred_at: new Date(occurredAtMs).toISOString(),
    content_id: cleanOptional(url.searchParams.get("content_id")),
    campaign: cleanOptional(url.searchParams.get("campaign")),
    cta: cleanOptional(url.searchParams.get("cta")),
  };

  try {
    const store = attributionStore();
    const key = `clicks/${utcDateKey(occurredAtMs)}/${String(occurredAtMs).padStart(13, "0")}-${clickId}.json`;
    await store.setJSON(key, event, { onlyIfNew: true });
    await sendToBrain("link_click", event);
  } catch (error) {
    console.error("click_store_failed", error);
  }

  return new Response(null, {
    status: 302,
    headers: { location: target, "cache-control": "no-store, max-age=0", pragma: "no-cache" },
  });
};
