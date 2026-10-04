import { attributionStore, listJsonByPrefixes } from "../../src/store.mjs";

const SOURCE_ORDER = ["instagram", "tiktok", "x"];

function jstDayBounds(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Invalid date");
  const start = Date.parse(`${dateKey}T00:00:00+09:00`);
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function utcPrefixes(prefix, start, end) {
  const oneDay = 24 * 60 * 60 * 1000;
  const keys = new Set();
  for (let t = start - oneDay; t <= end + oneDay; t += oneDay) {
    keys.add(`${prefix}/${new Date(t).toISOString().slice(0, 10)}/`);
  }
  return [...keys];
}

export default async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ||
    new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let bounds;
  try { bounds = jstDayBounds(date); }
  catch { return Response.json({ error: "date must be YYYY-MM-DD" }, { status: 400 }); }

  const store = attributionStore();
  const [clicks, follows, matches] = await Promise.all([
    listJsonByPrefixes(store, utcPrefixes("clicks", bounds.start, bounds.end)),
    listJsonByPrefixes(store, utcPrefixes("follows", bounds.start, bounds.end)),
    listJsonByPrefixes(store, utcPrefixes("matches", bounds.start, bounds.end)),
  ]);

  const inDay = (e) => e.occurred_at_ms >= bounds.start && e.occurred_at_ms < bounds.end;
  const dayClicks = clicks.filter(inDay);
  const dayFollows = follows.filter(inDay);
  const dayMatches = matches.filter(inDay);

  const bySource = Object.fromEntries(SOURCE_ORDER.map((s) => [
    s, { clicks: 0, attributed_new_friends: 0, high: 0, medium: 0, low: 0 }
  ]));

  for (const click of dayClicks) {
    if (bySource[click.source]) bySource[click.source].clicks += 1;
  }
  for (const match of dayMatches) {
    if (!match.count_as_new_friend || !match.source || !bySource[match.source]) continue;
    bySource[match.source].attributed_new_friends += 1;
    const c = String(match.confidence || "").toLowerCase();
    if (c in bySource[match.source]) bySource[match.source][c] += 1;
  }

  return Response.json({
    date,
    timezone: "Asia/Tokyo",
    clicks_total: dayClicks.length,
    follow_events_total: dayFollows.length,
    new_friend_events: dayFollows.filter((f) => !f.is_unblocked).length,
    unblock_events: dayFollows.filter((f) => f.is_unblocked).length,
    matched_new_friends: dayMatches.filter((m) => m.count_as_new_friend && m.source).length,
    unattributed_new_friends: dayMatches.filter((m) => m.count_as_new_friend && !m.source).length,
    by_source: bySource,
    generated_at: new Date().toISOString(),
  }, { headers: { "cache-control": "no-store" } });
};
