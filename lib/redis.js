// Shared by every file in api/. The Upstash for Redis integration on Vercel adds
// the connection settings (KV_REST_API_URL / KV_REST_API_TOKEN) automatically.
import { Redis } from "@upstash/redis";

// Values come back as plain strings; we parse the one JSON value ("game") ourselves.
export const redis = globalThis.__testRedis || Redis.fromEnv({ automaticDeserialization: false });

// Keys (only one game at a time):
//   game          one JSON value the TV writes: what phones need to see
//   players       hash  name -> phone id
//   answers:<qi>  hash  name -> answer, one per face
export async function readGame() {
  const raw = await redis.get("game");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function reply(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
}

// A non-empty string no longer than max, or null.
export const text = (v, max) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
