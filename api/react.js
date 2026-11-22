// A phone sends an emoji that floats up the TV.
// POST /api/react { g, pid, name, e } -> { ok }
//   District Secrets (g=ds): one counter per emoji ("ds:react" -> { "😂": 3, ... })
//   Who's That Tribute:      one counter per player and emoji, so the TV can show who sent it ("react" -> { "Kyle|🏹": 2, ... })
import { redis, reply, text, prefix } from "../lib/redis.js";

export const EMOJI = ["😂", "😱", "🤫", "🔥", "🎄", "🤯", "👀", "❤️"];                 // District Secrets
export const TRIBUTE_EMOJI = ["🏹", "🔥", "🌹", "🍞", "🐦", "🎁", "😱", "😂"];          // Who's That Tribute

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const p = prefix(req), ds = p === "ds:";
  const pid = text(req.body?.pid, 64), name = text(req.body?.name, 40), e = req.body?.e;
  if (!(ds ? EMOJI : TRIBUTE_EMOJI).includes(e)) return reply(res, 400, { error: "Unknown emoji" });
  if (!pid || !name || (await redis.hget(p + "players", name)) !== pid) return reply(res, 403, { error: "Not your name" });
  // The TV floats up however many are new since it last looked.
  await redis.hincrby(p + "react", ds ? e : `${name}|${e}`, 1);
  reply(res, 200, { ok: true });
}
