import { aroundUtcDateKeys, listJsonByPrefixes } from "./store.mjs";

const MINUTE = 60 * 1000;
const MATCH_WINDOW_MS = 30 * MINUTE;
const HIGH_WINDOW_MS = 10 * MINUTE;

export async function matchFollowToClick(store, follow) {
  const prefixes = aroundUtcDateKeys(follow.occurred_at_ms).map((d) => `clicks/${d}/`);
  const clicks = await listJsonByPrefixes(store, prefixes);

  const candidates = clicks
    .filter((click) => {
      const lag = follow.occurred_at_ms - click.occurred_at_ms;
      return lag >= 0 && lag <= MATCH_WINDOW_MS;
    })
    .sort((a, b) => b.occurred_at_ms - a.occurred_at_ms);

  if (candidates.length === 0) {
    return {
      source: null, confidence: "UNKNOWN", click_id: null, lag_seconds: null,
      candidate_click_count: 0, candidate_sources: [], rule: "no_click_within_30m",
    };
  }

  const distinctSources = [...new Set(candidates.map((c) => c.source))];
  const nearest = candidates[0];
  const lagMs = follow.occurred_at_ms - nearest.occurred_at_ms;

  if (distinctSources.length === 1 && lagMs <= HIGH_WINDOW_MS) {
    return {
      source: nearest.source, confidence: "HIGH", click_id: nearest.click_id,
      lag_seconds: Math.round(lagMs / 1000), candidate_click_count: candidates.length,
      candidate_sources: distinctSources, rule: "single_source_within_10m",
    };
  }

  if (distinctSources.length === 1) {
    return {
      source: nearest.source, confidence: "MEDIUM", click_id: nearest.click_id,
      lag_seconds: Math.round(lagMs / 1000), candidate_click_count: candidates.length,
      candidate_sources: distinctSources, rule: "single_source_within_30m",
    };
  }

  return {
    source: nearest.source, confidence: "LOW", click_id: nearest.click_id,
    lag_seconds: Math.round(lagMs / 1000), candidate_click_count: candidates.length,
    candidate_sources: distinctSources, rule: "multiple_sources_within_30m_nearest_selected",
  };
}
