// Shared by every file in api/. The Upstash for Redis integration on Vercel adds
// the connection settings (KV_REST_API_URL / KV_REST_API_TOKEN) automatically.
import { Redis } from "@upstash/redis";

// Values come back as plain strings; we parse the one JSON value ("game") ourselves.
export const redis = globalThis.__testRedis || Redis.fromEnv({ automaticDeserialization: false });

// Keys (District Secrets uses the same names with a "ds:" prefix):
//   game          one JSON value the TV writes: what phones need to see
//   players       hash  name -> phone id
//   answers:<qi>  hash  name -> answer, one per face
export async function readGame(p = "") {
  const raw = await redis.get(p + "game");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// A whole hash as { field: value }. With automaticDeserialization off, Upstash
// returns HGETALL as a flat list [field, value, field, value, ...].
export async function hash(key) {
  const raw = await redis.hgetall(key);
  if (!raw) return {};
  if (!Array.isArray(raw)) return raw;
  const obj = {};
  for (let i = 0; i < raw.length; i += 2) obj[raw[i]] = raw[i + 1];
  return obj;
}

export function reply(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
}

// Wrap a handler so a bad JSON body is a 400 and a database hiccup is a JSON 500, never a crash page.
// (On Vercel, reading req.body throws when the JSON is broken.)
export const safe = fn => async (req, res) => {
  try { req.body; } catch { return reply(res, 400, { error: "Bad request" }); }
  try { return await fn(req, res); } catch (e) {
    try { console.error(e); } catch {}
    if (!res.headersSent) { try { return reply(res, 500, { error: "Server error" }); } catch {} }
  }
};

// "I'm still here" keys (seen:<name>) without a database call on every poll: SET key EX ex, but at most
// once every `every` ms per phone from this warm server instance (other instances refresh on their own,
// so the key never lapses while the phone keeps checking in). `every` must be well under `ex`.
const touched = new Map();
export async function touch(key, ex, every, who = "") {
  const k = key + "|" + who, now = Date.now(), t = touched.get(k);
  if (t && now - t < every) return false;
  await redis.set(key, "1", { ex });
  touched.set(k, now);
  if (touched.size > 400) for (const [x, v] of touched) if (now - v > ex * 1000) touched.delete(x);
  return true;
}

// A non-empty string no longer than max, or null.
export const text = (v, max) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

// Which game a request is for. Each game keeps its own keys so they never mix:
//   Who's That Tribute: game, players, answers:<qi>
//   District Secrets:   ds:game, ds:players, ds:answers:<qi>   (requests send g=ds)
//   District Feud:      df:game, df:players, df:answers:<qi>   (requests send g=df)
export const prefix = req => {
  const g = req.query?.g ?? req.body?.g;
  return g === "ds" ? "ds:" : g === "df" ? "df:" : "";
};
