// A phone sends an emoji burst that pops up on the TV with the sender's name (both games).
// POST /api/react { g, pid, name, e } -> { ok }
import { redis, reply, text, prefix, safe } from "../lib/redis.js";

export const EMOJI = ["🤫", "🔥", "🏹", "🎁", "🕵️", "😱", "😂", "🎄"];                // District Secrets (g=ds)
export const TRIBUTE_EMOJI = ["🏹", "🔥", "🌹", "🍞", "🐦", "🎁", "😱", "😂"];          // Who's That Tribute
export const FEUD_EMOJI = ["🎁", "🎄", "🔔", "⭐", "👏", "😂", "😱", "🔥", "❤️", "🤔", "🙈", "🏹"]; // District Feud (g=df)

export default safe(async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req);
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), e = req.body?.e;
  if (!(p === "ds:" ? EMOJI : p === "df:" ? FEUD_EMOJI : TRIBUTE_EMOJI).includes(e)) return reply(res, 400, { error: "Unknown emoji" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  // At most about three bursts a second per person, so nobody can flood the TV.
  if (!(await redis.set(`${p}rl:${name}`, "1", { nx: true, px: 300 }))) return reply(res, 429, { error: "Slow down" });
  // A short rolling log of { id, name, e }; the TV pops up every burst newer than the last one it showed.
  const id = await redis.incr(p + "reactid");
  await redis.lpush(p + "reactlog", JSON.stringify({ id, name, e }));
  if (id % 10 === 0) await redis.ltrim(p + "reactlog", 0, 59);   // trim every 10th burst (the TV only reads the newest 60)
  reply(res, 200, { ok: true });
});
