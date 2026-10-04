export const SOURCE_CONFIG = {
  instagram: { aliases: ["ig", "instagram"], lineUrl: "https://lin.ee/Rgoozda" },
  tiktok: { aliases: ["tt", "tiktok"], lineUrl: "https://lin.ee/N5kkdJR" },
  x: { aliases: ["x", "twitter"], lineUrl: "https://lin.ee/N3q0k3gU" },
};

export function normalizeSource(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  for (const [key, config] of Object.entries(SOURCE_CONFIG)) {
    if (key === raw || config.aliases.includes(raw)) return key;
  }
  return null;
}

export function getLineUrl(source) {
  return SOURCE_CONFIG[source]?.lineUrl ?? null;
}

export function cleanOptional(value, max = 120) {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}
