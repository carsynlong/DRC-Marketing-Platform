// Mini-games (Who's That Tribute): a phone reports how many taps or shakes it has done.
// POST /api/mini { pid, name, id, n } -> { ok }
import { redis, readGame, reply, text, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req);
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40);
  const n = Math.min(Math.max(Number.parseInt(req.body?.n, 10) || 0, 0), 2000);
  const game = await readGame(p);
  if (!game || game.phase !== "mini" || game.mini?.stage !== "live" || game.mini?.id !== req.body?.id) return reply(res, 409, { error: "Not running" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  await redis.hset(p + "mini", { [name]: String(n) });
  reply(res, 200, { ok: true });
}
