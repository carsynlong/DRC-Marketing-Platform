// A phone answers the current face. First answer counts (like Kahoot).
// POST /api/answer { pid, name, qi, answer } -> { answer }
import { redis, readGame, reply, text, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { error: "POST only" });
  const { pid, name, qi } = req.body || {};
  const answer = text(req.body?.answer, 80);   // room for two names in a Mutt Mashup
  if (!answer) return reply(res, 400, { error: "Empty answer" });

  const p = prefix(req);
  const game = await readGame(p);
  if (!game || game.phase !== "question" || game.locked || game.qi !== qi) {
    return reply(res, 409, { error: "locked" });
  }
  if (typeof name !== "string" || (await redis.hget(p + "players", name)) !== pid) {
    return reply(res, 403, { error: "Not your name" });
  }
  // 🎡 Who's That Tribute's Second Chance Round: the winner sits out
  if (Array.isArray(game.sitOut) && game.sitOut.includes(name)) return reply(res, 403, { error: "sitting out" });
  if (game.mode === "choice" && !game.choices?.includes(answer)) {
    return reply(res, 400, { error: "Not one of the choices" });
  }

  // Each phone writes only its own field, so twelve people answering at once can't collide.
  const key = `${p}answers:${qi}`;
  const fresh = await redis.hsetnx(key, name, answer);
  // when it arrived, by the server's clock: the showdown, jackpot and speed bonus use this (not when the TV happened to look)
  if (fresh && !p) await redis.hsetnx(`anstime:${qi}`, name, Date.now());   // Who's That Tribute only
  reply(res, 200, { answer: fresh ? answer : await redis.hget(key, name) });
}
