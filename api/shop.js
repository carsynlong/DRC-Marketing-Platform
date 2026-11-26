// Sponsor shop (Who's That Tribute): spend Capitol coins on a power-up for the next face.
// POST /api/shop { pid, name, item, target, qi } -> { ok, left }
import { redis, reply, text, prefix, safe } from "../lib/redis.js";

export const PRICES = { shield: 3, spy: 2, dd: 4, rose: 3 };

export default safe(async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req), pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), item = req.body?.item;
  const qi = Number.parseInt(req.body?.qi, 10), target = text(req.body?.target, 40);
  if (!PRICES[item] || !Number.isInteger(qi) || qi < 0 || qi > 100) return reply(res, 400, { error: "Bad item" });
  if (item === "rose" && (!target || target === name)) return reply(res, 400, { error: "Pick someone else" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  const coins = +(await redis.hget(p + "coins", name)) || 0, spent = +(await redis.hget(p + "spent", name)) || 0;
  if (coins - spent < PRICES[item]) return reply(res, 402, { error: "Not enough coins", left: coins - spent });
  // one of each power-up per person per face
  if (!(await redis.hsetnx(`${p}buys:${qi}`, `${name}|${item}`, target || "1"))) return reply(res, 409, { error: "Already bought" });
  await redis.hincrby(p + "spent", name, PRICES[item]);
  reply(res, 200, { ok: true, left: coins - spent - PRICES[item] });
});
