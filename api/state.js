// Phones poll this about every 1.5 seconds.
// GET /api/state?pid=<phone id>&name=<name this phone thinks it has>
// -> { game, me, taken, away, myAnswer }   away: taken names whose phone has gone quiet (they can rejoin)
import { redis, hash, readGame, reply, text, prefix, safe, touch } from "../lib/redis.js";

const owned = new Map();   // "<prefix><name>|<phone id>" -> when the database last confirmed this phone owns the name

export default safe(async function handler(req, res) {
  const pid = text(req.query.pid, 64);
  const name = text(req.query.name, 40);
  const p = prefix(req);
  const game = await readGame(p);
  if (!game) return reply(res, 200, { game: null });

  let me = null, taken = null, away = null, myAnswer = null;
  // Cheap path: the phone already knows its name, just confirm it.
  // Remembered for 10 seconds per warm server instance, like touch() (answering still checks the database itself).
  if (pid && name) {
    const k = p + name + "|" + pid, t = owned.get(k), now = Date.now();
    if (t && now - t < 10000) me = name;
    else if ((await redis.hget(p + "players", name)) === pid) { me = name; owned.set(k, now); }
    else owned.delete(k);
    if (owned.size > 400) for (const [x, v] of owned) if (now - v > 10000) owned.delete(x);
  }
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
  // Refreshed about every 7 seconds (not every poll) to save database calls; the key still lasts 30.
  if (me) await touch(`${p}seen:${me}`, 30, 7000, pid);
  if (me && (game.phase === "question" || game.phase === "reveal" || game.phase === "interro")) {
    myAnswer = await redis.hget(`${p}answers:${game.qi}`, me);
  }
  reply(res, 200, { game, me, taken, away, myAnswer });
});
