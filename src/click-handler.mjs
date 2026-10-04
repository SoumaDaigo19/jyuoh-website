import { randomUUID } from "node:crypto";
import { cleanOptional, getLineUrl, normalizeSource } from "./config.mjs";
import { attributionStore, utcDateKey } from "./store.mjs";
import { sendToBrain } from "./sink.mjs";

export async function handleTrackedClick(req, forcedSource = null) {
  const url = new URL(req.url);
  const source = normalizeSource(forcedSource || url.searchParams.get("source"));
  const target = getLineUrl(source);

  if (!source || !target) {
    return new Response("Unknown source", { status: 400 });
  }

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
    headers: {
      location: target,
      "cache-control": "no-store, max-age=0",
      pragma: "no-cache",
    },
  });
}
