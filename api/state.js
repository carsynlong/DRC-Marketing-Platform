// Phones poll this about every 1.5 seconds.
// GET /api/state?pid=<phone id>&name=<name this phone thinks it has>
// -> { game, me, taken, away, myAnswer }   away: taken names whose phone has gone quiet (they can rejoin)
import { redis, hash, readGame, reply, text, prefix } from "../lib/redis.js";

export default async function handler(req, res) {
  const pid = text(req.query.pid, 64);
  const name = text(req.query.name, 40);
  const p = prefix(req);
  const game = await readGame(p);
  if (!game) return reply(res, 200, { game: null });

  let me = null, taken = null, away = null, myAnswer = null;
  // Cheap path: the phone already knows its name, just confirm it.
  if (pid && name && (await redis.hget(p + "players", name)) === pid) me = name;
  if (!me) {
    // Name picker (or a phone that forgot its name): send the taken names, never the phone ids.
    const all = await hash(p + "players");
    taken = Object.keys(all);
    me = taken.find(n => all[n] === pid) || null;
    if (!me && taken.length) {
      const seen = await redis.mget(...taken.map(n => `${p}seen:${n}`));
      away = taken.filter((n, i) => !seen[i]);
    }
  }
  // "I'm still here": a name whose phone stops checking in for 30 seconds can be picked up again (rejoin).
  if (me) await redis.set(`${p}seen:${me}`, "1", { ex: 30 });
  if (me && (game.phase === "question" || game.phase === "reveal" || game.phase === "interro")) {
    myAnswer = await redis.hget(`${p}answers:${game.qi}`, me);
  }
  reply(res, 200, { game, me, taken, away, myAnswer });
}
