// Victor's interview (Who's That Tribute): a phone sends a question for the winner.
// POST /api/ask { pid, name, q } -> { ok }
import { redis, reply, text, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req), pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), q = text(req.body?.q, 140);
  if (!q) return reply(res, 400, { error: "Empty question" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  if (!(await redis.set(`${p}askrl:${name}`, "1", { nx: true, px: 3000 }))) return reply(res, 429, { error: "Slow down" });
  const id = await redis.incr(p + "askid");
  await redis.rpush(p + "asks", JSON.stringify({ id, name, q }));
  reply(res, 200, { ok: true });
}
