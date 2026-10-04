import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { matchFollowToClick } from "../../src/attribution.mjs";
import { attributionStore, utcDateKey } from "../../src/store.mjs";
import { sendToBrain } from "../../src/sink.mjs";

function validSignature(rawBody, receivedSignature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !receivedSignature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  if (!validSignature(rawBody, req.headers.get("x-line-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const store = attributionStore();

  for (const event of payload.events ?? []) {
    if (event.type !== "follow") continue;

    const eventId = event.webhookEventId || `${event.timestamp}-${randomUUID()}`;
    const occurredAtMs = Number(event.timestamp);
    const isUnblocked = Boolean(event.follow?.isUnblocked);
    const follow = {
      follow_id: eventId,
      type: "line_follow",
      occurred_at_ms: occurredAtMs,
      occurred_at: new Date(occurredAtMs).toISOString(),
      is_unblocked: isUnblocked,
      new_friend_candidate: !isUnblocked,
      mode: event.mode ?? null,
      redelivery: Boolean(event.deliveryContext?.isRedelivery),
    };

    const followKey = `follows/${utcDateKey(occurredAtMs)}/${eventId}.json`;
    const write = await store.setJSON(followKey, follow, { onlyIfNew: true });
    if (!write.modified) continue;

    await sendToBrain("line_follow", follow);

    const matched = await matchFollowToClick(store, follow);
    const match = {
      match_id: eventId,
      follow_id: eventId,
      occurred_at_ms: occurredAtMs,
      occurred_at: follow.occurred_at,
      is_unblocked: isUnblocked,
      count_as_new_friend: !isUnblocked,
      ...matched,
    };

    await store.setJSON(`matches/${utcDateKey(occurredAtMs)}/${eventId}.json`, match, { onlyIfNew: true });
    await sendToBrain("attribution_match", match);
  }

  return new Response("OK", { status: 200 });
};
