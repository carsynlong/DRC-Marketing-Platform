// Phones poll this about every 1.5 seconds.
// GET /api/state?pid=<phone id>&name=<name this phone thinks it has>
// -> { game, me, taken, myAnswer }
import { redis, hash, readGame, reply, text } from "../lib/redis.js";

export default async function handler(req, res) {
  const pid = text(req.query.pid, 64);
  const name = text(req.query.name, 40);
  const game = await readGame();
  if (!game) return reply(res, 200, { game: null });

  let me = null, taken = null, myAnswer = null;
  // Cheap path: the phone already knows its name, just confirm it.
  if (pid && name && (await redis.hget("players", name)) === pid) me = name;
  if (!me) {
    // Name picker (or a phone that forgot its name): send the taken names, never the phone ids.
    const all = await hash("players");
    taken = Object.keys(all);
    me = taken.find(n => all[n] === pid) || null;
  }
  if (me && (game.phase === "question" || game.phase === "reveal")) {
    myAnswer = await redis.hget(`answers:${game.qi}`, me);
  }
  reply(res, 200, { game, me, taken, myAnswer });
}
