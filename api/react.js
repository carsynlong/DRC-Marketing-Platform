// A phone sends an emoji reaction; the TV floats it up the screen with the sender's name.
// POST /api/react { g, pid, name, emoji } -> { ok }
// The TV reads the latest reactions with GET /api/host?g=df&r=1
import { redis, reply, text, prefix } from "../lib/redis.js";

const EMOJI = ["🎁", "🎄", "🔔", "⭐", "👏", "😂", "😱", "🔥", "❤️", "🤔", "🙈", "🏹"];

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), emoji = req.body?.emoji;
  if (!EMOJI.includes(emoji)) return reply(res, 400, { error: "Unknown emoji" });
  const p = prefix(req);
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });

  // A friendly limit so one phone can't flood the TV: about 8 taps every 2 seconds.
  const rl = `${p}rl:${name}`;
  const n = await redis.incr(rl);
  if (n === 1) await redis.expire(rl, 2);
  if (n > 8) return reply(res, 429, { error: "Slow down" });

  const seq = await redis.incr(p + "rseq");
  await redis.rpush(p + "reacts", JSON.stringify({ seq, name, emoji }));
  await redis.ltrim(p + "reacts", -40, -1); // only the latest few are ever needed
  reply(res, 200, { ok: true });
}
