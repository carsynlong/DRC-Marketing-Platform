// A phone sends an emoji that floats up the TV (District Secrets).
// POST /api/react { g, pid, name, e } -> { ok }
import { redis, reply, text, prefix } from "../lib/redis.js";

export const EMOJI = ["😂", "😱", "🤫", "🔥", "🎄", "🤯", "👀", "❤️"];

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req);
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), e = req.body?.e;
  if (!EMOJI.includes(e)) return reply(res, 400, { error: "Unknown emoji" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  // One counter per emoji; the TV floats up however many are new since it last looked.
  await redis.hincrby(p + "react", e, 1);
  reply(res, 200, { ok: true });
}
