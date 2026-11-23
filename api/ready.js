// A phone tapped "Got it!" on How to play: count it as ready (all three games).
// POST /api/ready { g, pid, name } -> { ok }
import { redis, reply, text, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req), pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  await redis.hset(p + "ready", { [name]: "1" });
  reply(res, 200, { ok: true });
}
