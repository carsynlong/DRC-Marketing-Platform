// Capitol coins collected by tapping floating coins on a phone while waiting.
// POST /api/coins { pid, name, coins } -> { ok }
import { redis, reply, text } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);
  const coins = Math.min(Math.max(Number.parseInt(req.body?.coins, 10) || 0, 0), 999);
  if (!pid || !name || (await redis.hget("players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  await redis.hset("coins", { [name]: String(coins) });
  reply(res, 200, { ok: true });
}
