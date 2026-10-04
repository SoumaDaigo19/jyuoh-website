export async function sendToBrain(type, data) {
  const url = process.env.BRAIN_INGEST_URL;
  if (!url) return { skipped: true };

  const headers = { "content-type": "application/json" };
  if (process.env.BRAIN_INGEST_SECRET) {
    headers["x-juoh-secret"] = process.env.BRAIN_INGEST_SECRET;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ type, data }),
  });

  return { skipped: false, ok: response.ok, status: response.status };
}
